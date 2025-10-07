// app/api/winddown/answer/route.ts
// Stores winddown answers tied to a winddown session.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureTables() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS winddown_sessions (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS winddown_answers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES winddown_sessions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await ensureTables();
    const sql = getDb();
    await sql`DELETE FROM winddown_answers WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    const sessionId: string | undefined = body?.sessionId;
    const question: string | undefined = body?.question;
    const answer: string | undefined = body?.text ?? body?.answer;
    const createdAt: number | undefined = typeof body?.createdAt === 'number' ? body.createdAt : undefined;

    if (!id || !sessionId || !question || !answer) {
      return NextResponse.json({ ok: false, error: "id, sessionId, question, text required" }, { status: 400 });
    }

    await ensureTables();
    const sql = getDb();
    const tsSec = Math.floor(((createdAt ?? Date.now()) as number) / 1000);
    await sql`INSERT INTO winddown_answers (id, session_id, question, answer, created_at)
              VALUES (${id}, ${sessionId}, ${question}, ${answer}, to_timestamp(${tsSec}))
              ON CONFLICT (id) DO NOTHING`;

    const isFinal = question === 'one_thing_learned';
    if (isFinal) {
      // Ensure messages table exists and then deduplicate goodnight card
      await sql`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        ritual_id TEXT,
        buttons JSONB,
        metadata JSONB,
        timestamp_ms BIGINT NOT NULL
      )`;

      // If a goodnight card already exists, return the latest existing one
      const existing: any[] = await sql`
        SELECT id, role, text, metadata, timestamp_ms AS timestamp
        FROM messages
        WHERE (metadata ->> 'demo') = 'goodnightCard'
        ORDER BY timestamp_ms DESC
        LIMIT 1
      `;
      if (existing && existing.length > 0) {
        const m = existing[0];
        return NextResponse.json({ ok: true, goodnight: true, message: m });
      }

      // Otherwise insert one new goodnight card
      const m = {
        id: uid("m"),
        role: "assistant" as const,
        text: "",
        metadata: { demo: "goodnightCard" },
        timestamp: Date.now(),
      };
      await sql`INSERT INTO messages (id, role, text, metadata, timestamp_ms)
                VALUES (${m.id}, ${m.role}, ${m.text}, ${JSON.stringify(m.metadata)}::jsonb, ${m.timestamp})`;
      await sql`DELETE FROM messages WHERE id IN (
        SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
      )`;
      return NextResponse.json({ ok: true, goodnight: true, message: m });
    }
    return NextResponse.json({ ok: true, goodnight: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
