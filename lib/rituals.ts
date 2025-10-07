/**
 * lib/rituals.ts
 * Hardcoded rituals configuration and helpers.
 */

export type HardcodedRitual = {
  id: string;
  name: string;
  time: string; // HH:mm 24h
  repeat: "daily" | "weekly" | "monthly" | "none";
  active: boolean;
};

export const HARDCODED_RITUALS: HardcodedRitual[] = [
  {
    id: "morning",
    name: "Morning Ritual",
    time: "08:00",
    repeat: "daily",
    active: true,
  },
];

export function hhmmInTz(d: Date, tz: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(d);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  } catch {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

export function dueRitualIds(now: Date, tz: string, rituals = HARDCODED_RITUALS): string[] {
  const hhmm = hhmmInTz(now, tz);
  return rituals
    .filter((r) => r.active && r.repeat === "daily" && r.time === hhmm)
    .map((r) => r.id);
}
