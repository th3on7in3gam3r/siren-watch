import { isPushServerConfigured } from "@/lib/push/send";

// Must run at request time — env vars are not available during static build.
export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() ?? "";

  return Response.json({
    configured: isPushServerConfigured(),
    hasPublicKey: Boolean(publicKey),
    hasPrivateKey: Boolean(privateKey),
    hasSubject: Boolean(subject),
    // Safe diagnostics — lengths only, never the key values.
    publicKeyLength: publicKey.length,
    privateKeyLength: privateKey.length,
  });
}
