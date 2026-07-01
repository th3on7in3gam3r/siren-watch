const SNOOZE_KEY = "siren-watch-snooze-until";

export function setSnoozeUntil(untilMs: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNOOZE_KEY, String(untilMs));
}

export function snoozeForMinutes(minutes: number): number {
  const until = Date.now() + minutes * 60 * 1000;
  setSnoozeUntil(until);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("siren-snooze-changed"));
  }
  return until;
}

export function clearSnooze(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SNOOZE_KEY);
  window.dispatchEvent(new CustomEvent("siren-snooze-changed"));
}

export function getSnoozeUntil(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SNOOZE_KEY);
  if (!raw) return null;
  const until = Number(raw);
  if (!Number.isFinite(until) || until <= Date.now()) {
    localStorage.removeItem(SNOOZE_KEY);
    return null;
  }
  return until;
}

export function isAlertsSnoozed(): boolean {
  return getSnoozeUntil() !== null;
}
