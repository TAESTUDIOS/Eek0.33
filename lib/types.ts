/**
 * lib/types.ts
 * Core TypeScript interfaces for PSA.
 */

export type Role = "user" | "assistant" | "system" | "ritual";

export type EmotionTone = "positive" | "neutral" | "negative";

export type EmotionId =
  | "amazed"
  | "happy"
  | "joyful"
  | "frustrated"
  | "angry"
  | "furious"
  | "playful"
  | "sleepy";

export interface EmotionLog {
  id: string;
  emotionId: EmotionId;
  emotionTone: EmotionTone;
  recordedAt: number; // epoch ms
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number; // epoch ms
  ritualId?: string;
  buttons?: string[]; // optional inline buttons for ritual messages
  metadata?: Record<string, unknown>;
  emotionId?: EmotionId;
  emotionTone?: EmotionTone;
  saved?: boolean; // persisted saved-state in Neon
}

export type TriggerType = "schedule" | "chat";

export interface RitualTrigger {
  type: TriggerType;
  time?: string; // HH:mm (for schedule)
  repeat?: "daily" | "weekly" | "monthly" | "none";
  chatKeyword?: string; // e.g., "/check"
}

export interface RitualConfig {
  id: string;
  name: string;
  webhook: string; // n8n webhook URL
  trigger: RitualTrigger;
  buttons?: string[];
  active?: boolean;
}

export interface SavedMessage {
  id: string;
  text: string;
  createdAt: number;
  tags?: string[];
}

export type Tone = "Gentle" | "Strict" | "Playful" | "Neutral";

export type Theme = "light" | "dark";

// UI density preferences
export type Density = "comfortable" | "compact" | "ultra";

// Server-stored singleton settings
export interface Settings {
  tone: Tone;
  fallbackWebhook: string;
  theme: Theme;
  notificationsWebhook?: string;
  // Sleeping hours configuration for schedule grid
  hideSleepingHours: boolean;
  sleepStartHour: number; // 0-23
  sleepEndHour: number; // 0-23
  // UI density (preferred)
  density?: Density;
  // Back-compat: previous boolean compact flag (may be present from older schema)
  compactMode?: boolean;
  // Auto refresh settings
  autoRefreshEnabled?: boolean;
  autoRefreshIntervalSec?: number;
  // Preferred display name for the single user
  name?: string;
  // Freeform user context for personalization
  profileNotes?: string;
}

// Appointment items for day scheduling
export interface Appointment {
  id: string;
  title: string;
  // ISO date for the day, e.g., "2025-09-16"
  date: string;
  // Start time in HH:mm (24h)
  start: string;
  // Duration in minutes
  durationMin: number;
  notes?: string;
  // Reminder flags
  remind1h?: boolean;
  remind30m?: boolean;
  remind10m?: boolean;
  remindAtStart?: boolean;
}

// Urgent todo items (client-side managed)
export type UrgentPriority = "high" | "medium" | "low";

export interface UrgentTodo {
  id: string;
  title: string;
  priority: UrgentPriority;
  done: boolean;
  dueAt?: number; // epoch ms
  notes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// Simple tasks for "Today's Tasks" section
export interface TodayTask {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

// Notes and folder hierarchy
export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null; // null = root level
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level
  createdAt: number;
  updatedAt: number;
}
