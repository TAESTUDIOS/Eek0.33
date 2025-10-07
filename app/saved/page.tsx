// app/saved/page.tsx
// Shows saved messages and allows deletion.

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";

export default function SavedPage() {
  const { saved, deleteSaved, setSaved } = useAppStore();

  useEffect(() => {
    // Load persisted saved messages if API configured
    fetch(api("/save"))
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.items)) {
          const items = data.items.map((row: any) => ({
            id: row.id,
            text: row.text,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          }));
          setSaved(items);
        }
      })
      .catch(() => {});
  }, [setSaved]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Saved Messages</h1>
      {saved.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">No saved messages yet.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {saved.map((s) => (
            <li key={s.id} className="p-3 border rounded-md bg-white dark:bg-gray-900 dark:border-gray-800">
              <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">{s.text}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span suppressHydrationWarning>{new Date(s.createdAt).toLocaleString()}</span>
                <button
                  onClick={async () => {
                    try { await fetch(api(`/save?id=${encodeURIComponent(s.id)}`), { method: "DELETE" }); } catch {}
                    deleteSaved(s.id);
                  }}
                  className="px-2 py-1 border rounded bg-white hover:bg-red-50 text-red-700 border-red-200 dark:bg-gray-900 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
