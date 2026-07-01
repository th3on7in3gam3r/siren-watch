import { removePushSubscription } from "@/lib/push/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let endpoint: string | undefined;
  try {
    const body = (await request.json()) as { endpoint?: string };
    endpoint = body.endpoint;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!endpoint) {
    return Response.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await removePushSubscription(endpoint);
  return Response.json({ ok: true });
}
