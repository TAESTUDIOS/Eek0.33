// app/emotions/page.tsx
// Emotions dashboard: recorder, trend graph, and log list.

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import EmotionRecorder from "@/components/EmotionRecorder";
import EmotionLogGraph from "@/components/EmotionLogGraph";
import { useAppStore } from "@/lib/store";
import { emotionsById, getEmotionDescriptor, emotionToneDecor } from "@/lib/emotions";
import type { EmotionLog } from "@/lib/types";

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export default function EmotionsPage() {
  const { emotionLogs, loadEmotionLogs } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const ok = await loadEmotionLogs();
        if (!ok && !ignore) setError("Unable to load emotion history.");
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Unable to load emotion history.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    run();
    return () => {
      ignore = true;
    };
  }, [loadEmotionLogs]);

  const sortedLogs = useMemo<EmotionLog[]>(() => {
    return [...emotionLogs].sort((a, b) => b.recordedAt - a.recordedAt);
  }, [emotionLogs]);

  const latestEmotionId = sortedLogs.length > 0 ? sortedLogs[0].emotionId : null;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pr-2">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-[var(--fg)]">Emotions</h1>
        <p className="text-sm text-[var(--fg)]/70">
          Log how you feel and review trends at a glance. Only the last 200 entries are shown.
        </p>
      </header>

      {/* Inline recorder as a dropdown on this page */}
      <section className="rounded-md border border-red-500/20 bg-red-500/5">
        <details className="group rounded-md">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[var(--fg)]/90">
            <span>How are you feeling right now?</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 transition-transform group-open:rotate-180 text-red-400" aria-hidden="true">
              <path d="M12 15.5a.75.75 0 0 1-.53-.22l-6-6a.75.75 0 1 1 1.06-1.06L12 13.69l5.47-5.47a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-.53.22Z" />
            </svg>
          </summary>
          <div className="px-2 pb-2 transition-all duration-300 ease-out overflow-hidden max-h-0 opacity-0 group-open:max-h-[2000px] group-open:opacity-100">
            <EmotionRecorder
              initialEmotionId={latestEmotionId ?? null}
              onRecorded={async () => { await loadEmotionLogs(); }}
              hideHeader
              hideLink
              plain
            />
          </div>
        </details>
      </section>

      <EmotionLogGraph logs={sortedLogs} />

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/80 shadow-subtle">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--fg)]">History</h2>
            <p className="text-xs text-[var(--fg)]/60">Newest to oldest</p>
          </div>
          <button
            type="button"
            onClick={() => loadEmotionLogs()}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--fg)]/80 hover:bg-[var(--surface-2)]"
          >
            Refresh
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M2.343 10.343a6 6 0 0 1 10.96-2.469H10.5a.75.75 0 0 0 0 1.5h4.25a.75.75 0 0 0 .75-.75V4.375a.75.75 0 0 0-1.5 0v1.66a7.5 7.5 0 1 0 1.64 6.03.75.75 0 1 0-1.45-.35 6 6 0 1 1-11.85-1.372Z" />
            </svg>
          </button>
        </header>

        {loading ? (
          <div className="px-4 py-6 text-sm text-[var(--fg)]/60">Loading…</div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-rose-300">{error}</div>
        ) : sortedLogs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[var(--fg)]/60">No emotion entries yet. Log how you feel above.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {sortedLogs.map((log) => {
              const descriptor = emotionsById[log.emotionId];
              const tone = descriptor?.tone ?? log.emotionTone ?? "neutral";
              const decor = emotionToneDecor[tone];
              return (
                <li key={log.id} className="flex items-start gap-3 px-4 py-3 text-sm text-[var(--fg)]">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--border)]">
                    {descriptor?.image ? (
                      <Image src={descriptor.image} alt={`${descriptor.title} emoji`} fill sizes="40px" className="object-contain" />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[var(--fg)]">{descriptor?.title ?? log.emotionId}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wide ${decor?.headerBadge ?? "bg-slate-500/20 text-slate-200"}`}>
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--fg)]/60 mt-1">{descriptor?.prompt}</div>
                  </div>
                  <div className="text-xs text-[var(--fg)]/50 whitespace-nowrap">{formatDateTime(log.recordedAt)}</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
