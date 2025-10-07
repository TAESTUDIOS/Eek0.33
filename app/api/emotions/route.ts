// app/api/emotions/route.ts
// CRUD-lite API for emotion logs stored in Neon Postgres

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS emotion_logs (
    id TEXT PRIMARY KEY,
    emotion_id TEXT NOT NULL,
    emotion_tone TEXT,
    recorded_at BIGINT NOT NULL
  )`;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, emotion_id, emotion_tone, recorded_at FROM emotion_logs ORDER BY recorded_at DESC LIMIT 200`;
    const logs = rows.map((row: any) => ({
      id: row.id as string,
      emotionId: row.emotion_id as string,
      emotionTone: row.emotion_tone as string | null,
      recordedAt: Number(row.recorded_at) || Date.now(),
    }));
    return NextResponse.json({ ok: true, logs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const emotionId = typeof body?.emotionId === "string" && body.emotionId.trim() ? body.emotionId.trim() : null;
    if (!emotionId) {
      return NextResponse.json({ ok: false, error: "emotionId required" }, { status: 400 });
    }
    const emotionTone = typeof body?.emotionTone === "string" ? body.emotionTone : null;
    const recordedAt = Number(body?.recordedAt) || Date.now();
    const id = typeof body?.id === "string" && body.id.trim() ? body.id.trim() : uid("emo");

    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO emotion_logs (id, emotion_id, emotion_tone, recorded_at)
              VALUES (${id}, ${emotionId}, ${emotionTone}, ${recordedAt})
              ON CONFLICT (id) DO UPDATE SET emotion_id = EXCLUDED.emotion_id, emotion_tone = EXCLUDED.emotion_tone, recorded_at = EXCLUDED.recorded_at`;

    return NextResponse.json({
      ok: true,
      log: { id, emotionId, emotionTone, recordedAt },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
