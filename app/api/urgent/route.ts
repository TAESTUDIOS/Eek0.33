// app/api/urgent/route.ts
// CRUD for urgent todos using Neon Postgres on Vercel, with JSON fallback for local dev.

import { NextResponse } from "next/server";
import type { UrgentTodo } from "@/lib/types";
import { uid } from "@/lib/id";
import { getDb } from "@/lib/db";
import { readUrgent as readUrgentJson, upsertUrgent as upsertUrgentJson, removeUrgent as removeUrgentJson } from "@/lib/urgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // do not prerender
export const revalidate = 0; // no caching

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS urgent_todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'high',
    done BOOLEAN NOT NULL DEFAULT false,
    due_at BIGINT NULL,
    notes TEXT NULL,
    tags JSONB NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`;
}

export async function GET() {
  try {
    if (!neonAvailable()) {
      const items = await readUrgentJson();
      return NextResponse.json({ ok: true, items });
    }
    await ensureTable();
    const sql = getDb();
    const rows: any[] = await sql`SELECT id, title, priority, done, due_at, notes, tags, created_at, updated_at FROM urgent_todos ORDER BY done ASC, priority ASC, (due_at IS NULL) ASC, due_at ASC NULLS LAST, updated_at DESC LIMIT 500`;
    const items: UrgentTodo[] = rows.map((r: any) => ({ id: r.id, title: r.title, priority: r.priority, done: r.done, dueAt: r.due_at ?? undefined, notes: r.notes ?? undefined, tags: Array.isArray(r.tags) ? r.tags : undefined, createdAt: Number(r.created_at), updatedAt: Number(r.updated_at) }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to list" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<UrgentTodo>;
    if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

    const now = Date.now();
    const item: UrgentTodo = {
      id: body.id || uid("todo"),
      title: body.title || "Untitled",
      priority: (body.priority as any) || "high",
      done: !!body.done,
      dueAt: typeof body.dueAt === 'number' ? body.dueAt : (body.dueAt ? Number(body.dueAt) : undefined),
      notes: body.notes,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    if (!neonAvailable()) {
      const saved = await upsertUrgentJson(item);
      return NextResponse.json({ ok: true, item: saved });
    }
    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO urgent_todos (id, title, priority, done, due_at, notes, tags, created_at, updated_at)
              VALUES (${item.id}, ${item.title}, ${item.priority}, ${item.done}, ${item.dueAt ?? null}, ${item.notes ?? null}, ${item.tags ? JSON.stringify(item.tags) : null}::jsonb, ${item.createdAt}, ${item.updatedAt})
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                priority = EXCLUDED.priority,
                done = EXCLUDED.done,
                due_at = EXCLUDED.due_at,
                notes = EXCLUDED.notes,
                tags = EXCLUDED.tags,
                updated_at = EXCLUDED.updated_at`;
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to create/update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    if (!neonAvailable()) {
      await removeUrgentJson(id);
      return NextResponse.json({ ok: true });
    }
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM urgent_todos WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to delete" }, { status: 500 });
  }
}
