// components/AppointmentForm.tsx
// Create/Edit Appointment form used in Day view

"use client";

import { useEffect, useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";

export type AppointmentFormProps = {
  dateISO: string;
  edit?: Appointment | null;
  onSaved?: (a: Appointment) => void;
  onCancel?: () => void;
};

export default function AppointmentForm({ dateISO, edit, onSaved, onCancel }: AppointmentFormProps) {
  const [title, setTitle] = useState(edit?.title || "");
  const [start, setStart] = useState(edit?.start || "09:00");
  const [durationMin, setDurationMin] = useState<number>(edit?.durationMin || 30);
  const [notes, setNotes] = useState(edit?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // When edit changes, sync form
    setTitle(edit?.title || "");
    setStart(edit?.start || "09:00");
    setDurationMin(edit?.durationMin || 30);
    setNotes(edit?.notes || "");
  }, [edit]);

  const isEdit = useMemo(() => !!edit?.id, [edit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Appointment> = {
        id: edit?.id,
        title: title.trim(),
        date: dateISO,
        start,
        durationMin: Number(durationMin),
        notes: notes.trim() || undefined,
      };
      const res = await fetch("/api/appointments", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.ok && data?.item && onSaved) onSaved(data.item as Appointment);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 border rounded-md border-gray-200 dark:border-gray-800">
      <div className="text-sm text-gray-500">{isEdit ? "Edit appointment" : "New appointment"} for {dateISO}</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs text-gray-500">Title</span>
          <input
            className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Appointment title"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Start</span>
          <input
            type="time"
            className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Duration (min)</span>
          <input
            type="number"
            min={5}
            step={5}
            className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            value={durationMin}
            onChange={(e) => setDurationMin(parseInt(e.target.value || "0", 10))}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-500">Notes</span>
        <textarea
          className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional notes"
        />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add appointment"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
