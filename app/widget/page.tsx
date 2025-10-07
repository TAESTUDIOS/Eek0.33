// app/widget/page.tsx
// Purpose: Widget-optimized page for upcoming appointments. No header, minimal UI for iPhone widgets.
// This page is accessible without authentication.

"use client";

import { useEffect, useState } from "react";
import type { Appointment } from "@/lib/types";

export default function WidgetPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const res = await fetch("/api/appointments", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.items)) {
        // Filter to only show future appointments (today and onwards)
        const today = new Date().toISOString().split('T')[0];
        const upcoming = data.items.filter((apt: Appointment) => apt.date >= today);
        setAppointments(upcoming);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--surface-0)]">
      <div className="flex-1 overflow-y-auto">
        <UpcomingAppointmentsView appointments={appointments} />
      </div>
    </div>
  );
}

// Upcoming appointments view - shows scheduled appointments from the scheduler (matches TodayTaskList style)
function UpcomingAppointmentsView({ appointments }: { appointments: Appointment[] }) {
  // Sort by date and time
  const sorted = [...appointments].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.start.localeCompare(b.start);
  });

  return (
    <div className="p-3">
      <div className="rounded-md border border-red-500/20 bg-red-500/5">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--fg)]/80">
            <span className="inline-flex items-center gap-1 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-red-400">
                <path d="M6.75 3A1.75 1.75 0 0 0 5 4.75v14.5C5 20.216 5.784 21 6.75 21h10.5A1.75 1.75 0 0 0 19 19.25V4.75A1.75 1.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5a.25.25 0 0 1 .25.25v14.5a.25.25 0 0 1-.25.25H6.75a.25.25 0 0 1-.25-.25V4.75a.25.25 0 0 1 .25-.25ZM7.5 6.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM7.5 9.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM7.5 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"/>
              </svg>
              Upcoming Tasks
            </span>
          </div>
          <div className="text-[var(--fg)]/70">{sorted.length} items</div>
        </div>
        <div className="grid grid-cols-1 px-4 py-2 text-sm font-semibold text-[var(--fg)]/70">
          <span>NAME</span>
        </div>
        <ul className="divide-y divide-red-500/15">
          {sorted.length === 0 ? (
            <li className="px-4 py-4 text-base text-[var(--fg)]/70">No items</li>
          ) : (
            sorted.map((apt) => {
              const isToday = apt.date === new Date().toISOString().split('T')[0];
              const dateLabel = isToday ? 'Today' : new Date(apt.date).toLocaleDateString(undefined, { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              });

              return (
                <li key={apt.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-base text-[var(--fg)]">{apt.title}</span>
                    <span className="whitespace-nowrap text-sm text-[var(--fg)]/70">
                      {dateLabel} · {apt.start} · {apt.durationMin}m
                    </span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

