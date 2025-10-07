// app/urgent/page.tsx
// Purpose: Urgent todos page with configurable items. Wires to Zustand store and persists in localStorage.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import UrgentTodoForm from "@/components/UrgentTodoForm";
import UrgentTodoList from "@/components/UrgentTodoList";
import { useAppStore } from "@/lib/store";
import Logo from "@/images/logo/logo.png";

export default function UrgentPage() {
  const { addUrgentTodo, loadUrgentTodos } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    loadUrgentTodos();
  }, [loadUrgentTodos]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar identical to Chat/Schedule header */}
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
              {/* Add button - icon only */}
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label="Add urgent task"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                </svg>
              </button>
              {/* Edit button - icon only */}
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                aria-label={editing ? "Done editing" : "Edit tasks"}
              >
                {editing ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.35 8.35a.75.75 0 0 0-.197.303l-1.5 4.5a.75.75 0 0 0 .948.948l4.5-1.5a.75.75 0 0 0 .303-.197l8.008-8.008Z" />
                  </svg>
                )}
              </button>
              {/* Hamburger menu */}
              <Sidebar variant="top" />
            </div>
          </div>

          {/* Page body */}
          <div className="flex-1 min-h-0 p-3">
            <UrgentTodoList editing={editing} />
          </div>

          {/* Add urgent modal */}
          {showAdd ? (
            <div className="fixed inset-0 z-20 flex items-end sm:items-center sm:justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowAdd(false)} />
              <div className="relative w-full sm:w-[520px] max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl">
                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--fg)]">Add Urgent Task</h3>
                  <button type="button" className="text-[var(--fg)]/70 text-sm hover:text-[var(--fg)]" onClick={() => setShowAdd(false)} aria-label="Close">✕</button>
                </div>
                <div className="p-4">
                  <UrgentTodoForm
                    onAdd={(t) => {
                      addUrgentTodo(t);
                      setShowAdd(false);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

