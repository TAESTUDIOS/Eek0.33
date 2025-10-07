// app/schedule/page.tsx
// Schedule Overview 2.0: day navigator with 24-hour appointment grid plus urgent/today summaries.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import Logo from "@/images/logo/logo.png";
import type { Appointment } from "@/lib/types";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const ROW_PX = 64; // target pixel height for each hour row

const formatHourLabel = (hour: number) => `${hour.toString().padStart(2, "0")}:00`;

const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseISOToDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map((chunk) => Number(chunk));
  return new Date(y, (m || 1) - 1, d || 1);
};

const formatLongDate = (iso: string) => {
  const date = parseISOToDate(iso);
  // Deterministic formatting to avoid SSR/CSR locale differences
  const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
  const w = weekdays[date.getDay()];
  const m = months[date.getMonth()];
  const d = String(date.getDate()).padStart(2, "0");
  // Example: "Friday 26 Sept"
  return `${w} ${d} ${m}`;
};

const parseTimeToMinutes = (time: string) => {
  const [hh, mm] = time.split(":").map((chunk) => Number(chunk));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
};

export default function ScheduleOverviewPage() {
  const urgentTodos = useAppStore((state) => state.urgentTodos);
  const todayTasks = useAppStore((state) => state.todayTasks);
  const loadUrgentTodos = useAppStore((state) => state.loadUrgentTodos);
  const loadTodayTasks = useAppStore((state) => state.loadTodayTasks);
  const hideSleepingHours = useAppStore((state) => state.hideSleepingHours);
  const sleepStartHour = useAppStore((state) => state.sleepStartHour);
  const sleepEndHour = useAppStore((state) => state.sleepEndHour);

  const [selectedDate, setSelectedDate] = useState<string>(() => toISODate(new Date()))
;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const datePickerRef = useRef<HTMLInputElement | null>(null);

  const loadAppointments = useCallback(async (dateISO: string) => {
    setLoadingAppointments(true);
    try {
      const res = await fetch(`/api/appointments?date=${encodeURIComponent(dateISO)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({} as any));
      const items = Array.isArray(data?.items) ? (data.items as Appointment[]) : [];
      setAppointments(items);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    loadUrgentTodos();
    loadTodayTasks();
  }, [loadUrgentTodos, loadTodayTasks]);

  useEffect(() => {
    loadAppointments(selectedDate);
  }, [selectedDate, loadAppointments]);

  // Tick every 30s to keep "Now" indicators fresh without heavy updates.
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const summary = useMemo(() => {
    const openUrgent = urgentTodos.filter((todo) => !todo.done).length;
    const openToday = todayTasks.filter((task) => !task.done).length;
    return `${openUrgent} urgent · ${openToday} today`;
  }, [urgentTodos, todayTasks]);

  const dayAppointments = useMemo(() => {
    return appointments
      .map((appt) => {
        const startMinutes = parseTimeToMinutes(appt.start);
        const endMinutes = startMinutes + (Number(appt.durationMin) || 0);
        return { ...appt, startMinutes, endMinutes };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);
  }, [appointments]);

  const appointmentCount = dayAppointments.length;

  const isToday = useMemo(() => selectedDate === toISODate(now), [selectedDate, now]);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const nowLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(now);
  }, [now]);

  // Auto-scroll to current hour on today
  useEffect(() => {
    if (!isToday || loadingAppointments) return;
    const el = typeof document !== "undefined" ? document.getElementById(`hour-${currentHour}`) : null;
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isToday, currentHour, selectedDate, loadingAppointments]);

  // Determine if an hour should be hidden based on sleep window.
  const isHourHidden = useCallback((hour: number) => {
    if (!hideSleepingHours) return false;
    const start = Math.max(0, Math.min(23, Number(sleepStartHour) || 0));
    const end = Math.max(0, Math.min(23, Number(sleepEndHour) || 0));
    if (start === end) return false; // no hiding when identical
    // If window does not cross midnight (e.g., 23 -> 23 excluded above, otherwise 1->7)
    if (start < end) {
      return hour >= start && hour < end;
    }
    // Crosses midnight (e.g., 22 -> 8): hide hours >= start OR < end
    return hour >= start || hour < end;
  }, [hideSleepingHours, sleepStartHour, sleepEndHour]);

  const formatTimeRange = (start: string, durationMin: number) => {
    const startDate = new Date(`2000-01-01T${start}`);
    if (Number.isNaN(startDate.getTime())) return start;
    const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
    const format = new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${format.format(startDate)} – ${format.format(endDate)}`;
  };

  const goToOffset = (offset: number) => {
    const next = parseISOToDate(selectedDate);
    next.setDate(next.getDate() + offset);
    setSelectedDate(toISODate(next));
  };

  const handleDateInput = (value: string) => {
    if (!value) return;
    setSelectedDate(value);
  };

  // Bottom sheet composer state
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cTitle, setCTitle] = useState("");
  const [cDate, setCDate] = useState<string>(() => toISODate(new Date()));
  const [cTime, setCTime] = useState("08:00");
  const [cDuration, setCDuration] = useState<number>(30);
  const [cPriority, setCPriority] = useState<"high" | "medium" | "low">("medium");
  const [cDesc, setCDesc] = useState("");
  const [saving, setSaving] = useState(false);
  // Reminder selections
  const [r1h, setR1h] = useState(false);
  const [r30m, setR30m] = useState(false);
  const [r10m, setR10m] = useState(false);
  const [rAt, setRAt] = useState(false);

  const openComposer = () => {
    setCTitle("");
    setCDate(selectedDate);
    setCTime(new Date().toTimeString().slice(0,5));
    setCDuration(30);
    setCPriority("medium");
    setCDesc("");
    setEditingId(null);
    // reset reminders
    setR1h(false);
    setR30m(false);
    setR10m(false);
    setRAt(false);
    setShowComposer(true);
  };

  const openComposerForEdit = (appt: Appointment) => {
    setCTitle(appt.title || "");
    setCDate(appt.date);
    setCTime(appt.start);
    setCDuration(Number(appt.durationMin || 30));
    // parse priority from notes prefix [P:x]
    const note = appt.notes || "";
    const m = note.match(/^\[P:(high|medium|low)\]\s*/i);
    const priority = (m?.[1]?.toLowerCase() as "high" | "medium" | "low") || "medium";
    const clean = m ? note.slice(m[0].length) : note;
    setCPriority(priority);
    setCDesc(clean);
    setEditingId(appt.id);
    // load persisted reminder flags (default false)
    setR1h(Boolean((appt as any).remind1h));
    setR30m(Boolean((appt as any).remind30m));
    setR10m(Boolean((appt as any).remind10m));
    setRAt(Boolean((appt as any).remindAtStart));
    setShowComposer(true);
  };

  const triggerSelectedReminders = async (appointmentId: string) => {
    const posts: Array<Promise<Response>> = [];
    // Send full appointment data to avoid database lookup
    const payload = { title: cTitle, date: cDate, start: cTime, appointmentId };
    if (r1h) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 60 }) }));
    if (r30m) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 30 }) }));
    if (r10m) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 10 }) }));
    if (rAt) posts.push(fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, offsetMinutes: 0 }) }));
    if (posts.length === 0) return;
    try {
      await Promise.allSettled(posts);
    } catch {}
  };

  const handleSaveAppointment = async () => {
    if (!cTitle.trim() || !cDate || !cTime || !cDuration) return;
    setSaving(true);
    try {
      const body = {
        title: cTitle.trim(),
        date: cDate,
        start: cTime,
        durationMin: Number(cDuration),
        // Encode priority at top of notes for simple server schema
        notes: `[P:${cPriority}] ${cDesc}`.trim(),
        id: editingId ?? undefined,
        // Persist reminder flags
        remind1h: r1h,
        remind30m: r30m,
        remind10m: r10m,
        remindAtStart: rAt,
      } satisfies Partial<Appointment>;
      const res = await fetch("/api/appointments", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!data?.ok) throw new Error("save failed");
      const savedItem = (data?.item as Appointment | undefined) ?? undefined;
      const apptId = savedItem?.id ?? editingId ?? null;
      await loadAppointments(selectedDate);
      
      // Close composer immediately - don't wait for reminders
      setShowComposer(false);
      
      // Fire reminders in background (non-blocking)
      if (apptId) {
        triggerSelectedReminders(apptId).catch((err) => {
          console.error("Failed to trigger reminders:", err);
        });
      }
    } catch {
      // TODO: could toast an error here
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAppointments(selectedDate);
    } catch {}
  };

  const parsePriority = (notes?: string): { p: "high"|"medium"|"low"; text: string } => {
    const note = notes || "";
    const m = note.match(/^\[P:(high|medium|low)\]\s*/i);
    const p = (m?.[1]?.toLowerCase() as "high" | "medium" | "low") || "medium";
    const text = m ? note.slice(m[0].length) : note;
    return { p, text };
  };

  const priorityStyles: Record<"high"|"medium"|"low", string> = {
    high: "bg-red-600/15 text-red-400 border-red-700/40",
    medium: "bg-amber-600/15 text-amber-400 border-amber-700/40",
    low: "bg-emerald-600/15 text-emerald-400 border-emerald-700/40",
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar identical to Chat header */}
          <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--border)] rounded-t-lg">
            <div className="flex items-center gap-2">
              <Image
                src={Logo}
                alt="Eeko logo"
                width={22}
                height={22}
                className="opacity-90 [filter:invert(41%)_sepia(89%)_saturate(1468%)_hue-rotate(191deg)_brightness(93%)_contrast(92%)]"
                priority
              />
              <span className="text-sm font-medium text-[var(--fg)]/85">Eeko</span>
              <span className="text-[10px] font-normal text-[var(--fg)]/35">v.25</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile-only hamburger */}
              <div className="md:hidden">
                <Sidebar variant="top" />
              </div>
            </div>
          </div>

          {/* Day navigator row below header (previously part of header) */}
          <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-[var(--border)]">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => goToOffset(-1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] transition"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Pick date"
              onClick={() => {
                const el = datePickerRef.current as any;
                if (!el) return;
                if (typeof el.showPicker === "function") el.showPicker();
                else el.click();
              }}
              className="min-w-[160px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-sm font-semibold text-[var(--fg)] shadow-inner hover:bg-[var(--surface-2)]/80"
            >
              {formatLongDate(selectedDate)}
            </button>
            <input
              ref={datePickerRef}
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateInput(e.target.value)}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              aria-label="Next day"
              onClick={() => goToOffset(1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] transition"
            >
              →
            </button>
          </div>

          {/* Summary section */}
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold text-[var(--fg)]">{summary}</div>
              <span className="text-xs text-[var(--fg)]/60 uppercase">{appointmentCount} appointments on this day</span>
            </div>
          </div>

          {/* Sticky Now indicator for today */}
          {isToday ? (
            <div className="sticky top-[46px] z-10 mx-3 mt-2 mb-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/90 px-3 py-1 text-xs text-[var(--fg)] shadow-subtle">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                <span className="font-medium">Now</span>
                <span className="opacity-70">{nowLabel}</span>
              </div>
            </div>
          ) : null}

          {/* 24-hour schedule grid */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-3">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-[var(--fg)]">24-hour schedule</h2>
                <p className="text-xs text-[var(--fg)]/60">Plan your {formatLongDate(selectedDate).toLowerCase()} at a glance.</p>
              </div>

              {loadingAppointments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin" aria-label="Loading appointments" />
                </div>
              ) : (
                <div className="space-y-2">
                  {HOURS.filter((h) => !isHourHidden(h)).map((hour) => {
                    const items = dayAppointments.filter((appt) => Math.floor(appt.startMinutes / 60) === hour);
                    return (
                      <div id={`hour-${hour}`} key={hour} className={`border-b border-[var(--border)] last:border-b-0 pb-2 last:pb-0 ${isToday && hour === currentHour ? "bg-[var(--surface-2)]/40" : ""}`}>
                        <div className="relative flex gap-3">
                          <div className={`w-16 flex-shrink-0 text-xs font-semibold pt-1 ${isToday && hour === currentHour ? "text-emerald-500" : "text-[var(--fg)]/60"}`}>
                            {formatHourLabel(hour)}
                          </div>
                          <div className="flex-1 min-w-0" style={{ minHeight: ROW_PX }}>
                            {items.length === 0 ? (
                              <span className="text-xs text-[var(--fg)]/40">—</span>
                            ) : (
                              <div className="space-y-2">
                                {items.map((appt) => {
                                  const { p, text } = parsePriority(appt.notes);
                                  return (
                                    <div
                                      key={appt.id}
                                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 shadow-subtle"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex items-center gap-2">
                                          <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[p]}`}>{p}</span>
                                          <h3 className="truncate font-semibold text-[var(--fg)] text-sm">{appt.title}</h3>
                                        </div>
                                        <span className="whitespace-nowrap text-xs text-[var(--fg)]/60">
                                          {formatTimeRange(appt.start, appt.durationMin)}
                                        </span>
                                      </div>
                                      {text ? (
                                        <p className="mt-1 text-xs text-[var(--fg)]/70 line-clamp-3">{text}</p>
                                      ) : null}
                                      <div className="mt-2 flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          className="h-7 px-2 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/80 hover:bg-[var(--surface-2)] text-xs"
                                          onClick={() => openComposerForEdit(appt)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="h-7 px-2 rounded-md border border-red-800/40 bg-red-900/20 text-red-300 hover:bg-red-900/30 text-xs"
                                          onClick={() => handleDeleteAppointment(appt.id)}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* Current time line within the current hour (minute-level offset) */}
                            {isToday && hour === currentHour ? (
                              <div className="absolute left-16 right-0" style={{ top: Math.round(4 + (currentMinute / 60) * (ROW_PX - 8)) }}>
                                <div className="h-[2px] bg-emerald-500/80" />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {appointmentCount === 0 && !loadingAppointments ? (
                <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)]/50 text-center">
                  No appointments scheduled for this day. Add one to populate the grid.
                </div>
              ) : null}
            </div>
          </div>

          {/* Footer with Add Task button */}
          <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--surface-1)] sticky bottom-0 md:static">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(toISODate(new Date()))}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] px-3 py-2 shadow-subtle hover:bg-[var(--surface-2)]/80"
                aria-label="Jump to today"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center">📅</span>
                <span className="text-sm font-semibold">Today</span>
              </button>

              <div className="flex-1" />

              <button
                type="button"
                onClick={openComposer}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 text-white px-4 py-2 shadow-subtle hover:bg-emerald-500 active:scale-[0.99] transition"
                aria-label="Add task"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/20">＋</span>
                <span className="text-sm font-semibold">Add Task</span>
              </button>
            </div>
          </div>

          {/* Bottom Sheet Composer */}
          {showComposer ? (
            <div className="fixed inset-0 z-20 flex items-end sm:items-center sm:justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setShowComposer(false)} />
              <div className="relative w-full sm:w-[480px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--fg)]">Add Appointment</h3>
                  <button type="button" className="text-[var(--fg)]/70 text-sm hover:text-[var(--fg)]" onClick={() => !saving && setShowComposer(false)} aria-label="Close">✕</button>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <label className="grid gap-1">
                    <span className="text-[var(--fg)]/70">Title</span>
                    <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none focus:ring-1 focus:ring-emerald-600" placeholder="What is this?" />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1">
                      <span className="text-[var(--fg)]/70">Date</span>
                      <input type="date" value={cDate} onChange={(e) => setCDate(e.target.value)} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[var(--fg)]/70">Time</span>
                      <input type="time" value={cTime} onChange={(e) => setCTime(e.target.value)} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none" />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="grid gap-1">
                      <span className="text-[var(--fg)]/70">Duration (min)</span>
                      <input type="number" min={5} step={5} value={cDuration} onChange={(e) => setCDuration(Number(e.target.value || 0))} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-[var(--fg)]/70">Priority</span>
                      <select value={cPriority} onChange={(e) => setCPriority(e.target.value as any)} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[var(--fg)] outline-none">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-[var(--fg)]/70">Description</span>
                    <textarea value={cDesc} onChange={(e) => setCDesc(e.target.value)} rows={4} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--fg)] outline-none" placeholder="Details, links, context..." />
                  </label>
                  {/* Reminders */}
                  <div className="grid gap-2">
                    <span className="text-[var(--fg)]/70">Reminders</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={r1h} onChange={(e) => setR1h(e.target.checked)} />
                        <span>1 hour</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={r30m} onChange={(e) => setR30m(e.target.checked)} />
                        <span>30 mins</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={r10m} onChange={(e) => setR10m(e.target.checked)} />
                        <span>10 mins</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={rAt} onChange={(e) => setRAt(e.target.checked)} />
                        <span>At start</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-[var(--fg)]/50">Selected reminders will be sent via your notifications webhook.</p>
                  </div>
                </div>
                <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setShowComposer(false)} className="h-9 px-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]/80 hover:bg-[var(--surface-2)]/80">Cancel</button>
                  <button type="button" disabled={saving || !cTitle.trim()} onClick={handleSaveAppointment} className="h-9 px-4 rounded-md bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500">{saving ? "Saving..." : "Save"}</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
