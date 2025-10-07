// app/winddown/page.tsx
// Winddown page: shows sessions with start times and answers, plus an SVG chart of start times by day.

"use client";

import { useEffect, useMemo, useState } from "react";

type Session = { id: string; started_at: string };
type Answer = { id: string; session_id: string; question: string; answer: string; created_at: string };

export default function WinddownPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/winddown", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Failed to load");
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setAnswers(Array.isArray(data.answers) ? data.answers : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function deleteAnswer(id: string) {
    const prevA = answers;
    setAnswers((s) => s.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/winddown/answer?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error();
    } catch {
      setAnswers(prevA);
      alert("Failed to delete answer.");
    }
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this session and its answers?")) return;
    const prevS = sessions;
    const prevA = answers;
    setSessions((s) => s.filter((x) => x.id !== id));
    setAnswers((a) => a.filter((x) => x.session_id !== id));
    try {
      const res = await fetch(`/api/winddown?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error();
    } catch {
      setSessions(prevS);
      setAnswers(prevA);
      alert("Failed to delete session.");
    }
  }

  // Map answers by session
  const bySession = useMemo(() => {
    const map = new Map<string, Answer[]>();
    for (const a of answers) {
      const arr = map.get(a.session_id) || [];
      arr.push(a);
      map.set(a.session_id, arr);
    }
    return map;
  }, [answers]);

  // Build chart data: group sessions by date and plot start time (hour)
  const chartData = useMemo(() => {
    // last 14 days
    const days: { label: string; date: string; hour: number | null }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      days.push({ label: date.slice(5), date, hour: null });
    }
    for (const s of sessions) {
      const di = s.started_at?.slice(0, 10);
      const idx = days.findIndex((x) => x.date === di);
      if (idx >= 0) {
        const dt = new Date(s.started_at);
        days[idx].hour = dt.getHours() + dt.getMinutes() / 60;
      }
    }
    return days;
  }, [sessions]);

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
      <h1 className="text-xl font-semibold">Winddown</h1>
      {loading ? (
        <div className="text-sm text-[var(--fg)]/60">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : (
        <>
          <section className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-subtle">
            <h2 className="text-sm font-medium mb-2">Start time chart (last 14 days)</h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[520px]">
                <Chart data={chartData} />
              </div>
            </div>
          </section>

          <section className="rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-subtle">
            <h2 className="text-sm font-medium mb-2">Sessions</h2>
            {sessions.length === 0 ? (
              <div className="text-sm text-[var(--fg)]/60">No winddown sessions yet.</div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {sessions.map((s) => (
                  <li key={s.id} className="py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">Started: {new Date(s.started_at).toLocaleString()}</div>
                      <button
                        className="text-xs px-2 py-1 rounded-md border border-red-300 bg-transparent text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                        onClick={() => deleteSession(s.id)}
                      >
                        Delete session
                      </button>
                    </div>
                    <ul className="mt-1 pl-3 list-disc text-sm text-[var(--fg)]/85">
                      {(bySession.get(s.id) || [])
                        .slice()
                        .sort((a, b) => a.created_at.localeCompare(b.created_at))
                        .map((a) => (
                          <li key={a.id} className="truncate flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[var(--fg)]/60 mr-2">{a.question.replaceAll('_', ' ')}:</span>
                              {a.answer}
                            </div>
                            <button
                              className="text-[11px] px-2 py-1 rounded-md border border-[var(--border)] text-[var(--fg)]/70 hover:bg-[var(--surface-2)]"
                              onClick={() => deleteAnswer(a.id)}
                            >
                              Delete
                            </button>
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Chart({ data }: { data: { label: string; hour: number | null }[] }) {
  const width = 640;
  const height = 200;
  const padding = 24;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  // y from 16:00 (16) to 2:00 (26 -> 2 wrap). We'll map hours to a circular-ish scale but linear for simplicity
  const yMin = 16;
  const yMax = 26; // 26 -> 2:00
  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(1, data.length - 1)) * innerW;
    let h = d.hour;
    if (h !== null && h < 4) h += 24; // after midnight
    const y = h === null ? null : padding + (1 - (Math.min(yMax, Math.max(yMin, h)) - yMin) / (yMax - yMin)) * innerH;
    return { x, y, label: d.label };
  });
  // Build path ensuring we start with 'M' at the first non-null point
  let started = false;
  const path = points
    .map((p) => {
      if (p.y === null) return "";
      const cmd = started ? "L" : "M";
      started = true;
      return `${cmd}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto">
      <rect x={0} y={0} width={width} height={height} fill="transparent" />
      {/* grid */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const h = 16 + i * 2;
        const y = padding + (1 - (h - 16) / 10) * innerH;
        return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="currentColor" strokeOpacity={0.08} />;
      })}
      {/* axes */}
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="currentColor" strokeOpacity={0.25} />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeOpacity={0.25} />
      {/* x labels */}
      {points.map((p, i) => (
        <text key={i} x={p.x} y={height - padding + 14} fontSize={9} textAnchor="middle" fill="currentColor" opacity={0.6}>
          {p.label}
        </text>
      ))}
      {/* line */}
      {path ? <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" /> : null}
      {/* dots */}
      {points.map((p, i) => (
        p.y === null ? null : (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="var(--accent)" />
            <circle cx={p.x} cy={p.y} r={4.5} fill="none" stroke="white" strokeOpacity={0.6} strokeWidth={1} />
          </g>
        )
      ))}
      {/* y labels */}
      {[16, 18, 20, 22, 24, 26].map((h) => (
        <text key={h} x={6} y={padding + (1 - (h - 16) / 10) * innerH + 3} fontSize={10} fill="currentColor" opacity={0.6}>
          {h % 24}:00
        </text>
      ))}
    </svg>
  );
}
