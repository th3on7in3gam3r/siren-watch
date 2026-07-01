import webpush from "web-push";
import {
  listPushSubscriptions,
  removePushSubscription,
  type StoredPushSubscription,
} from "./store";

export type PushAlertPayload = {
  title?: string;
  body: string;
  peakFreq?: number;
  confidence?: number;
  aiLabel?: string | null;
};

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:siren-watch@example.com",
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

function toWebPushSubscription(sub: StoredPushSubscription) {
  return {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime,
    keys: sub.keys,
  };
}

export async function broadcastPushAlert(
  payload: PushAlertPayload
): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await listPushSubscriptions();
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const body = JSON.stringify({
    title: payload.title ?? "Siren detected",
    body: payload.body,
    tag: "siren-alert",
    peakFreq: payload.peakFreq,
    confidence: payload.confidence,
    aiLabel: payload.aiLabel,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(toWebPushSubscription(sub), body);
        sent++;
      } catch (err) {
        failed++;
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await removePushSubscription(sub.endpoint);
        }
      }
    })
  );

  return { sent, failed };
}

export function isPushServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}
