// app/widget-urgents/page.tsx
// Purpose: Widget-optimized page for urgent todos. No header, minimal UI for iPhone widgets.
// This page is accessible without authentication.

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import type { UrgentTodo } from "@/lib/types";

export default function WidgetUrgentsPage() {
  const { urgentTodos, loadUrgentTodos, toggleUrgentDone } = useAppStore();

  useEffect(() => {
    loadUrgentTodos();
  }, [loadUrgentTodos]);

  const upcomingUrgent = urgentTodos.filter((t) => !t.done);

  return (
    <div className="fixed inset-0 flex flex-col bg-[var(--surface-0)]">
      <div className="flex-1 overflow-y-auto">
        <UrgentTodosView todos={upcomingUrgent} onToggle={toggleUrgentDone} />
      </div>
    </div>
  );
}

// Urgent todos view
function UrgentTodosView({ todos, onToggle }: { todos: UrgentTodo[]; onToggle: (id: string) => void }) {
  if (todos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-base text-[var(--fg)]/50">No urgent todos</p>
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
    <div className="p-3">
      <div className="rounded-md border border-red-500/20 bg-red-500/5">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-[var(--fg)]/80">
            <span className="inline-flex items-center gap-1 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-red-400">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
              </svg>
              Urgent Todos
            </span>
          </div>
          <div className="text-[var(--fg)]/70">{sorted.length} items</div>
        </div>
        <div className="grid grid-cols-1 px-4 py-2 text-sm font-semibold text-[var(--fg)]/70">
          <span>TASK</span>
        </div>
        <ul className="divide-y divide-red-500/15">
          {sorted.map((todo) => (
            <li key={todo.id} className="flex items-center gap-3 px-4 py-4">
              <button
                onClick={() => onToggle(todo.id)}
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 border-[var(--fg)]/30 transition-colors hover:border-red-500"
                aria-label={`Mark ${todo.title} as done`}
              >
                {todo.done && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-red-500">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className="flex-1">
                <p className="text-base text-[var(--fg)]">{todo.title}</p>
                {todo.dueAt && (
                  <p className="mt-0.5 text-sm text-[var(--fg)]/50">
                    Due: {new Date(todo.dueAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-sm font-medium ${
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
      </div>
    </div>
  );
}
