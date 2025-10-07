// app/api/reminders/route.ts
// Relay reminder requests to a single n8n webhook defined by NOTIFY_WEBHOOK_URL.
// Dev behavior: if NOTIFY_WEBHOOK_URL is not set, respond with ok + mocked payload.

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getById as getByIdJson } from "@/lib/appointments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // do not prerender
export const revalidate = 0; // no caching

function neonAvailable() {
  return Boolean(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);
}

async function resolveAppointment(input: any) {
  const { appointmentId, title, date, start } = input || {};
  // If full appointment data provided, use it directly
  if (title && date && start) {
    return { title, date, start } as { title: string; date: string; start: string };
  }
  if (!appointmentId) return null;
  
  // Try resolve by id from data store
  if (!neonAvailable()) {
    try {
      const a = await getByIdJson(appointmentId);
      if (!a) return null;
      return { title: a.title, date: a.date, start: a.start };
    } catch (err) {
      console.error("[reminders] Failed to resolve from JSON:", err);
      return null;
    }
  }
  
  // Resolve from database
  try {
    const sql = getDb();
    const rows: any[] = await sql`
      SELECT title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start, 'HH24:MI') AS start
      FROM appointments
      WHERE id = ${appointmentId}
      LIMIT 1
    `;
    const r = rows?.[0];
    if (!r) return null;
    return { title: r.title, date: r.date, start: r.start } as { title: string; date: string; start: string };
  } catch (err) {
    console.error("[reminders] Database query failed:", err);
    throw err; // Re-throw to be caught by main handler
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { offsetMinutes } = body || {};
    
    console.log("[reminders] Received request:", { offsetMinutes, hasTitle: !!body.title, hasDate: !!body.date, hasStart: !!body.start });
    
    if (typeof offsetMinutes !== "number" || offsetMinutes < 0) {
      return NextResponse.json({ ok: false, error: "Invalid offsetMinutes" }, { status: 400 });
    }

    const appt = await resolveAppointment(body);
    if (!appt) {
      console.error("[reminders] Failed to resolve appointment from body:", body);
      return NextResponse.json({ ok: false, error: "Missing appointment. Provide { title, date, start } or { appointmentId }." }, { status: 400 });
    }

    // Create a human label for the offset
    let startInLabel: string;
    if (offsetMinutes === 0) startInLabel = "now";
    else if (offsetMinutes % 60 === 0) startInLabel = `${offsetMinutes / 60}h`;
    else startInLabel = `${offsetMinutes}m`;

    const payload = {
      task: appt.title,
      date: appt.date,
      start: appt.start,
      offsetMinutes,
      startInLabel,
      source: "schedule-page",
      nowEpoch: Date.now(),
    };

    const url = process.env.NOTIFY_WEBHOOK_URL;
    if (!url) {
      // Dev mock - no webhook configured
      console.log("[DEV MOCK] Reminder payload ->", payload);
      return NextResponse.json({ ok: true, mocked: true, payload });
    }

    console.log("[reminders] Sending to webhook:", url);

    // Build headers with optional Authorization
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    // Try NOTIFY_WEBHOOK credentials first, fallback to FALLBACK credentials
    const basicUser = process.env.NOTIFY_WEBHOOK_BASIC_USER || process.env.FALLBACK_BASIC_USER;
    const basicPass = process.env.NOTIFY_WEBHOOK_BASIC_PASS || process.env.FALLBACK_BASIC_PASS;
    const bearer = process.env.NOTIFY_WEBHOOK_BEARER;
    
    if (basicUser && basicPass) {
      const token = Buffer.from(`${basicUser}:${basicPass}`).toString("base64");
      headers["Authorization"] = `Basic ${token}`;
      console.log("[reminders] Using Basic Auth with user:", basicUser);
    } else if (bearer) {
      headers["Authorization"] = `Bearer ${bearer}`;
      console.log("[reminders] Using Bearer token");
    } else {
      console.log("[reminders] No authentication configured");
    }
    
    // Allow custom extra headers via JSON string, e.g. {"X-My-Key":"abc"}
    const extraHeadersRaw = process.env.NOTIFY_WEBHOOK_HEADERS;
    if (extraHeadersRaw) {
      try {
        const extra = JSON.parse(extraHeadersRaw) as Record<string, string>;
        for (const [k, v] of Object.entries(extra)) headers[k] = String(v);
      } catch {}
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log("[reminders] Webhook response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[reminders] Webhook error:", res.status, text);
      return NextResponse.json({ ok: false, error: `Webhook error: ${res.status} ${text}` }, { status: 502 });
    }

    const data = await res.json().catch(() => ({}));
    console.log("[reminders] Success, webhook returned:", data);
    return NextResponse.json({ ok: true, forwarded: true, data });
  } catch (e: any) {
    console.error("[reminders] Unexpected error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to create reminder" }, { status: 500 });
  }
}
