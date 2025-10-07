// app/api/inject-ritual/route.ts
// POST to inject a ritual message into chat (used by n8n later). Local mock only.

import { NextResponse } from "next/server";
import { uid } from "@/lib/id";
import { getDb } from "@/lib/db";

async function ensureTable() {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    ritual_id TEXT,
    buttons JSONB,
    metadata JSONB,
    timestamp_ms BIGINT NOT NULL
  )`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ritualId = String(body.ritualId ?? "");
  const text = String(body.text ?? "(ritual)");
  const buttons = Array.isArray(body.buttons) ? body.buttons : [];

  const msg = {
    id: uid("m"),
    role: "ritual" as const,
    text,
    ritualId: ritualId || undefined,
    buttons,
    timestamp: Date.now(),
    metadata: body.metadata ?? {},
  };
  await ensureTable();
  const sql = getDb();
  await sql`INSERT INTO messages (id, role, text, ritual_id, buttons, metadata, timestamp_ms)
            VALUES (${msg.id}, ${msg.role}, ${msg.text}, ${msg.ritualId || null}, ${JSON.stringify(msg.buttons)}::jsonb, ${JSON.stringify(msg.metadata)}::jsonb, ${msg.timestamp})`;
  await sql`DELETE FROM messages WHERE id IN (
    SELECT id FROM messages ORDER BY timestamp_ms DESC OFFSET 100
  )`;
  return NextResponse.json({ ok: true, message: msg });
}
