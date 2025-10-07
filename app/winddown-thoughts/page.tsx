// app/winddown-thoughts/page.tsx
// Lists "Winddown thoughts" (blockers before sleep) with delete option.

"use client";

import { useEffect, useState } from "react";

type Thought = { id: string; text: string; created_at: string };

export default function WinddownThoughtsPage() {
  const [items, setItems] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/winddown/thoughts", { cache: "no-store" });
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
    try {
      const res = await fetch(`/api/winddown/thoughts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error();
    } catch {
      setItems(prev);
      alert("Failed to delete.");
    }
  }

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
      <h1 className="text-xl font-semibold">Winddown Thoughts</h1>
      {loading ? (
        <div className="text-sm text-[var(--fg)]/60">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-[var(--fg)]/60">No thoughts saved yet.</div>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] overflow-hidden">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate">{it.text}</div>
                <div className="text-xs text-[var(--fg)]/50">{new Date(it.created_at).toLocaleString()}</div>
              </div>
              <button
                className="text-[11px] px-2 py-1 rounded-md border border-[var(--border)] text-[var(--fg)]/70 hover:bg-[var(--surface-2)]"
                onClick={() => onDelete(it.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
