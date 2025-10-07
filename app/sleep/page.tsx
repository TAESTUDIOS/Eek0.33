// app/sleep/page.tsx
// Displays a professional-looking graph of sleep hours using a simple responsive SVG.

"use client";

import { useEffect, useMemo, useState } from "react";

type SleepPoint = { id: string; hours: number; created_at: string };

export default function SleepPage() {
  const [items, setItems] = useState<SleepPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sleep/hours", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Failed to load");
      const rows: any[] = Array.isArray(data.items) ? data.items : [];
      const mapped: SleepPoint[] = rows
        .map((r) => ({ id: String(r.id), hours: Number(r.hours), created_at: String(r.created_at) }))
        .filter((r) => Number.isFinite(r.hours))
        .slice()
        .reverse(); // oldest to newest
      setItems(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onDelete(id: string) {
    const prev = items;
    setItems((s) => s.filter((x) => x.id !== id));
    setDeleting((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(`/api/sleep/hours?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({} as any));
      if (!data?.ok) throw new Error();
    } catch {
      setItems(prev);
      alert("Failed to delete entry.");
    } finally {
      setDeleting((s) => ({ ...s, [id]: false }));
    }
  }

  const stats = useMemo(() => {
    if (items.length === 0) return { min: 0, max: 8 };
    const vals = items.map((d) => d.hours);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = 1;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [items]);

  // Build a simple path for the line chart
  function buildPath(width: number, height: number) {
    if (items.length === 0) return "";
    const left = 36;
    const right = 12;
    const top = 10;
    const bottom = 24;
    const w = Math.max(1, width - left - right);
    const h = Math.max(1, height - top - bottom);
    const n = items.length;
    const stepX = w / Math.max(1, n - 1);
    const scaleY = (v: number) => {
      const t = (v - stats.min) / Math.max(0.0001, stats.max - stats.min);
      const y = top + (1 - t) * h;
      return y;
    };
    let d = "";
    items.forEach((p, i) => {
      const x = left + i * stepX;
      const y = scaleY(p.hours);
      d += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    });
    return d;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sleep</h1>
      {loading ? (
        <div className="text-sm text-[var(--fg)]/60">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border)] text-sm font-medium flex items-center justify-between">
            <span>Hours slept</span>
            <span className="text-xs text-[var(--fg)]/60">Last {items.length} entries</span>
          </div>
          <div className="p-3">
            <div className="w-full" style={{ height: 220 }}>
              <svg viewBox="0 0 600 220" className="w-full h-full">
                {/* Y axis labels */}
                <g className="text-[10px] fill-[var(--fg)]/50">
                  {[stats.min, (stats.min + stats.max) / 2, stats.max].map((v, i) => (
                    <text key={i} x={4} y={10 + (1 - (v - stats.min) / Math.max(0.0001, stats.max - stats.min)) * (220 - 10 - 24)}>
                      {v.toFixed(1)}h
                    </text>
                  ))}
                </g>
                {/* Grid lines */}
                <g stroke="currentColor" className="text-[var(--border)]">
                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
                    <line key={i} x1={36} y1={10 + (1 - t) * (220 - 10 - 24)} x2={600 - 12} y2={10 + (1 - t) * (220 - 10 - 24)} strokeWidth={0.5} />
                  ))}
                </g>
                {/* Line */}
                <path d={buildPath(600, 220)} stroke="currentColor" className="text-[var(--accent)]" strokeWidth={2} fill="none" />
                {/* Dots */}
                <g fill="currentColor" className="text-[var(--accent)]">
                  {items.map((p, i) => {
                    const left = 36; const right = 12; const top = 10; const bottom = 24;
                    const w = 600 - left - right; const h = 220 - top - bottom;
                    const stepX = w / Math.max(1, items.length - 1);
                    const x = left + i * stepX;
                    const t = (p.hours - stats.min) / Math.max(0.0001, stats.max - stats.min);
                    const y = top + (1 - t) * h;
                    return <circle key={p.id} cx={x} cy={y} r={3} />;
                  })}
                </g>
              </svg>
            </div>
            <div className="mt-3 text-xs text-[var(--fg)]/60">Recent entries</div>
            <ul className="mt-1 divide-y divide-[var(--border)] text-sm">
              {items.slice().reverse().map((p) => (
                <li key={p.id} className="flex items-center justify-between py-1 gap-2">
                  <div className="min-w-0">
                    <div className="truncate">{new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-xs text-[var(--fg)]/60">ID: {p.id}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[var(--accent)] font-medium">{p.hours.toFixed(1)}h</span>
                    <button
                      className="text-[11px] px-2 py-1 rounded-md border border-[var(--border)] text-[var(--fg)]/70 hover:bg-[var(--surface-2)] disabled:opacity-50"
                      onClick={() => onDelete(p.id)}
                      disabled={!!deleting[p.id]}
                    >
                      {deleting[p.id] ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
