// components/DayGrid.tsx
// 24-hour day grid that positions appointments by start time and duration

"use client";

import React from "react";
import type { Appointment } from "@/lib/types";

export type DayGridProps = {
  dateISO: string; // YYYY-MM-DD
  appointments: Appointment[];
  onCreate?: () => void; // optional handler to open create modal
};

// Convert HH:mm to minutes since midnight
function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export default function DayGrid({ dateISO, appointments, onCreate }: DayGridProps) {
  const dayMinutes = 24 * 60;
  return (
    <div className="w-full">
      <div className="text-sm text-gray-500 mb-2">{dateISO}</div>
      <div className="relative border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
        {/* Hour rows */}
        <div className="grid grid-cols-[56px_1fr]">
          <div className="flex flex-col">
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="h-16 border-b border-gray-100 dark:border-gray-800 text-xs flex items-start justify-end pr-2 pt-1">
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          <div className="relative">
            {/* background hour lines */}
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="h-16 border-b border-gray-100 dark:border-gray-800" />
            ))}

            {/* Appointment blocks */
            /* Greytone styling: neutral surfaces and borders */}
            <div className="absolute inset-0">
              {appointments
                .filter((a) => a.date === dateISO)
                .map((a) => {
                  const topMin = hmToMinutes(a.start);
                  const heightMin = Math.max(15, a.durationMin); // minimum 15min visible
                  const topPct = (topMin / dayMinutes) * 100;
                  const heightPct = (heightMin / dayMinutes) * 100;
                  return (
                    <div
                      key={a.id}
                      className="absolute left-2 right-2 rounded-md bg-[var(--surface-2)]/40 border border-[var(--border)] px-2 py-1 text-sm"
                      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                      title={`${a.title} (${a.start} · ${a.durationMin}m)`}
                    >
                      <div className="font-medium text-[var(--fg)] truncate">{a.title}</div>
                      <div className="text-xs text-[var(--fg)]/70">{a.start} · {a.durationMin}m</div>
                      {a.notes ? (
                        <div className="mt-1 text-xs text-[var(--fg)]/60 line-clamp-2">{a.notes}</div>
                      ) : null}
                    </div>
                  );
                })}
            </div>

            {/* Create button moved to page header */}
          </div>
        </div>
      </div>
    </div>
  );
}

