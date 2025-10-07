/**
 * lib/store.ts
 * Zustand store for PSA: ephemeral messages (max 100), rituals, saved messages, and tone.
 */

import { create } from "zustand";
import { uid } from "@/lib/id";
import { getEmotionDescriptor } from "@/lib/emotions";
import type {
  EmotionId,
  EmotionLog,
  EmotionTone,
  Message,
  RitualConfig,
  SavedMessage,
  Tone,
  Theme,
  Settings,
  Density,
  UrgentTodo,
  TodayTask,
  Note,
  Folder,
} from "@/lib/types";

// Small dev mocks so UI isn't empty on first load
const now = Date.now();
const devMessages: Message[] = [
  { id: "m1", role: "assistant", text: "Welcome to PSA. Type /start morning or say hi!", timestamp: now - 5000 },
  { id: "m2", role: "user", text: "hi", timestamp: now - 4000 },
  { id: "m3", role: "ritual", text: "Morning check-in: How are you feeling?", buttons: ["Good", "Meh", "Low"], ritualId: "morning", timestamp: now - 3000 },
];

const devRituals: RitualConfig[] = [
  {
    id: "morning",
    name: "Morning Check-in",
    webhook: "",
    trigger: { type: "schedule", time: "08:00", repeat: "daily" },
    buttons: ["Good", "Meh", "Low"],
    active: true,
  },
  {
    id: "evening",
    name: "Evening Wind-down",
    webhook: "",
    trigger: { type: "chat", chatKeyword: "/evening" },
    buttons: ["Done", "Snooze"],
    active: true,
  },
  {
    id: "plans",
    name: "Plans Ritual",
    webhook: "",
    trigger: { type: "chat", chatKeyword: "/plans" },
    buttons: [],
    active: true,
  },
  {
    id: "impulse_control_v1",
    name: "Impulse Control v1",
    webhook: "",
    trigger: { type: "chat", chatKeyword: "/impulse" },
    buttons: [],
    active: true,
  },
];

const devSaved: SavedMessage[] = [
  { id: "s1", text: "Breathing ritual felt great.", createdAt: now - 10000 },
];

export type AppState = {
  messages: Message[];
  rituals: RitualConfig[];
  saved: SavedMessage[];
  tone: Tone;
  name: string;
  profileNotes: string;
  fallbackWebhook: string; // optional fallback n8n webhook URL
  theme: Theme;
  notificationsWebhook?: string; // optional notifications webhook URL
  // sleeping hours config
  hideSleepingHours: boolean;
  sleepStartHour: number; // 0-23
  sleepEndHour: number; // 0-23
  // ui density
  compactMode: boolean; // back-compat
  density: Density;     // preferred
  // auto refresh settings
  autoRefreshEnabled: boolean;
  autoRefreshIntervalSec: number;
  emotionLogs: EmotionLog[];
  // urgent todos (client-managed)
  urgentTodos: UrgentTodo[];
  todayTasks: TodayTask[];
  // session management
  currentSessionId: string;
  // settings helpers
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  // session helpers
  refreshSessionId: () => string;
  addMessage: (m: Message) => void;
  setMessages: (items: Message[]) => void;
  saveMessage: (id: string) => void;
  deleteSaved: (id: string) => void;
  setSaved: (items: SavedMessage[]) => void;
  setRituals: (items: RitualConfig[]) => void;
  addRitual: (r: RitualConfig) => void;
  updateRitual: (id: string, patch: Partial<RitualConfig>) => void;
  deleteRitual: (id: string) => void;
  clearMessages: () => Promise<void>;
  setTone: (t: Tone) => void;
  setName: (v: string) => void;
  setProfileNotes: (v: string) => void;
  setFallbackWebhook: (url: string) => void;
  setTheme: (t: Theme) => void;
  setNotificationsWebhook: (url: string) => void;
  setCompactMode: (v: boolean) => void;
  setDensity: (d: Density) => void;
  setHideSleepingHours: (v: boolean) => void;
  setSleepStartHour: (h: number) => void;
  setSleepEndHour: (h: number) => void;
  setAutoRefreshEnabled: (v: boolean) => void;
  setAutoRefreshIntervalSec: (s: number) => void;
  setEmotionLogs: (items: EmotionLog[]) => void;
  loadEmotionLogs: () => Promise<boolean>;
  recordEmotion: (emotionId: EmotionId) => Promise<boolean>;
  // urgent todos helpers
  loadUrgentTodos: () => void;
  addUrgentTodo: (t: UrgentTodo) => void;
  updateUrgentTodo: (id: string, patch: Partial<UrgentTodo>) => void;
  toggleUrgentDone: (id: string) => void;
  deleteUrgentTodo: (id: string) => void;
  clearCompletedUrgent: () => void;
  // today's tasks helpers
  loadTodayTasks: () => void;
  addTodayTask: (t: TodayTask) => void;
  updateTodayTask: (id: string, patch: Partial<TodayTask>) => void;
  toggleTodayDone: (id: string) => void;
  deleteTodayTask: (id: string) => void;
  clearCompletedToday: () => void;
};

