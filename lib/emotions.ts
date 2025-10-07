/**
 * lib/emotions.ts (≈70 LOC)
 * Emotion descriptor catalog for rendering emotion messages with emoji artwork.
 */

import type { StaticImageData } from "next/image";
import type { EmotionId, EmotionTone } from "@/lib/types";

import amazedImg from "@/images/emojis/amazed.png";
import happyImg from "@/images/emojis/happy.png";
import happy2Img from "@/images/emojis/happy2.png";
import mad1Img from "@/images/emojis/mad1.png";
import mad2Img from "@/images/emojis/mad2.png";
import mad3Img from "@/images/emojis/mad3.png";
import winkImg from "@/images/emojis/wink.png";
import sleepyImg from "@/images/emojis/sleepy.png";

export interface EmotionDescriptor {
  id: EmotionId;
  title: string;
  subtitle: string;
  prompt: string;
  tone: EmotionTone;
  image: StaticImageData;
}

export const emotions: EmotionDescriptor[] = [
  {
    id: "amazed",
    title: "Amazed",
    subtitle: "Everything feels like a pleasant surprise right now.",
    prompt: "Lock in this spark – what just amazed you?",
    tone: "positive",
    image: amazedImg,
  },
  {
    id: "happy",
    title: "Bright Happy",
    subtitle: "Light-hearted and steady. Energy is balanced and clear.",
    prompt: "Take a snapshot: what is fueling this good mood?",
    tone: "positive",
    image: happyImg,
  },
  {
    id: "joyful",
    title: "Joyful Surge",
    subtitle: "Joy is bubbling over – this is the golden moment.",
    prompt: "Anchor it. What could you do to keep this feeling going?",
    tone: "positive",
    image: happy2Img,
  },
  {
    id: "frustrated",
    title: "Frustrated",
    subtitle: "There is tension under the surface, ready to be redirected.",
    prompt: "Name the friction. What is the smallest pressure release you can make?",
    tone: "negative",
    image: mad1Img,
  },
  {
    id: "angry",
    title: "Agitated",
    subtitle: "Focus is scattered by anger – it wants an outlet.",
    prompt: "Pause. What is one productive action you can take next?",
    tone: "negative",
    image: mad2Img,
  },
  {
    id: "furious",
    title: "Furious",
    subtitle: "Intensity is spiking. You need a controlled release plan.",
    prompt: "Breathe first. Who or what can help you channel this safely?",
    tone: "negative",
    image: mad3Img,
  },
  {
    id: "playful",
    title: "Playful",
    subtitle: "A mischievous spark is ready for experimentation.",
    prompt: "Where can you add safe mischief or lightness right now?",
    tone: "positive",
    image: winkImg,
  },
  {
    id: "sleepy",
    title: "Sleepy",
    subtitle: "Energy is low and cozy; your body is inviting rest.",
    prompt: "What would help you settle into a calm rest quickly?",
    tone: "neutral",
    image: sleepyImg,
  },
];

export const emotionsById: Record<EmotionId, EmotionDescriptor> = emotions.reduce(
  (acc, emotion) => {
    acc[emotion.id] = emotion;
    return acc;
  },
  {} as Record<EmotionId, EmotionDescriptor>
);

export function getEmotionDescriptor(id?: string | null): EmotionDescriptor | null {
  if (!id) return null;
  const key = id as EmotionId;
  return emotionsById[key] ?? null;
}

export const emotionToneDecor: Record<EmotionTone, {
  cardBg: string;
  cardBadge: string;
  cardAccent: string;
  headerBg: string;
  headerBadge: string;
  headerAccent: string;
  iconRing: string;
}> = {
  positive: {
    cardBg: "bg-emerald-900/40 border-emerald-700/40",
    cardBadge: "bg-emerald-500/20 text-emerald-200",
    cardAccent: "text-emerald-200",
    headerBg: "bg-emerald-950/35 border-emerald-900/40",
    headerBadge: "bg-emerald-500/15 text-emerald-200",
    headerAccent: "text-emerald-200",
    iconRing: "ring-emerald-500/50",
  },
  neutral: {
    cardBg: "bg-slate-900/40 border-slate-700/40",
    cardBadge: "bg-slate-500/20 text-slate-200",
    cardAccent: "text-slate-200",
    headerBg: "bg-slate-950/35 border-slate-900/40",
    headerBadge: "bg-slate-500/15 text-slate-200",
    headerAccent: "text-slate-200",
    iconRing: "ring-slate-500/50",
  },
  negative: {
    cardBg: "bg-rose-950/40 border-rose-800/40",
    cardBadge: "bg-rose-500/20 text-rose-200",
    cardAccent: "text-rose-200",
    headerBg: "bg-rose-950/35 border-rose-900/40",
    headerBadge: "bg-rose-500/15 text-rose-200",
    headerAccent: "text-rose-200",
    iconRing: "ring-rose-500/50",
  },
};
