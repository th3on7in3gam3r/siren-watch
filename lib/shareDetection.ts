import type { HistoryRecord } from "./detectionHistory";

export type ShareResult = "shared" | "copied" | "unavailable" | "denied";

function formatDetectionMessage(
  record: Pick<
    HistoryRecord,
    "timestamp" | "peakFreq" | "loudnessDb" | "confidence" | "aiLabel"
  >,
  location?: { lat: number; lng: number }
): string {
  const time = new Date(record.timestamp).toLocaleString();
  const lines = [
    "Siren Watch — possible emergency siren detected",
    `Time: ${time}`,
    `Confidence: ${Math.round(record.confidence * 100)}%`,
    `Peak: ${record.peakFreq} Hz · ${record.loudnessDb} dB`,
  ];
  if (record.aiLabel) lines.push(`AI label: ${record.aiLabel}`);
  if (location) {
    lines.push(
      `Location: https://maps.google.com/?q=${location.lat},${location.lng}`
    );
  }
  lines.push("\nNot an official emergency alert. Verify locally.");
  return lines.join("\n");
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 60000,
    });
  });
}

export async function shareDetection(
  record: HistoryRecord,
  includeLocation: boolean
): Promise<ShareResult> {
  let location: { lat: number; lng: number } | undefined;
  if (includeLocation) {
    try {
      const pos = await getCurrentPosition();
      location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
    } catch {
      return "denied";
    }
  }

  const text = formatDetectionMessage(record, location);
  const title = "Siren Watch alert";

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return "copied";
  }

  return "unavailable";
}
