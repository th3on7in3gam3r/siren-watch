import type { DetectionSettings } from "./settings";

export type CalibrationSample = { db: number; peak: number };

export type CalibrationResult = {
  loudnessFloorDb: number;
  ambientDb: number;
  peakDb: number;
  swingThresholdHz: number;
};

const CALIBRATION_SEC = 10;
const NOISE_MARGIN_DB = 8;

export const CALIBRATION_DURATION_MS = CALIBRATION_SEC * 1000;

export function analyzeCalibration(
  samples: CalibrationSample[]
): CalibrationResult | null {
  if (samples.length < 20) return null;

  const dbs = samples.map((s) => s.db).sort((a, b) => a - b);
  const p50 = dbs[Math.floor(dbs.length * 0.5)];
  const p90 = dbs[Math.floor(dbs.length * 0.9)];
  const ambientDb = Math.round(p50);
  const peakDb = Math.round(p90);
  const loudnessFloorDb = Math.min(
    -40,
    Math.round(p90 + NOISE_MARGIN_DB)
  );

  const peaks = samples.map((s) => s.peak);
  const peakSpread = Math.max(...peaks) - Math.min(...peaks);
  const swingThresholdHz = Math.round(
    Math.min(280, Math.max(110, 115 + peakSpread * 0.12 + (p90 - p50) * 0.4))
  );

  return { loudnessFloorDb, ambientDb, peakDb, swingThresholdHz };
}

export function applyCalibration(
  settings: DetectionSettings,
  result: CalibrationResult
): DetectionSettings {
  return {
    ...settings,
    preset: "custom",
    loudnessFloorDb: result.loudnessFloorDb,
    swingThresholdHz: result.swingThresholdHz,
  };
}

export async function captureCalibrationSample(
  stream: MediaStream
): Promise<CalibrationSample[]> {
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const samples: CalibrationSample[] = [];
  const start = performance.now();
  const binHz = ctx.sampleRate / analyser.fftSize;
  const minBin = Math.floor(500 / binHz);
  const maxBin = Math.min(
    analyser.frequencyBinCount - 1,
    Math.ceil(1800 / binHz)
  );

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);

      let maxVal = 0;
      let maxBinIdx = minBin;
      for (let i = minBin; i <= maxBin; i++) {
        if (freqData[i] > maxVal) {
          maxVal = freqData[i];
          maxBinIdx = i;
        }
      }
      const peak = maxBinIdx * binHz;
      const db = maxVal === 0 ? -100 : -100 + (maxVal / 255) * 100;
      samples.push({ db, peak });

      if (performance.now() - start >= CALIBRATION_DURATION_MS) {
        clearInterval(interval);
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        resolve(samples);
      }
    }, 100);
  });
}
