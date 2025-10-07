/**
 * lib/mockdb.ts
 * Simple in-memory mock DB for API route stubs (local dev only).
 * Note: This resets on server restart. Replace with real persistence for prod.
 */

import type { Message, RitualConfig, SavedMessage } from "@/lib/types";

const state = {
  messages: [] as Message[],
  rituals: [] as RitualConfig[],
  saved: [] as SavedMessage[],
};

export function getMessages(): Message[] {
  return state.messages;
}

export function addMessage(m: Message) {
  state.messages.push(m);
  if (state.messages.length > 100) {
    state.messages.splice(0, state.messages.length - 100);
  }
}

export function setMessages(arr: Message[]) {
  state.messages = arr.slice(-100);
}

export function getRituals(): RitualConfig[] {
  return state.rituals;
}

export function setRituals(r: RitualConfig[]) {
  state.rituals = r;
}

export function upsertRitual(ritual: RitualConfig) {
  const idx = state.rituals.findIndex((r) => r.id === ritual.id);
  if (idx >= 0) state.rituals[idx] = ritual;
  else state.rituals.unshift(ritual);
}

export function deleteRitual(id: string) {
  state.rituals = state.rituals.filter((r) => r.id !== id);
}

export function getSaved(): SavedMessage[] {
  return state.saved;
}

export function saveMessagePersisted(item: SavedMessage) {
  state.saved.unshift(item);
}

// Seed minimal data for dev UX
(function seed() {
  if (state.messages.length === 0) {
    const now = Date.now();
    state.messages.push(
      { id: "m1", role: "assistant", text: "Welcome to PSA API mock.", timestamp: now - 6000 },
      { id: "m2", role: "ritual", text: "Try /start morning to begin.", timestamp: now - 5000, ritualId: "morning", buttons: ["Good", "Meh", "Low"] }
    );
  }
  if (state.rituals.length === 0) {
    state.rituals.push(
      { id: "morning", name: "Morning Check-in", webhook: "", trigger: { type: "schedule", time: "08:00", repeat: "daily" }, buttons: ["Good", "Meh", "Low"], active: true }
    );
  }
})();
