// app/rituals/page.tsx
// Rituals management page (renamed from /schedule)

"use client";

import { useEffect, useState } from "react";
import RitualList from "@/components/RitualList";
import RitualForm from "@/components/RitualForm";
import { useAppStore } from "@/lib/store";

export default function RitualsPage() {
  const [editId, setEditId] = useState<string | null>(null);
  const { setRituals } = useAppStore();

  useEffect(() => {
    fetch("/api/rituals")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.rituals)) setRituals(data.rituals);
      })
      .catch(() => {});
  }, [setRituals]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Rituals</h1>
      <RitualList onEdit={(id) => setEditId(id)} />
      <div>
        <h2 className="text-lg font-medium mb-2">Add / Edit Ritual</h2>
        <RitualForm editId={editId} onDone={() => setEditId(null)} />
      </div>
    </div>
  );
}
