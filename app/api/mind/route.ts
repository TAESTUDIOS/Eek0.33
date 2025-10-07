// app/api/mind/route.ts
// CRUD for "mind snapshots" (answers to "What is on your mind right now?") using Neon Postgres.
// Requires DATABASE_URL (or NEON_DATABASE_URL) in env. Do not hardcode secrets.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS mind_snapshots (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, text, created_at FROM mind_snapshots ORDER BY created_at DESC LIMIT 500`;
    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.id || !body?.text) {
      return NextResponse.json({ ok: false, error: "id and text required" }, { status: 400 });
    }
    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO mind_snapshots (id, text, created_at)
              VALUES (${body.id}, ${body.text}, to_timestamp(${Math.floor((body.createdAt ?? Date.now())/1000)}))
              ON CONFLICT (id) DO NOTHING`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM mind_snapshots WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
