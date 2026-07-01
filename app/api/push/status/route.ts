import { isPushServerConfigured } from "@/lib/push/send";

export async function GET() {
  return Response.json({
    configured: isPushServerConfigured(),
    mode: isPushServerConfigured() ? "server" : "unconfigured",
  });
}
