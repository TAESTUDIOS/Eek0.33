// app/api/winddown/route.ts
// Lists winddown sessions and their answers.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
    await sql`DELETE FROM winddown_sessions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTables();
    const sql = getDb();
    const sessions = await sql`SELECT id, started_at FROM winddown_sessions ORDER BY started_at DESC LIMIT 60`;
    const answers = await sql`SELECT id, session_id, question, answer, created_at FROM winddown_answers ORDER BY created_at DESC LIMIT 500`;
    return NextResponse.json({ ok: true, sessions, answers });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
