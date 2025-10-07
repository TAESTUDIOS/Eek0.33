// components/UrgentTodoList.tsx
// Purpose: Render and manage urgent todos list. < 100 LOC

"use client";

import type { UrgentPriority } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useMemo, useState } from "react";

type Props = { editing?: boolean };

export default function UrgentTodoList({ editing = false }: Props) {
  const { urgentTodos, toggleUrgentDone, updateUrgentTodo, deleteUrgentTodo, clearCompletedUrgent } = useAppStore();
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const [prio, setPrio] = useState<"all" | UrgentPriority>("all");

  const items = useMemo(() => {
    let arr = [...urgentTodos];
    if (filter !== "all") arr = arr.filter((t) => (filter === "done" ? t.done : !t.done));
    // sort: not done first, then high>medium>low, then due soonest
    const rank = { high: 0, medium: 1, low: 2 } as const;
    arr.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const r = rank[a.priority] - rank[b.priority];
      if (r !== 0) return r;
      const da = a.dueAt ?? Infinity;
      const db = b.dueAt ?? Infinity;
      return da - db;
    });
    return arr;
  }, [urgentTodos, filter, prio]);

  function onTitleEdit(id: string, title: string) {
    updateUrgentTodo(id, { title });
  }

  function onPriorityChange(id: string, p: UrgentPriority) {
    updateUrgentTodo(id, { priority: p });
  }

  if (!editing) {
    // Read-only compact view (table-like)
    return (
      <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5">
        <div className="flex items-center justify-between px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-[var(--fg)]/80">
            <span className="inline-flex items-center gap-1 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-red-400">
                <path d="M10.29 3.86a2 2 0 0 1 3.42 0l7.07 12.25A2 2 0 0 1 19.07 19H4.93a2 2 0 0 1-1.71-2.89L10.29 3.86Z"/>
              </svg>
              Urgent Todos
            </span>
          </div>
          <div className="flex items-center gap-3 text-[var(--fg)]/70">
            <span>{items.length} items</span>
            <button
              className="underline-offset-2 hover:underline"
              onClick={() => setFilter("open")}
              type="button"
            >
              Open
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 px-3 py-2 text-xs font-semibold text-[var(--fg)]/70">
          <span>NAME</span>
          <span className="text-right">PRIORITY</span>
        </div>
        <ul className="divide-y divide-red-500/15">
          {items.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--fg)]/70">No items</li>
          ) : (
            items.map((t) => (
              <li key={t.id} className="grid grid-cols-2 items-center px-3 py-2">
                <span className="truncate text-sm text-[var(--fg)]">{t.title}</span>
                <span className="text-right">
                  <span
                    className={
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                      (t.priority === "high"
                        ? "bg-red-900/30 text-red-300 border border-red-800"
                        : t.priority === "medium"
                        ? "bg-yellow-900/30 text-yellow-300 border border-yellow-800"
                        : "bg-green-900/30 text-green-300 border border-green-800")
                    }
                  >
                    {t.priority}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  // Editing view
  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="done">Done</option>
        </select>
        <select value={prio} onChange={(e) => setPrio(e.target.value as any)} className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          <option value="all">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button onClick={clearCompletedUrgent} className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Clear completed</button>
      </div>

      <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {items.length === 0 ? (
          <li className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">No items match.</li>
        ) : (
          items.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleUrgentDone(t.id)}
                aria-label={`Mark ${t.title} as ${t.done ? "open" : "done"}`}
              />
              <input
                value={t.title}
                onChange={(e) => onTitleEdit(t.id, e.target.value)}
                className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm focus:border-gray-300 focus:outline-none dark:focus:border-gray-700"
              />
              <select
                value={t.priority}
                onChange={(e) => onPriorityChange(t.id, e.target.value as UrgentPriority)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {t.dueAt && (
                <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400" title={new Date(t.dueAt).toLocaleString()}>
                  due {new Date(t.dueAt).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={() => deleteUrgentTodo(t.id)}
                className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                aria-label={`Delete ${t.title}`}
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
