/**
 * components/EmotionRecorder.tsx (≈130 LOC)
 * Inline ritual card that lets the user log their current emotion via emoji buttons.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { emotions, emotionToneDecor } from "@/lib/emotions";
import { useAppStore } from "@/lib/store";
import type { EmotionId, EmotionTone } from "@/lib/types";

const toneBadgeLabel: Record<EmotionTone, string> = {
  positive: "Elevated",
  neutral: "Steady",
  negative: "Hot",
};

type Props = {
  title?: string;
  subtitle?: string;
  onRecorded?: (emotionId: EmotionId) => void | Promise<void>;
  initialEmotionId?: EmotionId | null;
  hideHeader?: boolean;
  hideLink?: boolean;
  plain?: boolean; // when true, no outer border/background (for embedding in dropdowns)
};

export default function EmotionRecorder({
  title = "How are you feeling right now?",
  subtitle = "Tap an emoji to capture it in your emotions dashboard.",
  onRecorded,
  initialEmotionId = null,
  hideHeader = false,
  hideLink = false,
  plain = false,
}: Props) {
  const { recordEmotion, loadEmotionLogs } = useAppStore();
  const [savingId, setSavingId] = useState<EmotionId | null>(null);
  const [savedId, setSavedId] = useState<EmotionId | null>(initialEmotionId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedId(initialEmotionId);
  }, [initialEmotionId]);

  const disabledIds = useMemo(() => {
    if (!savingId) return new Set<string>();
    const set = new Set<string>();
    emotions.forEach((emotion) => {
      if (savingId !== emotion.id) {
        set.add(emotion.id);
      }
    });
    return set;
  }, [savingId]);

  async function handleSelect(emotionId: EmotionId) {
    if (savingId) return;
    setSavingId(emotionId);
    setError(null);
    const ok = await recordEmotion(emotionId);
    setSavingId(null);
    if (!ok) {
      setError("Logging failed. Please try again.");
      return;
    }
    setSavedId(emotionId);
    try {
      await loadEmotionLogs();
    } catch {
      // noop – UI already optimistic.
    }
    if (onRecorded) await onRecorded(emotionId);
  }

  return (
    <section className={`rounded-xl shadow-elevated overflow-hidden ${plain ? "" : "border border-[var(--border)] bg-[var(--surface-1)]/85"}`}>
      {!hideHeader && (
        <header className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--fg)]">{title}</h2>
          <p className="mt-1 text-xs text-[var(--fg)]/65">{subtitle}</p>
        </header>
      )}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {emotions.map((emotion) => {
            const toneDecor = emotionToneDecor[emotion.tone];
            const isSaving = savingId === emotion.id;
            const isSelected = savedId === emotion.id;
            const disabled = disabledIds.has(emotion.id);
            return (
              <button
                key={emotion.id}
                type="button"
                onClick={() => handleSelect(emotion.id)}
                disabled={disabled}
                className={`group flex flex-col items-center gap-2 rounded-lg border px-3 py-3 text-center transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
                  toneDecor.cardBg
                } ${isSelected ? "ring-2 ring-emerald-400" : ""} ${
                  disabled && !isSelected ? "opacity-60" : "hover:-translate-y-0.5"
                }`}
                aria-label={`Log emotion ${emotion.title}`}
              >
                <div className="relative h-14 w-14 shrink-0">
                  <Image
                    src={emotion.image}
                    alt={`${emotion.title} emoji`}
                    fill
                    sizes="64px"
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <div className="text-xs font-medium text-white leading-tight">
                  {emotion.title}
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneDecor.cardBadge}`}>
                  {toneBadgeLabel[emotion.tone]}
                </span>
                {isSaving ? (
                  <span className="text-[10px] text-white/80">Saving…</span>
                ) : null}
                {isSelected ? (
                  <span className="text-[10px] text-emerald-200">Logged!</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[var(--fg)]/65">
          <div>
            {error ? (
              <span className="text-rose-300">{error}</span>
            ) : savedId ? (
              <span className="text-emerald-300">Emotion saved to your log.</span>
            ) : (
              <span>Select the emoji that best matches your current state.</span>
            )}
          </div>
          {!hideLink && (
            <Link
              href="/emotions"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--fg)]/80 hover:bg-[var(--surface-2)]"
            >
              View emotions page
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 10a.75.75 0 0 1 .75-.75h7.638l-3.22-3.22a.75.75 0 1 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H5.25A.75.75 0 0 1 4.5 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
