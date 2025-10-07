// app/api/rituals/action/route.ts
// Simulates an n8n action reply. Local dev only.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ritualId = String(body.ritualId ?? "");
  const action = String(body.action ?? "");

  const text = `Ritual ${ritualId || "unknown"}: received action "${action}".`;
  const buttons = action === "Snooze" ? ["Snoozed 5m", "Cancel"] : [];

  return NextResponse.json({ ok: true, text, buttons });
}
