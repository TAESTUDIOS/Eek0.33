// app/api/scheduler/tick/route.ts
// Dispatcher that runs every minute to trigger due scheduled rituals.
// Secure this endpoint by sending header: X-Scheduler-Token: <token>
// Set the token in env as SCHEDULER_TOKEN.

import { NextResponse } from "next/server";
import { dueRitualIds, hhmmInTz } from "@/lib/rituals";

// Compare two dates at minute granularity
function sameMinute(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate() &&
    a.getUTCHours() === b.getUTCHours() &&
    a.getUTCMinutes() === b.getUTCMinutes()
  );
}

function nowInTz(tz: string) {
  // Return a Date that represents now; we still format HH:mm using locale with tz
  return new Date();
}

export async function GET(req: Request) {
  try {
    const tokenHeader = process.env.SCHEDULER_TOKEN || "";
    const sent = (req.headers.get("x-scheduler-token") || "").trim();
    if (!tokenHeader || !sent || sent !== tokenHeader) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const tz = process.env.SCHEDULER_TZ || "UTC";
    const now = nowInTz(tz);
    const due = dueRitualIds(now, tz);

    const triggered: string[] = [];
    for (const id of due) {
      try {
        if (id === "morning") {
          // 1) Ask the morning endpoint to compose the message
          const morningRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/morning`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ritualId: "morning", tz }),
          }).catch(async () => {
            return await fetch(new URL("/api/morning", process.env.APP_ORIGIN || "http://localhost:3000"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ritualId: "morning", tz }),
            });
          });
          if (!morningRes?.ok) continue;
          const data = await morningRes.json().catch(() => ({}));
          const msg = data?.message;
          if (msg) {
            // 2) Inject it into chat
            await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/inject-ritual`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ritualId: msg.ritualId ?? "morning",
                text: msg.text,
                buttons: msg.buttons ?? ["Done", "Snooze", "Open Urgent", "Open Schedule"],
                metadata: msg.metadata ?? {},
              }),
            }).catch(async () => {
              await fetch(new URL("/api/inject-ritual", process.env.APP_ORIGIN || "http://localhost:3000"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ritualId: msg.ritualId ?? "morning",
                  text: msg.text,
                  buttons: msg.buttons ?? ["Done", "Snooze", "Open Urgent", "Open Schedule"],
                  metadata: msg.metadata ?? {},
                }),
              });
            });
            triggered.push(id);
          }
        }
      } catch {
        // ignore and continue
      }
    }

    return NextResponse.json({ ok: true, due, triggered, time: hhmmInTz(now, tz) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "scheduler error" }, { status: 500 });
  }
}
