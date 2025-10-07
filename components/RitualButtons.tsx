// components/RitualButtons.tsx
// Inline buttons for ritual messages; posts actions to webhook or local mock.

"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { uid } from "@/lib/id";

type Props = {
  ritualId?: string;
  buttons: string[];
  onActionStart?: () => void;
};

export default function RitualButtons({ ritualId, buttons, onActionStart }: Props) {
  const { rituals, addMessage } = useAppStore();
  const [loading, setLoading] = useState<string | null>(null);
  const ritual = rituals.find((r) => r.id === ritualId);

  async function onClick(action: string) {
    if (!ritualId) return;
    try { onActionStart?.(); } catch {}
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('psa:close-menus'));
      }
    } catch {}
    setLoading(action);
    try {
      // Always use server proxy to avoid CORS and centralize webhook invocation
      const res = await fetch("/api/rituals/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ritualId, action, timestamp: Date.now() }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Action failed");
      // If server returns a list of messages, inject them verbatim
      if (Array.isArray(data.messages)) {
        for (const m of data.messages) {
          addMessage(m);
          try {
            await fetch("/api/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...m, echo: false }),
            });
          } catch {}
        }
      } else {
        const ts = Date.now();
        const textRes = data.text ?? "(no text)";
        const buttonsRes: string[] = data.buttons ?? (ritual?.buttons ?? []);
        addMessage({ id: uid("m"), role: "ritual", text: textRes, buttons: buttonsRes, ritualId, timestamp: ts });
        // Persist ritual follow-up (no echo)
        try {
          await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "ritual", text: textRes, ritualId, buttons: buttonsRes, timestamp: ts, echo: false }),
          });
        } catch {}
      }
    } catch (e) {
      addMessage({ id: uid("m"), role: "assistant", text: "Action failed.", timestamp: Date.now() });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((b) => (
        <button
          key={b}
          onClick={() => onClick(b)}
          disabled={loading === b}
          className="px-2.5 py-1 text-xs rounded-md border border-[var(--border)] bg-[var(--surface-1)] text-[var(--fg)] hover:bg-[var(--surface-2)] aria-[busy=true]:opacity-60 disabled:opacity-60 shadow-subtle"
          aria-label={`Ritual action ${b}`}
          aria-busy={loading === b}
        >
          {loading === b ? "..." : b}
        </button>
      ))}
    </div>
  );
}

