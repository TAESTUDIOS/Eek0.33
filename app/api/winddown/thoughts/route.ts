// app/api/winddown/thoughts/route.ts
// Store/list/delete "Winddown thoughts" (blockers before sleep)

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS winddown_thoughts (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, text, created_at FROM winddown_thoughts ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id: string | undefined = body?.id;
    const text: string | undefined = body?.text;
    const createdAt: number | undefined = typeof body?.createdAt === 'number' ? body.createdAt : undefined;
    if (!id || !text) return NextResponse.json({ ok: false, error: "id and text required" }, { status: 400 });
    await ensureTable();
    const sql = getDb();
    const tsSec = Math.floor(((createdAt ?? Date.now()) as number) / 1000);
    await sql`INSERT INTO winddown_thoughts (id, text, created_at)
              VALUES (${id}, ${text}, to_timestamp(${tsSec}))
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
    await sql`DELETE FROM winddown_thoughts WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
