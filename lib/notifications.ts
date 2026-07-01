export type NotificationStatus =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export type SirenAlertPayload = {
  peakFreq: number;
  loudnessDb: number;
  confidence: number;
  aiLabel: string | null;
};

import { isAlertsSnoozed } from "@/lib/alertSnooze";

const NOTIFY_COOLDOWN_MS = 5000;
const HAPTIC_PULSE_MS = 2200;
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge.svg";
const HAPTIC_VIBRATE = [280, 90, 280, 90, 280, 120, 400];

let swRegistration: ServiceWorkerRegistration | null = null;
let lastNotifyAt = 0;
let lastHapticPulseAt = 0;
let hapticPulseTimer: ReturnType<typeof setInterval> | null = null;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as NotificationStatus;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return swRegistration;
  } catch (err) {
    const { reportError } = await import("@/lib/monitoring");
    reportError("sw_register_failed", err);
    return null;
  }
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.ready;
    return swRegistration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (getNotificationStatus() === "unsupported") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  const result = await Notification.requestPermission();
  return result as NotificationStatus;
}

export async function ensureNotificationsReady(): Promise<NotificationStatus> {
  await registerServiceWorker();
  return requestNotificationPermission();
}

function formatAlertBody(payload: SirenAlertPayload): string {
  const parts = [
    `${payload.peakFreq} Hz`,
    `${Math.round(payload.confidence * 100)}% confidence`,
  ];
  if (payload.aiLabel) {
    parts.push(payload.aiLabel);
  }
  return parts.join(" · ");
}

export async function notifySirenAlert(
  payload: SirenAlertPayload
): Promise<void> {
  if (getNotificationStatus() !== "granted") return;
  if (isAlertsSnoozed()) return;

  const now = Date.now();
  if (now - lastNotifyAt < NOTIFY_COOLDOWN_MS) return;
  lastNotifyAt = now;

  const body = formatAlertBody(payload);
  const registration = await getServiceWorkerRegistration();

  if (registration?.active) {
    registration.active.postMessage({
      type: "SIREN_ALERT",
      body,
      peakFreq: payload.peakFreq,
      aiLabel: payload.aiLabel,
      confidence: payload.confidence,
    });
    return;
  }

  if (registration?.showNotification) {
    await registration.showNotification("Siren detected", {
      body,
      icon: ICON,
      badge: BADGE,
      tag: "siren-alert",
      vibrate: [180, 80, 180, 80, 240],
      requireInteraction: true,
      data: { url: "/" },
    } as NotificationOptions);
    return;
  }

  new Notification("Siren detected", { body, icon: ICON });
}

/** Vibrate via notification API — works without a recent user tap (when permission granted). */
export async function pulseAlertHaptic(): Promise<void> {
  if (getNotificationStatus() !== "granted") return;
  if (isAlertsSnoozed()) return;

  const now = Date.now();
  if (now - lastHapticPulseAt < HAPTIC_PULSE_MS) return;
  lastHapticPulseAt = now;

  const registration = await getServiceWorkerRegistration();
  if (!registration?.showNotification) return;

  await registration.showNotification("Siren detected", {
    body: "Emergency siren pattern detected nearby.",
    icon: ICON,
    badge: BADGE,
    tag: "siren-alert-haptic",
    renotify: true,
    vibrate: HAPTIC_VIBRATE,
    silent: false,
    data: { url: "/" },
  } as NotificationOptions);
}

export function startAlertHapticPulse(): void {
  stopAlertHapticPulse();
  void pulseAlertHaptic();
  hapticPulseTimer = setInterval(() => {
    void pulseAlertHaptic();
  }, HAPTIC_PULSE_MS);
}

export function stopAlertHapticPulse(): void {
  if (hapticPulseTimer !== null) {
    clearInterval(hapticPulseTimer);
    hapticPulseTimer = null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return null;

  const registration = await getServiceWorkerRegistration();
  if (!registration?.pushManager) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      vapidPublicKey
    ) as BufferSource,
  });
}

export type RemotePushStatus =
  | "unsupported"
  | "no-vapid"
  | "server-unconfigured"
  | "not-subscribed"
  | "subscribed"
  | "error";

export function isRemotePushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

let serverPushReady: boolean | null = null;

export function resetPushServerCache(): void {
  serverPushReady = null;
}

export function remotePushStatusMessage(
  status: RemotePushStatus
): string | null {
  switch (status) {
    case "server-unconfigured":
      return "Server push is not configured. Add VAPID_PRIVATE_KEY on Vercel, then redeploy.";
    case "unsupported":
      return "Allow notifications in your browser, then try again.";
    case "no-vapid":
      return "Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your environment.";
    case "error":
      return "Registration failed. Check notification permission and try again.";
    default:
      return null;
  }
}

export async function isPushServerReady(): Promise<boolean> {
  if (!isRemotePushConfigured()) return false;
  if (serverPushReady !== null) return serverPushReady;
  try {
    const res = await fetch("/api/push/status", { cache: "no-store" });
    if (!res.ok) {
      serverPushReady = false;
      return false;
    }
    const data = (await res.json()) as { configured?: boolean };
    serverPushReady = Boolean(data.configured);
    return serverPushReady;
  } catch {
    serverPushReady = false;
    return false;
  }
}

export async function getRemotePushSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration();
  if (!registration?.pushManager) return null;
  return registration.pushManager.getSubscription();
}

export async function enableRemotePush(): Promise<RemotePushStatus> {
  if (!isRemotePushConfigured()) return "no-vapid";

  resetPushServerCache();
  const serverReady = await isPushServerReady();
  if (!serverReady) return "server-unconfigured";

  const permission = await ensureNotificationsReady();
  if (permission !== "granted") return "unsupported";

  await registerServiceWorker();
  const registration = await getServiceWorkerRegistration();
  if (!registration?.pushManager) return "error";

  try {
    const sub = await subscribeToPush();
    if (!sub) return "error";

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });

    if (res.status === 503) return "server-unconfigured";
    if (!res.ok) return "error";
    return "subscribed";
  } catch {
    return "error";
  }
}

export async function disableRemotePush(): Promise<void> {
  const registration = await getServiceWorkerRegistration();
  const sub = await registration?.pushManager?.getSubscription();
  if (!sub) return;

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});

  await sub.unsubscribe();
}

export async function relayPushAlert(
  payload: SirenAlertPayload
): Promise<void> {
  if (!isRemotePushConfigured()) return;

  const body = formatAlertBody(payload);
  try {
    await fetch("/api/push/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Siren detected",
        body,
        peakFreq: payload.peakFreq,
        confidence: payload.confidence,
        aiLabel: payload.aiLabel,
      }),
    });
  } catch {
    // local SW notifications still work
  }
}
