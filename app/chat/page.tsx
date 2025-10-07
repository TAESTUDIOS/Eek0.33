"use client";
// app/chat/page.tsx
// Chat page renders ChatWindow + ChatInput

  import ChatWindow from "@/components/ChatWindow";
  import ChatInput from "@/components/ChatInput";
  import UrgentTodoForm from "@/components/UrgentTodoForm";
  import UrgentTodoList from "@/components/UrgentTodoList";
  import TodayTaskList from "@/components/TodayTaskList";
  import Sidebar from "@/components/Sidebar";
  import Image from "next/image";
  import { useEffect, useState, useMemo, useRef } from "react";
  import { useAppStore } from "@/lib/store";
  import Logo from "@/images/logo/logo.png";

  export default function ChatPage() {
  const { setMessages, clearMessages, addUrgentTodo, loadUrgentTodos, loadTodayTasks, urgentTodos, autoRefreshEnabled, autoRefreshIntervalSec } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUrgents, setEditingUrgents] = useState(false);
  const [showAddUrgent, setShowAddUrgent] = useState(false);
  const [todayCount, setTodayCount] = useState<number>(0);
  const isFetchingMessages = useRef(false);
  const isTypingRef = useRef(false);

  // Load messages from server with in-flight guard
  const loadMessages = async () => {
    if (isFetchingMessages.current) return;
    isFetchingMessages.current = true;
    setRefreshing(true);
    try {
      const res = await fetch("/api/messages", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      if (Array.isArray(data?.messages)) setMessages(data.messages);
    } catch {
      // ignore network errors for now
    } finally {
      isFetchingMessages.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMessages]);
  useEffect(() => {
    loadUrgentTodos();
    loadTodayTasks();
  }, [loadUrgentTodos, loadTodayTasks]);
  const openUrgentCount = useMemo(() => urgentTodos.filter((t)=>!t.done).length, [urgentTodos]);

  // Compute today's appointments count to match TodayTaskList source of truth
  function todayISO(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const loadTodayCount = () => {
    const date = todayISO();
    fetch(`/api/appointments?date=${encodeURIComponent(date)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setTodayCount(Array.isArray(data?.items) ? data.items.length : 0))
      .catch(() => setTodayCount(0));
  };

  useEffect(() => {
    loadTodayCount();
    const onFocus = () => { loadTodayCount(); if (!isTypingRef.current) loadMessages(); };
    const onVis = () => { if (document.visibilityState === "visible") { loadTodayCount(); if (!isTypingRef.current) loadMessages(); } };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    const onTyping = (e: any) => { isTypingRef.current = !!(e?.detail?.typing); };
    window.addEventListener("chat-typing", onTyping as any);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("chat-typing", onTyping as any);
    };
  }, []);

  // SSE-based auto refresh with polling fallback
  useEffect(() => {
    let es: EventSource | null = null;
    let pollId: any = null;
    const startPoll = () => {
      // fallback polling
      const ms = Math.max(2000, Math.min(60000, (autoRefreshIntervalSec || 7) * 1000));
      pollId = setInterval(() => {
        if (autoRefreshEnabled && !isTypingRef.current && document.visibilityState === "visible") {
          loadMessages();
        }
      }, ms);
    };
    if (autoRefreshEnabled) {
      try {
        es = new EventSource("/api/messages/stream");
        es.onmessage = () => {
          if (!isTypingRef.current && document.visibilityState === "visible") {
            loadMessages();
          }
        };
        es.onerror = () => {
          try { es?.close(); } catch {}
          es = null;
          if (!pollId) startPoll();
        };
      } catch {
        startPoll();
      }
    } else {
      // not enabled, but keep a minimal manual refresh path via button only
    }
    // Also have a polling fallback if SSE never fires within interval
    if (!pollId && autoRefreshEnabled) startPoll();
    return () => {
      if (es) { try { es.close(); } catch {} }
      if (pollId) clearInterval(pollId);
    };
  }, [autoRefreshEnabled, autoRefreshIntervalSec]);
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex-1 min-h-0">
        <div className="h-full flex flex-col border border-[var(--border)] rounded-lg bg-[var(--surface-1)] shadow-subtle relative">
          {/* Top bar with brand mark and controls */}
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
              {/* Refresh chat button */}
              <button
                type="button"
                aria-label="Refresh chat"
                title="Refresh chat"
                disabled={refreshing}
                onClick={loadMessages}
                className="inline-flex items-center justify-center h-9 px-2 py-0 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] disabled:opacity-60 shadow-subtle"
              >
                {refreshing ? (
                  <span className="h-4 w-4 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin align-middle" aria-hidden="true" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 align-middle">
                    <path d="M3.75 12a8.25 8.25 0 0 1 14.06-5.836l1.04-1.04a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.28-.53V5.5a.75.75 0 0 1 1.5 0v1.222A9.75 9.75 0 1 0 12 21.75a.75.75 0 0 1 0-1.5A8.25 8.25 0 0 1 3.75 12Z" />
                  </svg>
                )}
              </button>
              {/* Clear chat button */}
              <button
                type="button"
                aria-label="Clear chat"
                title="Clear chat"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  try {
                    await clearMessages();
                  } finally {
                    // small delay to show feedback
                    setTimeout(() => setClearing(false), 200);
                  }
                }}
                className="inline-flex items-center justify-center h-9 px-2 py-0 rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)]/90 hover:bg-[var(--surface-2)] disabled:opacity-60 shadow-subtle"
              >
                {clearing ? (
                  <span className="h-4 w-4 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin align-middle" aria-hidden="true" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 align-middle">
                    <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h4.25a.75.75 0 0 1 0 1.5H18.6l-1.02 12.24A2.75 2.75 0 0 1 14.84 21H9.16a2.75 2.75 0 0 1-2.74-2.26L5.4 6.5H4.75a.75.75 0 0 1 0-1.5H9V3.75Zm1.5 1.25h3V5h-3V5zM7 6.5l1 12a1.25 1.25 0 0 0 1.25 1.12h5.5A1.25 1.25 0 0 0 16 18.5l1-12H7Z" />
                  </svg>
                )}
              </button>
              {/* Mobile-only hamburger */}
              <div className="md:hidden">
                <Sidebar variant="top" />
              </div>
            </div>
          </div>
          {/* Urgents & Today's Tasks dropdown just below the top header */}
          <div className="pb-0 border-b border-[var(--border)]">
            <details className="group rounded-md border border-red-500/20 bg-red-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--fg)]/90 bg-red-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40">
                <div className="flex flex-col">
                  <span className="font-medium group-open:block hidden">Urgents TODOs & Today’s Tasks</span>
                  <span className="text-[11px] text-[var(--fg)]/70 group-open:hidden block">{openUrgentCount} urgent • {todayCount} today</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4 transition-transform group-open:rotate-180 text-red-400"
                  aria-hidden="true"
                >
                  <path d="M12 15.5a.75.75 0 0 1-.53-.22l-6-6a.75.75 0 1 1 1.06-1.06L12 13.69l5.47-5.47a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-.53.22Z" />
                </svg>
              </summary>
              <div className="px-3 pt-3 pb-3 rounded-md bg-red-500/5 transition-all duration-300 ease-out overflow-hidden max-h-0 opacity-0 group-open:max-h-[2000px] group-open:opacity-100">
                <div className="mb-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUrgent((v) => !v)}
                    className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                  >
                    {showAddUrgent ? "Hide add" : "Add urgent task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUrgents((v) => !v)}
                    className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-medium text-[var(--fg)]/90 hover:bg-[var(--surface-2)]"
                  >
                    {editingUrgents ? "Done" : "Edit"}
                  </button>
                </div>
                {showAddUrgent && (
                  <div className="mb-3">
                    <UrgentTodoForm
                      onAdd={(t) => {
                        addUrgentTodo(t);
                        setShowAddUrgent(false);
                      }}
                    />
                  </div>
                )}
                {/* Scrollable area for lists */}
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  {/* Current urgent items */}
                  <UrgentTodoList editing={editingUrgents} />
                  {/* Today's tasks displayed below urgents (read-only, open items only) */}
                  <TodayTaskList />
                </div>
              </div>
            </details>
          </div>
          <div className="flex-1 min-h-0 relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-[var(--border)] border-t-[var(--fg)]/70 animate-spin" aria-label="Loading messages" />
              </div>
            ) : (
              <ChatWindow />
            )}
          </div>
          <div className="border-t border-[var(--border)] p-2 md:p-3">
            <ChatInput />
          </div>
        </div>
      </div>
    </div>
  );
}



