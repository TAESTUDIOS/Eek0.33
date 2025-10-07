// app/api/missions/route.ts
// Save and list missions. When a new mission is saved, respond with an
// "Enjoy your day" card message so the WakeUp flow completes.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { uid } from "@/lib/id";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS missions (
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
    await sql`DELETE FROM missions WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, text, created_at FROM missions ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({ ok: true, items: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const id: string | undefined = body?.id;
    const text: string | undefined = body?.text;
    const createdAt: number | undefined = typeof body?.createdAt === 'number' ? body.createdAt : undefined;
    if (!id || !text) return NextResponse.json({ ok: false, error: "id and text required" }, { status: 400 });

    await ensureTable();
    const sql = getDb();
    const tsSec = Math.floor(((createdAt ?? Date.now()) as number) / 1000);
    await sql`INSERT INTO missions (id, text, created_at)
              VALUES (${id}, ${text}, to_timestamp(${tsSec}))
              ON CONFLICT (id) DO NOTHING`;

    const msg = {
      id: uid("m"),
      role: "assistant" as const,
      text: "",
      metadata: { demo: "enjoyDayCard" },
      timestamp: Date.now(),
    };
    return NextResponse.json({ ok: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
