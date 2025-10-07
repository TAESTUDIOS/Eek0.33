// app/widget/page.tsx
// Purpose: Widget-optimized page for upcoming tasks with code lock (333). No header, minimal UI for iPhone widgets.
// This page bypasses the gesture lock.

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { UrgentTodo, Appointment } from "@/lib/types";

const CODE_LOCK = "333";
const STORAGE_KEY = "psa.widget.unlocked";

export default function WidgetPage() {
  const { urgentTodos, loadUrgentTodos, toggleUrgentDone } = useAppStore();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "urgent">("upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    // Check if already unlocked in this session
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (unlocked) {
      loadUrgentTodos();
      loadAppointments();
    }
  }, [unlocked, loadUrgentTodos]);

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

  const handleButtonPress = (digit: string) => {
    const newCode = code + digit;
    setCode(newCode);
    
    if (newCode.length === 3) {
      if (newCode === CODE_LOCK) {
        setUnlocked(true);
        sessionStorage.setItem(STORAGE_KEY, "true");
        setError(false);
      } else {
        setError(true);
        setTimeout(() => {
          setCode("");
          setError(false);
        }, 1000);
      }
    }
  };

  const handleClear = () => {
    setCode("");
    setError(false);
  };

  // Code lock screen with button interface
  if (!unlocked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-0)]">
        <div className="w-full max-w-xs px-6">
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-lg font-semibold text-[var(--fg)]">Widget Access</h1>
              <p className="mt-1 text-sm text-[var(--fg)]/60">Enter 3-digit code</p>
            </div>
            
            {/* Code display */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full transition-colors ${
                    error
                      ? "bg-red-500"
                      : code.length > i
                      ? "bg-blue-500"
                      : "bg-[var(--fg)]/20"
                  }`}
                />
              ))}
            </div>

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleButtonPress(String(num))}
                  disabled={code.length >= 3}
                  className="aspect-square rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xl font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-2)] active:scale-95 disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="aspect-square rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-sm font-medium text-[var(--fg)]/70 transition-colors hover:bg-[var(--surface-2)] active:scale-95"
              >
                Clear
              </button>
              <button
                onClick={() => handleButtonPress("0")}
                disabled={code.length >= 3}
                className="aspect-square rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xl font-medium text-[var(--fg)] transition-colors hover:bg-[var(--surface-2)] active:scale-95 disabled:opacity-50"
              >
                0
              </button>
              <div className="aspect-square" /> {/* Empty space */}
            </div>

            {error && (
              <p className="text-center text-sm text-red-500">Incorrect code</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Widget content - appointments in upcoming, urgent todos in urgent tab
  const upcomingUrgent = urgentTodos.filter((t) => !t.done);

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--surface-0)]">
      {/* Tab navigation */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "upcoming"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-[var(--fg)]/60 hover:text-[var(--fg)]"
          }`}
        >
          Upcoming ({appointments.length})
        </button>
        <button
          onClick={() => setTab("urgent")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "urgent"
              ? "border-b-2 border-red-500 text-red-500"
              : "text-[var(--fg)]/60 hover:text-[var(--fg)]"
          }`}
        >
          Urgent ({upcomingUrgent.length})
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {tab === "upcoming" ? (
          <UpcomingAppointmentsView appointments={appointments} />
        ) : (
          <UrgentTodosView todos={upcomingUrgent} onToggle={toggleUrgentDone} />
        )}
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
        <div className="flex items-center justify-between px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-[var(--fg)]/80">
            <span className="inline-flex items-center gap-1 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-red-400">
                <path d="M6.75 3A1.75 1.75 0 0 0 5 4.75v14.5C5 20.216 5.784 21 6.75 21h10.5A1.75 1.75 0 0 0 19 19.25V4.75A1.75 1.75 0 0 0 17.25 3H6.75Zm0 1.5h10.5a.25.25 0 0 1 .25.25v14.5a.25.25 0 0 1-.25.25H6.75a.25.25 0 0 1-.25-.25V4.75a.25.25 0 0 1 .25-.25ZM7.5 6.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM7.5 9.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75ZM7.5 12.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"/>
              </svg>
              Upcoming Tasks
            </span>
          </div>
          <div className="text-[var(--fg)]/70">{sorted.length} items</div>
        </div>
        <div className="grid grid-cols-1 px-3 py-2 text-xs font-semibold text-[var(--fg)]/70">
          <span>NAME</span>
        </div>
        <ul className="divide-y divide-red-500/15">
          {sorted.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--fg)]/70">No items</li>
          ) : (
            sorted.map((apt) => {
              const isToday = apt.date === new Date().toISOString().split('T')[0];
              const dateLabel = isToday ? 'Today' : new Date(apt.date).toLocaleDateString(undefined, { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              });

              return (
                <li key={apt.id} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-[var(--fg)]">{apt.title}</span>
                    <span className="whitespace-nowrap text-xs text-[var(--fg)]/70">
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

// Urgent todos view
function UrgentTodosView({ todos, onToggle }: { todos: UrgentTodo[]; onToggle: (id: string) => void }) {
  if (todos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[var(--fg)]/50">No urgent todos</p>
      </div>
    );
  }

  // Sort by priority: high > medium > low, then by due date
  const sorted = [...todos].sort((a, b) => {
    const priorityRank = { high: 0, medium: 1, low: 2 };
    const rankDiff = priorityRank[a.priority] - priorityRank[b.priority];
    if (rankDiff !== 0) return rankDiff;
    const dueA = a.dueAt ?? Infinity;
    const dueB = b.dueAt ?? Infinity;
    return dueA - dueB;
  });

  return (
    <ul className="divide-y divide-[var(--border)]">
      {sorted.map((todo) => (
        <li key={todo.id} className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => onToggle(todo.id)}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 border-[var(--fg)]/30 transition-colors hover:border-red-500"
            aria-label={`Mark ${todo.title} as done`}
          >
            {todo.done && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-red-500">
                <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
          <div className="flex-1">
            <p className="text-sm text-[var(--fg)]">{todo.title}</p>
            {todo.dueAt && (
              <p className="mt-0.5 text-xs text-[var(--fg)]/50">
                Due: {new Date(todo.dueAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              todo.priority === "high"
                ? "bg-red-500/20 text-red-400"
                : todo.priority === "medium"
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {todo.priority}
          </span>
        </li>
      ))}
    </ul>
  );
}
