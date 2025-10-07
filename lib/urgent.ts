/**
 * lib/urgent.ts
 * Simple JSON-backed storage for Urgent Todo CRUD in dev.
 * In production/serverless, replace with Neon via getDb().
 */

import { promises as fs } from "fs";
import path from "path";
import type { UrgentTodo } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "urgent.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE).catch(async () => {
      await fs.writeFile(
        DATA_FILE,
        JSON.stringify({ items: [] as UrgentTodo[] }, null, 2),
        "utf8"
      );
    });
  } catch {
    // ignore; fs may not be writable in some environments
  }
}

export async function readUrgent(): Promise<UrgentTodo[]> {
  try {
    await ensureFile();
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const json = JSON.parse(raw) as { items: UrgentTodo[] };
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

export async function writeUrgent(items: UrgentTodo[]): Promise<boolean> {
  try {
    await ensureFile();
    await fs.writeFile(DATA_FILE, JSON.stringify({ items }, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function upsertUrgent(todo: UrgentTodo) {
  const all = await readUrgent();
  const idx = all.findIndex((t) => t.id === todo.id);
  if (idx >= 0) {
    all[idx] = todo;
  } else {
    all.push(todo);
  }
  await writeUrgent(all);
  return todo;
}

export async function removeUrgent(id: string) {
  const all = await readUrgent();
  const next = all.filter((t) => t.id !== id);
  await writeUrgent(next);
  return { ok: true } as const;
}
