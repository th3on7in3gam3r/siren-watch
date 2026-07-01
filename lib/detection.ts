import type { DetectionSettings } from "./settings";

export type FrequencySample = { t: number; freq: number; db: number };

export type SpectrumReading = {
  peak: number;
  db: number;
  newBars: number[];
};

export function readSpectrum(
  analyser: AnalyserNode,
  sampleRate: number,
  settings: Pick<DetectionSettings, "minHz" | "maxHz">
): SpectrumReading {
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  const binHz = sampleRate / analyser.fftSize;
  const minBin = Math.floor(settings.minHz / binHz);
  const maxBin = Math.min(
    freqData.length - 1,
    Math.ceil(settings.maxHz / binHz)
  );

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

  const barCount = 32;
  const span = maxBin - minBin;
  const newBars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const idx = minBin + Math.floor((i / barCount) * span);
    newBars.push(freqData[idx] / 255);
  }

  return { peak, db, newBars };
}

export function evaluateSweep(
  history: FrequencySample[],
  settings: Pick<DetectionSettings, "swingThresholdHz" | "loudnessFloorDb">
): boolean {
  if (history.length < 12) return false;

  const freqs = history.map((s) => s.freq);
  const min = Math.min(...freqs);
  const max = Math.max(...freqs);
  const swing = max - min;
  if (swing < settings.swingThresholdHz) return false;

  let reversals = 0;
  let direction = 0;
  for (let i = 1; i < freqs.length; i++) {
    const d = freqs[i] - freqs[i - 1];
    if (Math.abs(d) < 15) continue;
    const dir = d > 0 ? 1 : -1;
    if (direction !== 0 && dir !== direction) reversals++;
    direction = dir;
  }

  const avgDb = history.reduce((sum, s) => sum + s.db, 0) / history.length;
  if (avgDb <= settings.loudnessFloorDb) return false;

  // Speech formants cause many small, irregular pitch jumps — not yelp sweeps.
  if (reversals > 22) return false;
  if (reversals < 3) return false;

  // Sirens sweep a wide band; narrow wobble is usually voice or noise.
  if (swing < settings.swingThresholdHz) return false;
  const midHz = (min + max) / 2;
  const spanRatio = swing / Math.max(midHz, 1);
  if (spanRatio < 0.18) return false;

  return true;
}

export function blendConfidence(
  heuristicConf: number,
  yamnetConf: number,
  hasYamnetSignal: boolean,
  speechScore = 0
): number {
  if (!hasYamnetSignal) return heuristicConf;

  // Strong speech + weak siren → likely conversation, not emergency siren.
  if (speechScore >= 0.32 && yamnetConf < 0.18) {
    return heuristicConf * 0.25;
  }
  if (speechScore >= 0.45 && yamnetConf < 0.28) {
    return heuristicConf * 0.4;
  }

  // Low AI siren score usually means inconclusive (phone speakers, YouTube,
  // re-recorded audio) — not a confident "not a siren". Trust the sweep.
  if (yamnetConf < 0.12) {
    return heuristicConf;
  }

  if (yamnetConf >= 0.35) {
    return Math.max(
      heuristicConf * 0.25 + yamnetConf * 0.75,
      yamnetConf * 0.88
    );
  }

  if (yamnetConf >= 0.25) {
    return heuristicConf * 0.3 + yamnetConf * 0.7;
  }

  return heuristicConf * 0.5 + yamnetConf * 0.5;
}

export type DetectionHintInput = {
  loudnessDb: number;
  loudnessFloorDb: number;
  sweepDetected: boolean;
  confidence: number;
  alertThreshold: number;
  yamnetScore: number;
  classifierReady: boolean;
  classifierLoading: boolean;
};

export function getDetectionHint(input: DetectionHintInput): string {
  const {
    loudnessDb,
    loudnessFloorDb,
    sweepDetected,
    confidence,
    alertThreshold,
    yamnetScore,
    classifierReady,
    classifierLoading,
  } = input;

  if (classifierLoading) {
    return "AI model still loading — only the frequency heuristic is active until AI READY appears.";
  }

  if (loudnessDb <= loudnessFloorDb + 3) {
    return `Signal too quiet (${loudnessDb} dB). Raise volume or move the source closer — need above ${loudnessFloorDb} dB.`;
  }

  if (classifierReady && yamnetScore >= 0.25) {
    return `AI hears siren-like audio (${Math.round(yamnetScore * 100)}%). Confidence ${Math.round(confidence * 100)}% — alert at ${Math.round(alertThreshold * 100)}%.`;
  }

  if (sweepDetected && yamnetScore < 0.12 && classifierReady) {
    return `Sweep detected — AI inconclusive (${Math.round(yamnetScore * 100)}%), trusting acoustic match. Confidence ${Math.round(confidence * 100)}% — alert at ${Math.round(alertThreshold * 100)}%.`;
  }

  if (sweepDetected) {
    return `Siren-like sweep detected. Confidence ${Math.round(confidence * 100)}% — need ${Math.round(alertThreshold * 100)}% to alert.`;
  }

  if (confidence >= alertThreshold * 0.4) {
    return `Confidence rising (${Math.round(confidence * 100)}%). Keep the siren playing 5–10 seconds.`;
  }

  return "Listening… play a warbling emergency siren loud and near the mic for best results.";
}
