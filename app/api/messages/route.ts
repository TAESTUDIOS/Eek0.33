// app/api/messages/route.ts
// GET returns all messages chronologically (globally persistent); POST appends with optional sticky flag; supports saved status.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    ritual_id TEXT,
    buttons JSONB,
    metadata JSONB,
    emotion_id TEXT,
    emotion_tone TEXT,
    timestamp_ms BIGINT NOT NULL,
    sticky BOOLEAN DEFAULT FALSE,
    saved BOOLEAN DEFAULT FALSE
  )`;
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS emotion_id TEXT`;
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS emotion_tone TEXT`;
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS sticky BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS saved BOOLEAN DEFAULT FALSE`;
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await ensureTable();
    const sql = getDb();

    // Update only provided fields
    if (Object.prototype.hasOwnProperty.call(body, 'metadata')) {
      const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null;
      await sql`UPDATE messages SET metadata = ${metadataJson}::jsonb WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'emotionId')) {
      await sql`UPDATE messages SET emotion_id = ${body.emotionId ?? null} WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'emotionTone')) {
      await sql`UPDATE messages SET emotion_tone = ${body.emotionTone ?? null} WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'text')) {
      await sql`UPDATE messages SET text = ${body.text ?? ''} WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'role')) {
      await sql`UPDATE messages SET role = ${body.role ?? 'assistant'} WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'ritualId')) {
      await sql`UPDATE messages SET ritual_id = ${body.ritualId ?? null} WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'buttons')) {
      const buttonsJson = Array.isArray(body.buttons) ? JSON.stringify(body.buttons) : null;
      await sql`UPDATE messages SET buttons = ${buttonsJson}::jsonb WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'timestamp')) {
      const ts = Number(body.timestamp) || Date.now();
      await sql`UPDATE messages SET timestamp_ms = ${ts} WHERE id = ${id}`;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'saved')) {
      await sql`UPDATE messages SET saved = ${body.saved ? true : false} WHERE id = ${id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'db error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM messages`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    // Return all messages chronologically
    const rows = await sql`SELECT id, role, text, ritual_id, buttons, metadata, emotion_id, emotion_tone, timestamp_ms, sticky, saved FROM messages ORDER BY timestamp_ms ASC`;
    const messages = rows.map((r: any) => ({
      id: r.id,
      role: r.role,
      text: r.text,
      ritualId: r.ritual_id || undefined,
      buttons: r.buttons || [],
      metadata: r.metadata || {},
      emotionId: r.emotion_id || undefined,
      emotionTone: r.emotion_tone || undefined,
      timestamp: Number(r.timestamp_ms),
      sticky: !!r.sticky,
      saved: !!r.saved,
    }));
    return NextResponse.json({ messages });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sql = getDb();
    await ensureTable();

    const incomingRole = body?.role as string | undefined; // e.g., 'user' | 'assistant' | 'ritual'
    const incomingText: string | undefined = body?.text;
    const incomingTs: number = Number(body?.timestamp) || Date.now();
    const incomingRitualId: string | undefined = body?.ritualId;
    const incomingButtons: unknown = Array.isArray(body?.buttons) ? body.buttons : undefined;
    const incomingMetadata: unknown = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined;
    const incomingEmotionId: string | undefined = typeof body?.emotionId === 'string' ? body.emotionId : undefined;
    const incomingEmotionTone: string | undefined = typeof body?.emotionTone === 'string' ? body.emotionTone : undefined;
    const buttonsJson: string | null = incomingButtons ? JSON.stringify(incomingButtons) : null;
    const metadataJson: string | null = incomingMetadata ? JSON.stringify(incomingMetadata as any) : null;
    const echo: boolean = body?.echo !== false; // default true
    // Determine sticky: pin question cards so they persist beyond rotation
    const metaDemo = (incomingMetadata as any)?.demo;
    const hasQuestionFlag = typeof (incomingMetadata as any)?.question === 'string' || typeof (incomingMetadata as any)?.prompt === 'string';
    const isSticky = Boolean(metaDemo === 'questionSave' || metaDemo === 'questionInput' || hasQuestionFlag || body?.sticky === true);

    // Persist message if role is present, even if text is empty (cards often carry content in metadata)
    if (incomingRole) {
      const id = body?.id || uid("m");
      const textToSave = typeof incomingText === 'string' ? incomingText : '';
      const savedFlag = body?.saved === true;
      await sql`INSERT INTO messages (id, role, text, ritual_id, buttons, metadata, emotion_id, emotion_tone, timestamp_ms, sticky, saved)
                VALUES (${id}, ${incomingRole}, ${textToSave}, ${incomingRitualId || null}, ${buttonsJson}::jsonb, ${metadataJson}::jsonb, ${incomingEmotionId || null}, ${incomingEmotionTone || null}, ${incomingTs}, ${isSticky}, ${savedFlag})
                ON CONFLICT (id) DO NOTHING`;
    }

    if (echo) {
      // Create mocked assistant echo reply
      const text = incomingText ?? "(empty)";
      const reply = { id: uid("m"), role: "assistant" as const, text: `Echo: ${text}`, timestamp: Date.now() };
      await sql`INSERT INTO messages (id, role, text, timestamp_ms, sticky, saved) VALUES (${reply.id}, ${reply.role}, ${reply.text}, ${reply.timestamp}, FALSE, FALSE)`;
      return NextResponse.json({ ok: true, text: reply.text });
    }

    // No rotation: global persistence

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
