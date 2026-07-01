import { broadcastPushAlert, isPushServerConfigured } from "@/lib/push/send";
import { pushStoreMode } from "@/lib/push/store";

export async function POST(request: Request) {
  if (!isPushServerConfigured()) {
    return Response.json(
      { error: "VAPID keys not configured on server" },
      { status: 503 }
    );
  }

  let payload: {
    body?: string;
    title?: string;
    peakFreq?: number;
    confidence?: number;
    aiLabel?: string | null;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.body) {
    return Response.json({ error: "Missing body" }, { status: 400 });
  }

  const result = await broadcastPushAlert({
    title: payload.title,
    body: payload.body,
    peakFreq: payload.peakFreq,
    confidence: payload.confidence,
    aiLabel: payload.aiLabel,
  });

  return Response.json({ ok: true, store: pushStoreMode(), ...result });
}
