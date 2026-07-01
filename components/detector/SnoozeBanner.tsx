"use client";

import { clearSnooze, getSnoozeUntil } from "@/lib/alertSnooze";
import { useEffect, useState } from "react";

export function SnoozeBanner() {
  const [until, setUntil] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setUntil(getSnoozeUntil());
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  if (!until) return null;

  const mins = Math.max(1, Math.ceil((until - Date.now()) / 60000));

  return (
    <div className="mt-3 w-full rounded-sm border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
      Alerts snoozed for ~{mins} min.{" "}
      <button
        type="button"
        onClick={() => {
          clearSnooze();
          setUntil(null);
        }}
        className="underline hover:text-paper"
      >
        Resume now
      </button>
    </div>
  );
}
