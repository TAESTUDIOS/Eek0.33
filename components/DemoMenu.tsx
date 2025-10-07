// components/DemoMenu.tsx
// Small demo dropdown to inject sample content into the chat: grid (urgent todos),
// list (today's tasks), and a button set.

"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";
import { emotions } from "@/lib/emotions";

type Props = { label?: string; up?: boolean; variant?: "button" | "menuitem"; align?: "left" | "right" };

export default function DemoMenu({ label = "Demo", up = false, variant = "button", align = "right" }: Props) {
  const [open, setOpen] = useState(false);
  const { addMessage } = useAppStore();

  function addUrgentGrid() {
    addMessage({
      id: uid("m"),
      role: "assistant",
      text: "",
      metadata: { demo: "urgentGrid" },
      timestamp: Date.now(),
    });
    setOpen(false);
  }

  function addTodayList() {
    addMessage({
      id: uid("m"),
      role: "assistant",
      text: "",
      metadata: { demo: "todayList" },
      timestamp: Date.now(),
    });
    setOpen(false);
  }

  function addButtonSet() {
    addMessage({
      id: uid("m"),
      role: "ritual",
      text: "Quick actions:",
      buttons: ["Done", "Snooze 10m", "Open"],
      timestamp: Date.now(),
    });
    setOpen(false);
  }

  function addCountdown() {
    addMessage({
      id: uid("m"),
      role: "assistant",
      text: "",
      metadata: { demo: "countdown60", startedAt: Date.now() },
      timestamp: Date.now(),
    });
    setOpen(false);
  }

  function addQuestionInput() {
    addMessage({
      id: uid("m"),
      role: "assistant",
      text: "",
      metadata: { demo: "questionInput" },
      timestamp: Date.now(),
    });
    setOpen(false);
  }

  function addEmotionMessage(emotionId: string) {
    const descriptor = emotions.find((emo) => emo.id === emotionId);
    if (!descriptor) return;
    addMessage({
      id: uid("m"),
      role: "assistant",
      text: descriptor.prompt,
      timestamp: Date.now(),
      emotionId: descriptor.id,
      emotionTone: descriptor.tone,
      metadata: { demo: "emotionCard" },
    });
    setOpen(false);
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        className={
          variant === "menuitem"
            ? "w-full px-3 py-2 rounded-md transition-colors hover:bg-[var(--surface-2)] flex items-center justify-between text-orange-400"
            : "inline-flex h-9 items-center gap-2 rounded-md px-3 py-0 border border-[var(--border)] bg-[var(--surface-1)] text-sm leading-none text-[var(--fg)]/90 hover:bg-[var(--surface-2)] shadow-subtle"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={variant === "menuitem" ? "h-4 w-4 shrink-0 align-middle text-orange-400" : "h-4 w-4 shrink-0 align-middle"}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 0 1 1.08 1.04l-4.25 4.25a.75.75 0 0 1-1.06 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Demo options"
          className={
            `absolute ${align === "left" ? "left-0" : "right-0"} w-56 rounded-md border border-[var(--border)] bg-[var(--surface-1)] shadow-elevated p-1 z-20 ` +
            (up ? "bottom-full mb-2" : "mt-2")
          }
        >
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={addUrgentGrid}
            role="menuitem"
          >
            Grid: Urgent todos
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={addTodayList}
            role="menuitem"
          >
            List: Today's tasks
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={addCountdown}
            role="menuitem"
          >
            Timer: 1-minute countdown
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={addQuestionInput}
            role="menuitem"
          >
            Question input
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
            onClick={addButtonSet}
            role="menuitem"
          >
            Button set
          </button>
          <div className="my-1 border-t border-[var(--border)]" />
          <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-[var(--fg)]/50">Emotion check-in</div>
          {emotions.map((emotion) => (
            <button
              key={emotion.id}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-[var(--surface-2)]"
              onClick={() => addEmotionMessage(emotion.id)}
              role="menuitem"
            >
              {emotion.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
