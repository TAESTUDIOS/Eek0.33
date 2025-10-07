// components/EmotionHeader.tsx
// Compact emotion banner that tags assistant replies with emotional context.

"use client";

import Image from "next/image";
import type { EmotionDescriptor } from "@/lib/emotions";
import { emotionToneDecor } from "@/lib/emotions";

function toneLabel(tone: EmotionDescriptor["tone"]): string {
  if (tone === "positive") return "Elevated";
  if (tone === "negative") return "Hot";
  return "Steady";
}

type Props = {
  emotion: EmotionDescriptor;
};

export default function EmotionHeader({ emotion }: Props) {
  const decor = emotionToneDecor[emotion.tone];
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2 ${decor.headerBg}`}
      aria-label={`${emotion.title} emotion header`}
    >
      <div className={`relative h-16 w-16 shrink-0 rounded-full bg-black/10`}>
        <Image
          src={emotion.image}
          alt={`${emotion.title} emoji`}
          fill
          priority={false}
          sizes="64px"
          className="object-contain"
        />
      </div>
      <div className="min-w-0 flex-1 text-[var(--fg)]">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${decor.headerBadge}`}>
            {toneLabel(emotion.tone)}
          </span>
          <span className={`${decor.headerAccent}`}>Emotion</span>
        </div>
        <div className="mt-1 text-sm font-semibold text-white leading-tight">
          {emotion.title}
        </div>
        <p className="mt-0.5 text-xs text-white/70 leading-snug">
          {emotion.subtitle}
        </p>
      </div>
    </div>
  );
}
