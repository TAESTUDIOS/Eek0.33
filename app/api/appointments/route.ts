// app/api/appointments/route.ts
// CRUD for appointments with Neon Postgres on Vercel, JSON file fallback for local dev.

import { NextResponse } from "next/server";
import type { Appointment } from "@/lib/types";
import { uid } from "@/lib/id";
import { getDb } from "@/lib/db";
import { listByDate as listByDateJson, upsert as upsertJson, remove as removeJson } from "@/lib/appointments";

export const runtime = "nodejs";

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start TIME NOT NULL,
    duration_min INTEGER NOT NULL,
    notes TEXT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  // Ensure reminder columns exist
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_1h BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_30m BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_10m BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS remind_at_start BOOLEAN NOT NULL DEFAULT FALSE`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || undefined;
    if (!neonAvailable()) {
      const items = await listByDateJson(date || undefined);
      return NextResponse.json({ ok: true, items });
    }
    await ensureTable();
    const sql = getDb();
    let rows: any[];
    if (date) {
      rows = await sql`SELECT id, title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start, 'HH24:MI') AS start, duration_min, notes, remind_1h, remind_30m, remind_10m, remind_at_start FROM appointments WHERE date = ${date} ORDER BY start ASC`;
    } else {
      rows = await sql`SELECT id, title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start, 'HH24:MI') AS start, duration_min, notes, remind_1h, remind_30m, remind_10m, remind_at_start FROM appointments ORDER BY date DESC, start ASC LIMIT 500`;
    }
    const items: Appointment[] = rows.map((r: any) => ({ id: r.id, title: r.title, date: r.date, start: r.start, durationMin: Number(r.duration_min), notes: r.notes ?? undefined, remind1h: Boolean(r.remind_1h), remind30m: Boolean(r.remind_30m), remind10m: Boolean(r.remind_10m), remindAtStart: Boolean(r.remind_at_start) }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to list" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Appointment>;
    if (!body) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    const { title, date, start, durationMin, notes, remind1h, remind30m, remind10m, remindAtStart } = body;
    if (!title || !date || !start || !durationMin) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }
    const item: Appointment = { id: body.id || uid("appt"), title, date, start, durationMin: Number(durationMin), notes, remind1h: Boolean(remind1h), remind30m: Boolean(remind30m), remind10m: Boolean(remind10m), remindAtStart: Boolean(remindAtStart) };
    if (!neonAvailable()) {
      const saved = await upsertJson(item);
      return NextResponse.json({ ok: true, item: saved });
    }
    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO appointments (id, title, date, start, duration_min, notes, remind_1h, remind_30m, remind_10m, remind_at_start)
              VALUES (${item.id}, ${item.title}, ${item.date}, ${item.start}, ${item.durationMin}, ${item.notes || null}, ${item.remind1h || false}, ${item.remind30m || false}, ${item.remind10m || false}, ${item.remindAtStart || false})
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                date = EXCLUDED.date,
                start = EXCLUDED.start,
                duration_min = EXCLUDED.duration_min,
                notes = EXCLUDED.notes,
                remind_1h = EXCLUDED.remind_1h,
                remind_30m = EXCLUDED.remind_30m,
                remind_10m = EXCLUDED.remind_10m,
                remind_at_start = EXCLUDED.remind_at_start,
                updated_at = NOW()`;
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<Appointment>;
    if (!body?.id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const item: Appointment = {
      id: body.id,
      title: body.title || "Untitled",
      date: body.date || "",
      start: body.start || "00:00",
      durationMin: Number(body.durationMin || 30),
      notes: body.notes,
      remind1h: Boolean((body as any).remind1h),
      remind30m: Boolean((body as any).remind30m),
      remind10m: Boolean((body as any).remind10m),
      remindAtStart: Boolean((body as any).remindAtStart),
    };
    if (!neonAvailable()) {
      const saved = await upsertJson(item);
      return NextResponse.json({ ok: true, item: saved });
    }
    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO appointments (id, title, date, start, duration_min, notes, remind_1h, remind_30m, remind_10m, remind_at_start)
              VALUES (${item.id}, ${item.title}, ${item.date}, ${item.start}, ${item.durationMin}, ${item.notes || null}, ${item.remind1h || false}, ${item.remind30m || false}, ${item.remind10m || false}, ${item.remindAtStart || false})
              ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                date = EXCLUDED.date,
                start = EXCLUDED.start,
                duration_min = EXCLUDED.duration_min,
                notes = EXCLUDED.notes,
                remind_1h = EXCLUDED.remind_1h,
                remind_30m = EXCLUDED.remind_30m,
                remind_10m = EXCLUDED.remind_10m,
                remind_at_start = EXCLUDED.remind_at_start,
                updated_at = NOW()`;
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    if (!neonAvailable()) {
      await removeJson(id);
      return NextResponse.json({ ok: true });
    }
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM appointments WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Failed to delete" }, { status: 500 });
  }
}
