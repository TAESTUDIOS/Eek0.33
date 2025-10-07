// components/EmotionCard.tsx
// Renders a rich emotion card with emoji artwork and context prompt.

"use client";

import Image from "next/image";
import type { EmotionDescriptor } from "@/lib/emotions";
import type { EmotionTone } from "@/lib/types";

const toneDecor: Record<EmotionTone, { bg: string; badge: string; accent: string }> = {
  positive: {
    bg: "bg-emerald-900/40 border-emerald-700/40",
    badge: "bg-emerald-500/20 text-emerald-200",
    accent: "text-emerald-200",
  },
  neutral: {
    bg: "bg-slate-900/40 border-slate-700/40",
    badge: "bg-slate-500/20 text-slate-200",
    accent: "text-slate-200",
  },
  negative: {
    bg: "bg-rose-950/40 border-rose-800/40",
    badge: "bg-rose-500/20 text-rose-200",
    accent: "text-rose-200",
  },
};

type Props = {
  emotion: EmotionDescriptor;
};

export default function EmotionCard({ emotion }: Props) {
  const decor = toneDecor[emotion.tone];
  return (
    <section
      aria-label={`${emotion.title} emotion snapshot`}
      className={`rounded-xl border p-4 md:p-5 shadow-elevated flex gap-4 md:gap-5 items-start ${decor.bg}`}
    >
      <div className="relative h-16 w-16 shrink-0 md:h-20 md:w-20">
        <Image
          src={emotion.image}
          alt={`${emotion.title} emoji`}
          fill
          priority={false}
          sizes="80px"
          className="object-contain drop-shadow-lg"
        />
      </div>
      <div className="min-w-0 flex-1 text-[var(--fg)]">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center h-6 rounded-full px-3 text-xs font-medium ${decor.badge}`}>
            {emotion.tone === "positive" ? "Elevated" : emotion.tone === "neutral" ? "Steady" : "Hot"}
          </span>
          <span className={`text-xs uppercase tracking-wide ${decor.accent}`}>Emotion</span>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-white leading-tight">{emotion.title}</h3>
        <p className="mt-1 text-sm text-white/80 leading-snug">{emotion.subtitle}</p>
        <div className="mt-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm text-white/90">
          <span className="text-white/60 text-xs uppercase tracking-wide">Prompt</span>
          <div className="mt-1">{emotion.prompt}</div>
        </div>
      </div>
    </section>
  );
}
