// app/missions/page.tsx
// Lists saved missions in a neat list.

"use client";

import { useEffect, useState } from "react";

type Mission = { id: string; text: string; created_at: string };

export default function MissionsPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/missions", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Failed to load");
      setItems(Array.isArray(data.items) ? data.items : []);
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
      const res = await fetch(`/api/missions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({} as any));
      if (!data?.ok) throw new Error();
    } catch {
      setItems(prev);
      alert("Failed to delete.");
    } finally {
      setDeleting((s) => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
      <h1 className="text-xl font-semibold">Missions</h1>
      {loading ? (
        <div className="text-sm text-[var(--fg)]/60">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-[var(--fg)]/60">No missions yet.</div>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] overflow-hidden">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate">{it.text}</div>
                <div className="text-xs text-[var(--fg)]/50">{new Date(it.created_at).toLocaleString()}</div>
                <div className="text-[10px] text-[var(--fg)]/40">ID: {it.id}</div>
              </div>
              <button
                className="text-[11px] px-2 py-1 rounded-md border border-[var(--border)] text-[var(--fg)]/70 hover:bg-[var(--surface-2)] disabled:opacity-50 shrink-0"
                onClick={() => onDelete(it.id)}
                disabled={!!deleting[it.id]}
              >
                {deleting[it.id] ? 'Deleting…' : 'Delete'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
