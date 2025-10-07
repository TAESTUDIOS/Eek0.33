/**
 * components/EmotionLogGraph.tsx (≈95 LOC)
 * Tiny bar graph summarising emotion logs per day.
 */

"use client";

import { useMemo } from "react";
import type { EmotionLog, EmotionTone } from "@/lib/types";
import { getEmotionDescriptor } from "@/lib/emotions";

const toneFill: Record<EmotionTone, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-slate-400",
  negative: "bg-rose-400",
};

const toneLabel: Record<EmotionTone, string> = {
  positive: "Elevated",
  neutral: "Steady",
  negative: "Hot",
};

function formatDateLabel(input: string): string {
  const [y, m, d] = input.split("-").map((n) => Number(n));
  if (!y || !m || !d) return input;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type GraphPoint = {
  day: string;
  total: number;
  toneCounts: Partial<Record<EmotionTone, number>>;
};

type Props = {
  logs: EmotionLog[];
  maxDays?: number;
};

export default function EmotionLogGraph({ logs, maxDays = 14 }: Props) {
  const data = useMemo<GraphPoint[]>(() => {
    const grouped = new Map<string, GraphPoint>();
    logs.forEach((log) => {
      const day = new Date(log.recordedAt).toISOString().slice(0, 10);
      const entry = grouped.get(day) ?? { day, total: 0, toneCounts: {} };
      entry.total += 1;
      const descriptor = getEmotionDescriptor(log.emotionId);
      const tone = descriptor?.tone ?? log.emotionTone ?? "neutral";
      entry.toneCounts[tone] = (entry.toneCounts[tone] ?? 0) + 1;
      grouped.set(day, entry);
    });
    return Array.from(grouped.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-maxDays);
  }, [logs, maxDays]);

  const maxValue = useMemo(() => data.reduce((acc, item) => Math.max(acc, item.total), 0) || 1, [data]);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 px-4 py-6 text-sm text-[var(--fg)]/60">
        No emotion entries yet. Log one to see your trend.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 p-4">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--fg)]">Emotion streak</h2>
          <p className="text-xs text-[var(--fg)]/60">Entries per day (last {data.length} days)</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-[var(--fg)]/60">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> {toneLabel.positive}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> {toneLabel.neutral}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> {toneLabel.negative}
          </span>
        </div>
      </header>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(32px,1fr))] items-end gap-2">
        {data.map((point) => (
          <div key={point.day} className="flex flex-col items-center gap-2">
            <div className="relative flex h-32 w-full min-w-[24px] flex-col justify-end overflow-hidden rounded-md bg-[var(--surface-2)]/40">
              {(["positive", "neutral", "negative"] as EmotionTone[]).map((toneKey) => {
                const count = point.toneCounts[toneKey] ?? 0;
                if (count === 0) return null;
                const heightPct = (count / maxValue) * 100;
                return (
                  <div
                    key={`${point.day}-${toneKey}`}
                    className={`${toneFill[toneKey]} transition-all duration-500 ease-out`}
                    style={{ height: `${heightPct}%` }}
                    aria-label={`${toneLabel[toneKey]} count ${count}`}
                  />
                );
              })}
            </div>
            <div className="text-[10px] text-[var(--fg)]/60">{formatDateLabel(point.day)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
