// app/api/sleep/hours/route.ts
// Save and list daily sleep hours. When a new value is saved, respond with a follow-up
// mission question message so the WakeUp flow can chain seamlessly in chat.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS sleep_hours (
    id TEXT PRIMARY KEY,
    hours REAL NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM sleep_hours WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, hours, created_at FROM sleep_hours ORDER BY created_at DESC LIMIT 60`;
    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    // questionSave sends { id, text, createdAt }
    const id: string | undefined = body?.id;
    const rawText: string | undefined = typeof body?.text === 'string' ? body.text : undefined;
    const hoursField: number | undefined = typeof body?.hours === 'number' ? body.hours : undefined;
    const createdAt: number | undefined = typeof body?.createdAt === 'number' ? body.createdAt : undefined;
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    // Parse hours from either explicit hours or from text (accepts "7.5", "7", etc.)
    let hours: number | null = null;
    if (typeof hoursField === 'number' && Number.isFinite(hoursField)) hours = hoursField;
    if (hours === null && rawText) {
      const m = String(rawText).match(/\d+(?:[\.,]\d+)?/);
      if (m) {
        hours = parseFloat(m[0].replace(',', '.'));
      }
    }
    if (hours === null || !Number.isFinite(hours)) {
      return NextResponse.json({ ok: false, error: "invalid or missing hours" }, { status: 400 });
    }

    await ensureTable();
    const sql = getDb();
    const tsSec = Math.floor(((createdAt ?? Date.now()) as number) / 1000);
    await sql`INSERT INTO sleep_hours (id, hours, created_at)
              VALUES (${id}, ${hours}, to_timestamp(${tsSec}))
              ON CONFLICT (id) DO UPDATE SET hours = EXCLUDED.hours`;

    // Respond with next question: main mission today
    const msg = {
      id: uid("m"),
      role: "assistant" as const,
      text: "",
      metadata: {
        demo: "questionSave",
        prompt: "What is your main mission today?",
        saveTo: "/api/missions",
      },
      timestamp: Date.now(),
    };
    return NextResponse.json({ ok: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
