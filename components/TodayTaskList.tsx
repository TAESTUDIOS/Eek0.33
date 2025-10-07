// components/TodayTaskList.tsx
// Purpose: Read-only compact list of today's tasks (appointments for local day)

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";

export default function TodayTaskList() {
  const [items, setItems] = useState<Appointment[]>([]);

  function todayISO(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const load = () => {
    const date = todayISO();
    fetch(`/api/appointments?date=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data?.items) ? (data.items as Appointment[]) : []))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const sorted = useMemo(() => items.slice().sort((a, b) => a.start.localeCompare(b.start)), [items]);

  return (
    <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5">
      <div className="flex items-center justify-between px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--fg)]/80">
          <span className="inline-flex items-center gap-1 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-red-400">
              <path d="M6.75 3A1.75 1.75 0 0 0 5 4.75v14.5C5 20.216 5.784 21 6.75 21h10.5A1.75 1.75 0 0 0 19 19.25V4.75A1.75 1.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5a.25.25 0 0 1 .25.25v14.5a.25.25 0 0 1-.25.25H6.75a.25.25 0 0 1-.25-.25V4.75a.25.25 0 0 1 .25-.25ZM7.5 6.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM7.5 9.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM7.5 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"/>
            </svg>
            Today’s Tasks
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[var(--fg)]/70">{sorted.length} items</div>
          <button
            type="button"
            title="Refresh"
            aria-label="Refresh today’s tasks"
            onClick={load}
            className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-[var(--fg)]/80 hover:bg-[var(--surface-2)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M12 5a7 7 0 1 1-6.93 8.06.75.75 0 1 1 1.48-.26 5.5 5.5 0 1 0 .6-4.15H9a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 9V4.75a.75.75 0 0 1 1.5 0V7.1A7 7 0 0 1 12 5Z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 px-3 py-2 text-xs font-semibold text-[var(--fg)]/70">
        <span>NAME</span>
      </div>
      <ul className="divide-y divide-red-500/15">
        {sorted.length === 0 ? (
          <li className="px-3 py-3 text-sm text-[var(--fg)]/70">No items</li>
        ) : (
          sorted.map((a) => (
            <li key={a.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-[var(--fg)]">{a.title}</span>
                <span className="whitespace-nowrap text-xs text-[var(--fg)]/70">{a.start} · {a.durationMin}m</span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
