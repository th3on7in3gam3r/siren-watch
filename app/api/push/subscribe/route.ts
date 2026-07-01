import { savePushSubscription, type StoredPushSubscription } from "@/lib/push/store";
import { isPushServerConfigured } from "@/lib/push/send";

export async function POST(request: Request) {
  if (!isPushServerConfigured()) {
    return Response.json(
      { error: "VAPID keys not configured on server" },
      { status: 503 }
    );
  }

  let body: StoredPushSubscription;
  try {
    body = (await request.json()) as StoredPushSubscription;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await savePushSubscription({
    endpoint: body.endpoint,
    expirationTime: body.expirationTime ?? null,
    keys: body.keys,
  });

  return Response.json({ ok: true });
}
