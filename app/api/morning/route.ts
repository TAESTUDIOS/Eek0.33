// app/api/morning/route.ts
// Aggregates urgent todos + today's appointments into a ritual-style message.

import { NextResponse } from "next/server";
import { readUrgent } from "@/lib/urgent";
import { listByDate } from "@/lib/appointments";
import type { Message, UrgentTodo, Appointment } from "@/lib/types";
import { uid } from "@/lib/id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // do not prerender
export const revalidate = 0; // no caching

function toYYYYMMDD(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayInTzISO(tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    if (y && m && d) return `${y}-${m}-${d}`; // en-CA yields YYYY-MM-DD
  } catch {}
  // Fallback: use UTC today
  return toYYYYMMDD(new Date());
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tz = searchParams.get("tz") || "UTC";
    const date = searchParams.get("date") || todayInTzISO(tz);

    // Fetch data
    const [urgent, appts] = await Promise.all<[
      Promise<UrgentTodo[]>,
      Promise<Appointment[]>
    ]>([readUrgent(), listByDate(date)] as any);

    // Summaries
    const openUrgent = urgent.filter((t) => !t.done);
    const high = openUrgent.filter((t) => t.priority === "high").length;
    const med = openUrgent.filter((t) => t.priority === "medium").length;
    const low = openUrgent.filter((t) => t.priority === "low").length;

    const apptCount = appts.length;

    const sections: string[] = [];
    sections.push(`Urgent todos: ${openUrgent.length} open (${high} high, ${med} medium, ${low} low).`);
    if (openUrgent.length > 0) {
      const top = [...openUrgent]
        .sort((a, b) => {
          const rank = { high: 0, medium: 1, low: 2 } as const;
          if (a.priority !== b.priority) return rank[a.priority] - rank[b.priority];
          const da = a.dueAt ?? Infinity;
          const db = b.dueAt ?? Infinity;
          return da - db;
        })
        .slice(0, 5)
        .map((t) => `• ${t.title}${t.dueAt ? ` (due ${new Date(t.dueAt).toLocaleDateString()})` : ""}`);
      sections.push("Top focus:");
      sections.push(...top);
    }

    sections.push(`Appointments today: ${apptCount}.`);
    if (apptCount > 0) {
      const lines = appts
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 8)
        .map((a) => `• ${a.start} (${a.durationMin}m) – ${a.title}`);
      sections.push(...lines);
    }

    const text = [
      `Morning Briefing for ${date} (${tz})`,
      "",
      ...sections,
    ].join("\n");

    const message: Message = {
      id: uid("msg"),
      role: "ritual",
      ritualId: "morning",
      text,
      buttons: ["Done", "Snooze", "Open Urgent", "Open Schedule"],
      timestamp: Date.now(),
      metadata: { date, tz, urgent, appointments: appts },
    };

    return NextResponse.json({ ok: true, message });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to build morning briefing" },
      { status: 500 }
    );
  }
}

// POST handler so this endpoint can act as a ritual webhook.
// Accepts: { ritualId, action?, tone?, ts? }
// If action is provided (e.g., "Done" | "Snooze" | "Open Urgent" | "Open Schedule"),
// return a short confirmation. If no action, behave like GET (compose briefing for today).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const action = body?.action as string | undefined;
    const ritualId = (body?.ritualId as string | undefined) ?? "morning";
    const tone = (body?.tone as string | undefined) ?? "Neutral";

    // Handle action buttons
    if (action) {
      let text: string;
      if (action.toLowerCase() === "done") {
        text = "Morning ritual acknowledged. Have a great day!";
      } else if (action.toLowerCase() === "snooze") {
        text = "Snoozed for 15 minutes. I’ll remind you shortly.";
      } else if (action.toLowerCase() === "open urgent") {
        text = "Opening Urgent inbox… (use the UI to navigate to /urgent).";
      } else if (action.toLowerCase() === "open schedule") {
        text = "Opening Schedule… (use the UI to navigate to /rituals).";
      } else {
        text = `Action '${action}' received.`;
      }

      const msg: Message = {
        id: uid("msg"),
        role: "assistant",
        ritualId,
        text,
        timestamp: Date.now(),
        buttons: [],
        metadata: { tone, action },
      } as any;
      return NextResponse.json({ ok: true, message: msg });
    }

    // Initial trigger → same as GET for today in provided or default timezone
    const tz = (body?.tz as string | undefined) || "UTC";
    const date = (body?.date as string | undefined) || todayInTzISO(tz);

    const [urgent, appts] = await Promise.all<[
      Promise<UrgentTodo[]>,
      Promise<Appointment[]>
    ]>([readUrgent(), listByDate(date)] as any);

    const openUrgent = urgent.filter((t) => !t.done);
    const high = openUrgent.filter((t) => t.priority === "high").length;
    const med = openUrgent.filter((t) => t.priority === "medium").length;
    const low = openUrgent.filter((t) => t.priority === "low").length;

    const apptCount = appts.length;

    const sections: string[] = [];
    sections.push(`Urgent todos: ${openUrgent.length} open (${high} high, ${med} medium, ${low} low).`);
    if (openUrgent.length > 0) {
      const top = [...openUrgent]
        .sort((a, b) => {
          const rank = { high: 0, medium: 1, low: 2 } as const;
          if (a.priority !== b.priority) return rank[a.priority] - rank[b.priority];
          const da = a.dueAt ?? Infinity;
          const db = b.dueAt ?? Infinity;
          return da - db;
        })
        .slice(0, 5)
        .map((t) => `• ${t.title}${t.dueAt ? ` (due ${new Date(t.dueAt).toLocaleDateString()})` : ""}`);
      sections.push("Top focus:");
      sections.push(...top);
    }

    sections.push(`Appointments today: ${apptCount}.`);
    if (apptCount > 0) {
      const lines = appts
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 8)
        .map((a) => `• ${a.start} (${a.durationMin}m) – ${a.title}`);
      sections.push(...lines);
    }

    const text = [
      `Morning Briefing for ${date} (${tz})`,
      "",
      ...sections,
    ].join("\n");

    const message: Message = {
      id: uid("msg"),
      role: "ritual",
      ritualId: ritualId || "morning",
      text,
      buttons: ["Done", "Snooze", "Open Urgent", "Open Schedule"],
      timestamp: Date.now(),
      metadata: { date, tz, tone, urgent, appointments: appts },
    } as any;

    return NextResponse.json({ ok: true, message });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to handle morning ritual" }, { status: 500 });
  }
}
