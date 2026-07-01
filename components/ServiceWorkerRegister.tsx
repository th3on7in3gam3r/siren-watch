"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/notifications";
import { setSnoozeUntil, snoozeForMinutes } from "@/lib/alertSnooze";
import { reportError } from "@/lib/monitoring";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker().catch((err) => {
      reportError("sw_register_failed", err);
    });

    const params = new URLSearchParams(window.location.search);
    const snoozeMin = Number(params.get("snooze"));
    if (snoozeMin > 0) {
      snoozeForMinutes(snoozeMin);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SNOOZE_ALERTS" && event.data.until) {
        setSnoozeUntil(event.data.until);
      }
    };

    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
