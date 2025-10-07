/**
 * lib/appointments.ts
 * Simple JSON-backed storage for Appointment CRUD in dev.
 * In production/serverless, replace with Neon via getDb().
 */

import { promises as fs } from "fs";
import path from "path";
import type { Appointment } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "appointments.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE).catch(async () => {
      await fs.writeFile(DATA_FILE, JSON.stringify({ items: [] as Appointment[] }, null, 2), "utf8");
    });
  } catch {
    // ignore; fs may not be writable in some environments
  }
}

export async function readAppointments(): Promise<Appointment[]> {
  try {
    await ensureFile();
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const json = JSON.parse(raw) as { items: Appointment[] };
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

export async function writeAppointments(items: Appointment[]): Promise<boolean> {
  try {
    await ensureFile();
    await fs.writeFile(DATA_FILE, JSON.stringify({ items }, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function listByDate(dateISO?: string) {
  const all = await readAppointments();
  return dateISO ? all.filter((a) => a.date === dateISO) : all;
}

export async function getById(id: string) {
  const all = await readAppointments();
  return all.find((a) => a.id === id) || null;
}

export async function upsert(appt: Appointment) {
  const all = await readAppointments();
  const idx = all.findIndex((a) => a.id === appt.id);
  if (idx >= 0) {
    all[idx] = appt;
  } else {
    all.push(appt);
  }
  await writeAppointments(all);
  return appt;
}

export async function remove(id: string) {
  const all = await readAppointments();
  const next = all.filter((a) => a.id !== id);
  await writeAppointments(next);
  return { ok: true } as const;
}
