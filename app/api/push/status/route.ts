import { isPushServerConfigured } from "@/lib/push/send";

// Must run at request time — env vars are not available during static build.
export const dynamic = "force-dynamic";

export async function GET() {
  const hasPublicKey = Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim());
  const hasPrivateKey = Boolean(process.env.VAPID_PRIVATE_KEY?.trim());
  const hasSubject = Boolean(process.env.VAPID_SUBJECT?.trim());

  return Response.json({
    configured: isPushServerConfigured(),
    hasPublicKey,
    hasPrivateKey,
    hasSubject,
  });
}
