// components/UrgentTodoForm.tsx
// Purpose: Small form to create urgent todos. < 100 LOC

"use client";

import { useState } from "react";
import type { UrgentPriority, UrgentTodo } from "@/lib/types";
import { uid } from "@/lib/id";

type Props = {
  onAdd: (t: UrgentTodo) => void;
};

export default function UrgentTodoForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<UrgentPriority>("high");
  const [due, setDue] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const now = Date.now();
    const dueAt = due ? new Date(due).getTime() : undefined;
    const t: UrgentTodo = {
      id: uid("todo"),
      title: trimmed,
      priority,
      done: false,
      dueAt,
      createdAt: now,
      updatedAt: now,
    };
    onAdd(t);
    setTitle("");
    setPriority("high");
    setDue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-gray-100"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as UrgentPriority)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Due</label>
        <input
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
      <button
        type="submit"
        className="h-10 rounded-md bg-gray-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        Add
      </button>
    </form>
  );
}
