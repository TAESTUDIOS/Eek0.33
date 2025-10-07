// app/snapshot/page.tsx
// Lists saved "mind snapshots" with option to delete. Fetches from /api/mind.

"use client";

import { useEffect, useState } from "react";

type MindItem = { id: string; text: string; created_at: string };

export default function SnapshotPage() {
  const [items, setItems] = useState<MindItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mind", { cache: "no-store" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Failed to load");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: string) {
    const prev = items;
    setItems((s) => s.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/mind?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Delete failed");
    } catch (e) {
      // rollback on failure
      setItems(prev);
      alert("Delete failed.");
    }
  }

  return (
    <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
      <h1 className="text-xl font-semibold">Snapshot</h1>
      {loading ? (
        <div className="text-sm text-[var(--fg)]/60">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-[var(--fg)]/60">No entries yet. Use OS Control V1 ritual to add one.</div>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] overflow-hidden">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate">{it.text}</div>
                <div className="text-xs text-[var(--fg)]/50">
                  {new Date(it.created_at).toLocaleString()}
                </div>
              </div>
              <button
                className="text-xs px-2 py-1 rounded-md border border-red-300 bg-transparent text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                onClick={() => onDelete(it.id)}
                aria-label={`Delete ${it.id}`}
              >
                Delete
              </button>
            </li>) )}
        </ul>
      )}
    </div>
  );
}
