// app/api/save/route.ts
// Persisted Saved Messages via Neon Postgres
// NOTE: Do NOT hardcode credentials. Set DATABASE_URL in .env.local

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Ensure table exists (id TEXT primary key, text TEXT, created_at TIMESTAMPTZ)
async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS saved_messages (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
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
    await sql`DELETE FROM saved_messages WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, text, created_at FROM saved_messages ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.id || !body?.text)
      return NextResponse.json({ ok: false, error: "id and text required" }, { status: 400 });

    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO saved_messages (id, text, created_at)
              VALUES (${body.id}, ${body.text}, to_timestamp(${Math.floor((body.createdAt ?? Date.now())/1000)}) )
              ON CONFLICT (id) DO NOTHING`;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
