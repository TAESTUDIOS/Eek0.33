// app/api/rituals/route.ts
// CRUD for ritual configs using Neon Postgres.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS rituals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    webhook TEXT NOT NULL DEFAULT '',
    trigger_cfg JSONB NOT NULL,
    buttons JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_run_at TIMESTAMPTZ NULL
  )`;
  // One-time migration: if an older schema used reserved column name "trigger", rename it
  try {
    await sql`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rituals' AND column_name = 'trigger'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rituals' AND column_name = 'trigger_cfg'
      ) THEN
        EXECUTE 'ALTER TABLE rituals RENAME COLUMN "trigger" TO trigger_cfg';
      END IF;
    END$$;`;
  } catch {}

  // Add last_run_at if missing
  try {
    await sql`DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rituals' AND column_name = 'last_run_at'
      ) THEN
        EXECUTE 'ALTER TABLE rituals ADD COLUMN last_run_at TIMESTAMPTZ NULL';
      END IF;
    END$$;`;
  } catch {}
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT id, name, webhook, trigger_cfg, buttons, active FROM rituals ORDER BY updated_at DESC`;
    const rituals = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      webhook: r.webhook,
      trigger: r.trigger_cfg,
      buttons: r.buttons,
      active: r.active,
    }));
    return NextResponse.json({ rituals });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.id || !body?.name || !body?.trigger) {
      return NextResponse.json({ ok: false, error: "id, name, trigger required" }, { status: 400 });
    }
    await ensureTable();
    const sql = getDb();
    await sql`INSERT INTO rituals (id, name, webhook, trigger_cfg, buttons, active)
              VALUES (${body.id}, ${body.name}, ${body.webhook || ''}, ${JSON.stringify(body.trigger)}::jsonb, ${JSON.stringify(body.buttons || [])}::jsonb, ${body.active ?? true})
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                webhook = EXCLUDED.webhook,
                trigger_cfg = EXCLUDED.trigger_cfg,
                buttons = EXCLUDED.buttons,
                active = EXCLUDED.active,
                updated_at = NOW()`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    await ensureTable();
    const sql = getDb();
    await sql`DELETE FROM rituals WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "db error" }, { status: 500 });
  }
}