const urgentKey = "psa.urgentTodos";
const todayKey = "psa.todayTasks";

function readUrgentTodos(): UrgentTodo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(urgentKey);
    if (!raw) return [];
    const arr = JSON.parse(raw) as UrgentTodo[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeUrgentTodos(items: UrgentTodo[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(urgentKey, JSON.stringify(items));
  } catch {}
}

function readTodayTasks(): TodayTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(todayKey);
    if (!raw) return [];
    const arr = JSON.parse(raw) as TodayTask[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeTodayTasks(items: TodayTask[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(todayKey, JSON.stringify(items));
  } catch {}
}

export const useAppStore = create<AppState>((set, get) => ({
  messages: devMessages,
  rituals: devRituals,
  saved: devSaved,
  tone: "Gentle",
  name: "",
  profileNotes: "",
  fallbackWebhook: "",
  theme: "dark",
  notificationsWebhook: "",
  hideSleepingHours: false,
  sleepStartHour: 22,
  sleepEndHour: 8,
  compactMode: false,
  density: "comfortable",
  // auto refresh defaults
  autoRefreshEnabled: true,
  autoRefreshIntervalSec: 7,
  emotionLogs: [],
  urgentTodos: [],
  todayTasks: [],
  currentSessionId: uid("wd"),
  
  // Load settings from server (Neon). If endpoint fails, keep current defaults.
  loadSettings: async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok && data?.settings) {
        const s: Settings = data.settings;
        set({
          tone: s.tone,
          name: s.name || "",
          profileNotes: s.profileNotes || "",
          fallbackWebhook: s.fallbackWebhook,
          notificationsWebhook: s.notificationsWebhook,
          theme: s.theme,
          hideSleepingHours: !!s.hideSleepingHours,
          sleepStartHour: Math.max(0, Math.min(23, Number(s.sleepStartHour ?? 22))),
          sleepEndHour: Math.max(0, Math.min(23, Number(s.sleepEndHour ?? 8))),
          compactMode: !!s.compactMode,
          density: (s.density as Density) || (s.compactMode ? "compact" : "comfortable"),
          autoRefreshEnabled: s.autoRefreshEnabled ?? true,
          autoRefreshIntervalSec: Math.max(2, Math.min(60, Number(s.autoRefreshIntervalSec ?? 7))),
        });
      }
    } catch {
      // no-op in dev or offline
    }
  },

  // Save current settings to server explicitly
  saveSettings: async () => {
    try {
      const { tone, name, profileNotes, fallbackWebhook, notificationsWebhook, theme, hideSleepingHours, sleepStartHour, sleepEndHour, compactMode, density, autoRefreshEnabled, autoRefreshIntervalSec } = get();
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, name, profileNotes, fallbackWebhook, notificationsWebhook, theme, hideSleepingHours, sleepStartHour, sleepEndHour, compactMode, density, autoRefreshEnabled, autoRefreshIntervalSec }),
      });
      const data = await res.json().catch(() => ({} as any));
      return !!data?.ok;
    } catch {
      return false;
    }
  },

  addMessage: (m) => {
    const existing = get().messages;
    const arr = [...existing, m];
    // Keep all locally-sticky question cards, trim others to last 100
    const isStickyLocal = (x: any) => !!(x?.metadata?.demo === 'questionSave' || x?.metadata?.demo === 'questionInput');
    const sticky = arr.filter(isStickyLocal);
    const nonSticky = arr.filter((x) => !isStickyLocal(x));
    const trimmedNonSticky = nonSticky.slice(Math.max(0, nonSticky.length - 100));
    const combined = [...sticky, ...trimmedNonSticky];
    combined.sort((a: any, b: any) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));
    set({ messages: combined });
  },

  // Trust server to return sticky + last 100 non-sticky; keep as-is
  setMessages: (items) => set({ messages: items }),

  saveMessage: (id) => {
    const msg = get().messages.find((x) => x.id === id);
    if (!msg) return;
    const saved: SavedMessage = {
      id: `sv_${id}`,
      text: msg.text,
      createdAt: Date.now(),
    };
    // Update local saved collection
    set({ saved: [saved, ...get().saved] });
    // Optimistically mark message as saved locally
    set({ messages: get().messages.map((m) => (m.id === id ? { ...m, saved: true } : m)) });
    // Fire-and-forget persist call to API (no secret on client)
    fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saved),
    }).catch(() => {});
    // Also mark the message row as saved in Neon
    fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, saved: true }),
    }).catch(() => {});
  },

  deleteSaved: (id) => set({ saved: get().saved.filter((s) => s.id !== id) }),
  setSaved: (items) => set({ saved: items }),
  setRituals: (items) => set({ rituals: items }),

  addRitual: (r) => {
    set({ rituals: [r, ...get().rituals] });
    fetch("/api/rituals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    }).catch(() => {});
  },

  updateRitual: (id, patch) => {
    const next = get().rituals.map((r) => (r.id === id ? { ...r, ...patch } : r));
    set({ rituals: next });
    const full = next.find((r) => r.id === id);
    if (full) {
      fetch("/api/rituals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(full),
      }).catch(() => {});
    }
  },

  deleteRitual: (id) => {
    set({ rituals: get().rituals.filter((r) => r.id !== id) });
    fetch(`/api/rituals?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  },

  clearMessages: async () => {
    try {
      await fetch("/api/messages", { method: "DELETE" });
    } catch {}
    // Generate new session ID when clearing chat
    const newSessionId = uid("wd");
    set({ messages: [], currentSessionId: newSessionId });
  },

  refreshSessionId: () => {
    const newSessionId = uid("wd");
    set({ currentSessionId: newSessionId });
    return newSessionId;
  },

  setTone: (t) => set({ tone: t }),
  setName: (v: string) => set({ name: v }),
  setProfileNotes: (v: string) => set({ profileNotes: v }),
  setFallbackWebhook: (url: string) => set({ fallbackWebhook: url }),
  setTheme: (t) => set({ theme: t }),
  setNotificationsWebhook: (url: string) => set({ notificationsWebhook: url }),
  setCompactMode: (v: boolean) => set({ compactMode: !!v }),
  setDensity: (d: Density) => set({ density: d }),
  setHideSleepingHours: (v: boolean) => set({ hideSleepingHours: !!v }),
  setSleepStartHour: (h: number) => set({ sleepStartHour: Math.max(0, Math.min(23, Math.floor(h || 0))) }),
  setSleepEndHour: (h: number) => set({ sleepEndHour: Math.max(0, Math.min(23, Math.floor(h || 0))) }),
  setAutoRefreshEnabled: (v: boolean) => set({ autoRefreshEnabled: !!v }),
  setAutoRefreshIntervalSec: (s: number) => set({ autoRefreshIntervalSec: Math.max(2, Math.min(60, Math.floor(s || 7))) }),

  setEmotionLogs: (items) => set({ emotionLogs: items }),
  loadEmotionLogs: async () => {
    try {
      const res = await fetch("/api/emotions", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      const rawLogs = Array.isArray(data?.logs) ? (data.logs as Array<Record<string, unknown>>) : [];
      const items: EmotionLog[] = rawLogs
        .map((raw) => {
          const rawId = typeof raw.id === "string" ? raw.id : String(raw.id ?? "");
          const rawEmotionId = typeof raw.emotionId === "string" ? (raw.emotionId as EmotionId) : (undefined as EmotionId | undefined);
          const descriptor = getEmotionDescriptor(rawEmotionId);
          const toneCandidate: EmotionTone =
            (typeof raw.emotionTone === "string" ? (raw.emotionTone as EmotionTone) : undefined) ??
            descriptor?.tone ??
            "neutral";
          const recordedAt = Number(raw.recordedAt) || Date.now();
          return rawEmotionId
            ? {
                id: rawId || uid("emo"),
                emotionId: rawEmotionId,
                emotionTone: toneCandidate,
                recordedAt,
              }
            : null;
        })
        .filter((log): log is EmotionLog => log !== null);
      set({ emotionLogs: items });
      return true;
    } catch {
      // ignore load failure; keep existing logs
      return false;
    }
  },
  recordEmotion: async (emotionId) => {
    const recordedAt = Date.now();
    const descriptor = getEmotionDescriptor(emotionId);
    const emotionTone: EmotionTone = descriptor?.tone ?? "neutral";
    const id = uid("emo");
    try {
      const res = await fetch("/api/emotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, emotionId, emotionTone, recordedAt }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!data?.ok) throw new Error("save failed");
      const payload: EmotionLog = data?.log && typeof data.log === "object"
        ? {
            id: String(data.log?.id || id),
            emotionId: String(data.log?.emotionId || emotionId) as EmotionId,
            emotionTone: (data.log?.emotionTone as EmotionTone) || emotionTone,
            recordedAt: Number(data.log?.recordedAt) || recordedAt,
          }
        : { id, emotionId, emotionTone, recordedAt };
      const prev = get().emotionLogs;
      set({ emotionLogs: [payload, ...prev].slice(0, 500) });
      return true;
    } catch {
      return false;
    }
  },

  // Urgent todos CRUD (Neon-backed via API with localStorage fallback)
  loadUrgentTodos: async () => {
    try {
      const res = await fetch("/api/urgent", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      if (data?.ok && Array.isArray(data.items)) {
        set({ urgentTodos: data.items });
        writeUrgentTodos(data.items);
        return;
      }
      // fallback
      const items = readUrgentTodos();
      set({ urgentTodos: items });
    } catch {
      const items = readUrgentTodos();
      set({ urgentTodos: items });
    }
  },
  addUrgentTodo: async (t) => {
    const optimistic = [t, ...get().urgentTodos];
    set({ urgentTodos: optimistic });
    writeUrgentTodos(optimistic);
    try {
      await fetch("/api/urgent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(t) });
      // reload from server to ensure consistency/order
      await get().loadUrgentTodos();
    } catch {}
  },
  updateUrgentTodo: async (id, patch) => {
    const cur = get().urgentTodos.find((x) => x.id === id);
    if (!cur) return;
    const updated = { ...cur, ...patch, updatedAt: Date.now() };
    const next = get().urgentTodos.map((x) => (x.id === id ? updated : x));
    set({ urgentTodos: next });
    writeUrgentTodos(next);
    try {
      await fetch("/api/urgent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    } catch {}
  },
  toggleUrgentDone: async (id) => {
    const cur = get().urgentTodos.find((x) => x.id === id);
    if (!cur) return;
    const updated = { ...cur, done: !cur.done, updatedAt: Date.now() } as any;
    const next = get().urgentTodos.map((x) => (x.id === id ? updated : x));
    set({ urgentTodos: next });
    writeUrgentTodos(next);
    try {
      await fetch("/api/urgent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    } catch {}
  },
  deleteUrgentTodo: async (id) => {
    const next = get().urgentTodos.filter((x) => x.id !== id);
    set({ urgentTodos: next });
    writeUrgentTodos(next);
    try {
      await fetch(`/api/urgent?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {}
  },
  clearCompletedUrgent: async () => {
    const toDelete = get().urgentTodos.filter((x) => x.done).map((x) => x.id);
    const next = get().urgentTodos.filter((x) => !x.done);
    set({ urgentTodos: next });
    writeUrgentTodos(next);
    try {
      await Promise.all(toDelete.map((id) => fetch(`/api/urgent?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})));
    } catch {}
  },

  // Today's tasks CRUD (client-only persistence)
  loadTodayTasks: () => {
    const items = readTodayTasks();
    set({ todayTasks: items });
  },
  addTodayTask: (t) => {
    const next = [t, ...get().todayTasks];
    set({ todayTasks: next });
    writeTodayTasks(next);
  },
  updateTodayTask: (id, patch) => {
    const next = get().todayTasks.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x));
    set({ todayTasks: next });
    writeTodayTasks(next);
  },
  toggleTodayDone: (id) => {
    const next = get().todayTasks.map((x) => (x.id === id ? { ...x, done: !x.done, updatedAt: Date.now() } : x));
    set({ todayTasks: next });
    writeTodayTasks(next);
  },
  deleteTodayTask: (id) => {
    const next = get().todayTasks.filter((x) => x.id !== id);
    set({ todayTasks: next });
    writeTodayTasks(next);
  },
  clearCompletedToday: () => {
    const next = get().todayTasks.filter((x) => !x.done);
    set({ todayTasks: next });
    writeTodayTasks(next);
  },
}));

