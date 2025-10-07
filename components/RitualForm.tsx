// components/RitualForm.tsx
// Inline form to add or edit a ritual. Validates name and webhook URL.

"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import type { RitualConfig } from "@/lib/types";
import { uid } from "@/lib/id";

const urlOk = (v: string) => v === "" || /^https?:\/\//i.test(v);

type Props = {
  editId?: string | null;
  onDone?: () => void;
};

export default function RitualForm({ editId, onDone }: Props) {
  const { rituals, addRitual, updateRitual } = useAppStore();
  const editing = rituals.find((r) => r.id === editId);
  const [name, setName] = useState(editing?.name ?? "");
  const [webhook, setWebhook] = useState(editing?.webhook ?? "");
  const [type, setType] = useState<RitualConfig["trigger"]["type"]>(editing?.trigger.type ?? "schedule");
  const [time, setTime] = useState<string>(editing?.trigger.time ?? "08:00");
  const [repeat, setRepeat] = useState<"daily" | "weekly" | "monthly" | "none">(
    (editing?.trigger.repeat as any) ?? "daily"
  );
  const [chatKeyword, setChatKeyword] = useState(editing?.trigger.chatKeyword ?? "/start <id>");
  const [buttons, setButtons] = useState((editing?.buttons ?? ["Done","Snooze"]).join(","));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    setName(editing.name);
    setWebhook(editing.webhook);
    setType(editing.trigger.type);
    setTime(editing.trigger.time ?? "08:00");
    setRepeat(editing.trigger.repeat ?? "daily");
    setChatKeyword(editing.trigger.chatKeyword ?? "/start <id>");
    setButtons((editing.buttons ?? []).join(","));
  }, [editId]);

  function submit() {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!urlOk(webhook)) { setError("Webhook must be http(s) URL or empty for local mock"); return; }
    setError(null);

    const cfg: RitualConfig = {
      id: editing?.id ?? uid("rit"),
      name: name.trim(),
      webhook: webhook.trim(),
      trigger: type === "schedule" ? { type, time, repeat } : { type, chatKeyword },
      buttons: buttons.split(",").map((s) => s.trim()).filter(Boolean),
      active: true,
    };

    if (editing) updateRitual(editing.id, cfg);
    else addRitual(cfg);
    onDone?.();
  }

  return (
    <div className="space-y-2 border rounded-md p-3 dark:border-gray-800">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>Name *</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Webhook URL</span>
          <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://... (leave empty for mock)" />
        </label>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex items-center gap-2 text-sm">
          <span>Trigger</span>
          <select className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="schedule">schedule</option>
            <option value="chat">chat</option>
          </select>
        </label>
        {type === "schedule" ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <span>Time</span>
              <input className="border rounded px-2 py-1 w-28 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400" value={time} onChange={(e) => setTime(e.target.value)} placeholder="08:00" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>Repeat</span>
              <select
                className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
                value={repeat}
                onChange={(e) =>
                  setRepeat(
                    (e.target.value as "daily" | "weekly" | "monthly" | "none")
                  )
                }
              >
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
                <option value="none">none</option>
              </select>
            </label>
          </>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <span>Chat keyword</span>
            <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400" value={chatKeyword} onChange={(e) => setChatKeyword(e.target.value)} placeholder="/check" />
          </label>
        )}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span>Buttons (comma-separated)</span>
        <input className="border rounded px-2 py-1 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400" value={buttons} onChange={(e) => setButtons(e.target.value)} />
      </label>
      {error && <div className="text-red-700 dark:text-red-400 text-sm">{error}</div>}
      <div className="flex justify-end">
        <button onClick={submit} className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm dark:bg-gray-100 dark:text-gray-900">Save Ritual</button>
      </div>
    </div>
  );
}
