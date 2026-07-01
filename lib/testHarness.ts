import {
  blendDetectionScores,
  runDetectionStep,
  type ConfidenceState,
} from "./detectionEngine";
import { evaluateSweep } from "./detection";
import type { DetectionSettings } from "./settings";
import { DEFAULT_SETTINGS } from "./settings";

export type HarnessCase = {
  id: string;
  label: string;
  category: "siren" | "negative";
  description: string;
};

export type HarnessResult = {
  case: HarnessCase;
  sweepDetected: boolean;
  maxConfidence: number;
  alerted: boolean;
  passed: boolean;
};

export const HARNESS_CASES: HarnessCase[] = [
  {
    id: "yelp-police",
    label: "Police yelp sweep",
    category: "siren",
    description: "Synthetic two-tone frequency sweep 600–1400 Hz",
  },
  {
    id: "yelp-fast",
    label: "Fast ambulance sweep",
    category: "siren",
    description: "Faster sweep 700–1600 Hz",
  },
  {
    id: "steady-tone",
    label: "Steady 900 Hz tone",
    category: "negative",
    description: "Should not trigger sweep detection",
  },
  {
    id: "horn-burst",
    label: "Short horn burst",
    category: "negative",
    description: "Brief non-sweeping tone",
  },
  {
    id: "pink-noise",
    label: "Pink noise",
    category: "negative",
    description: "Broadband noise without yelp pattern",
  },
];

function generatePinkNoise(length: number): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return out;
}

function synthYelp(
  sampleRate: number,
  durationSec: number,
  minHz: number,
  maxHz: number,
  sweepSec: number
): Float32Array {
  const length = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const phase = (t % sweepSec) / sweepSec;
    const freq = minHz + (maxHz - minHz) * (phase < 0.5 ? phase * 2 : (1 - phase) * 2);
    out[i] = Math.sin((2 * Math.PI * freq * t)) * 0.55;
  }
  return out;
}

function synthTone(
  sampleRate: number,
  durationSec: number,
  hz: number,
  amplitude = 0.5
): Float32Array {
  const length = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = Math.sin((2 * Math.PI * hz * i) / sampleRate) * amplitude;
  }
  return out;
}

function synthHornBurst(sampleRate: number): Float32Array {
  const durationSec = 3;
  const out = new Float32Array(Math.floor(sampleRate * durationSec));
  const burstLen = Math.floor(sampleRate * 0.35);
  for (let i = 0; i < burstLen; i++) {
    const env = Math.sin((Math.PI * i) / burstLen);
    out[i] = Math.sin((2 * Math.PI * 420 * i) / sampleRate) * env * 0.7;
  }
  return out;
}

export function synthesizeHarnessAudio(
  testCase: HarnessCase,
  sampleRate = 48000
): Float32Array {
  switch (testCase.id) {
    case "yelp-police":
      return synthYelp(sampleRate, 8, 600, 1400, 0.55);
    case "yelp-fast":
      return synthYelp(sampleRate, 8, 700, 1600, 0.4);
    case "steady-tone":
      return synthTone(sampleRate, 8, 900);
    case "horn-burst":
      return synthHornBurst(sampleRate);
    case "pink-noise":
      return generatePinkNoise(Math.floor(sampleRate * 8));
    default:
      return new Float32Array(0);
  }
}

/** Synthetic police-style yelp for the in-app demo (no microphone). */
export function synthesizeDemoSiren(sampleRate = 48000): Float32Array {
  return synthYelp(sampleRate, 12, 600, 1400, 0.55);
}

function analyzeChunk(
  chunk: Float32Array,
  sampleRate: number,
  settings: DetectionSettings
): { peak: number; db: number; newBars: number[] } {
  const fftSize = 2048;
  const minHz = settings.minHz;
  const maxHz = settings.maxHz;
  const binHz = sampleRate / fftSize;
  const minBin = Math.max(1, Math.floor(minHz / binHz));
  const maxBin = Math.min(Math.floor(fftSize / 2), Math.ceil(maxHz / binHz));

  const buffer = chunk.length >= fftSize ? chunk.subarray(0, fftSize) : chunk;
  let maxMag = 0;
  let maxBinIdx = minBin;
  const magnitudes: number[] = [];

  for (let k = minBin; k <= maxBin; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < buffer.length; n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      re += buffer[n] * Math.cos(angle);
      im -= buffer[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(re * re + im * im) / fftSize;
    magnitudes.push(mag);
    if (mag > maxMag) {
      maxMag = mag;
      maxBinIdx = k;
    }
  }

  const peak = maxBinIdx * binHz;
  const db = maxMag <= 1e-8 ? -100 : 20 * Math.log10(maxMag);
  const barCount = 32;
  const barMax = Math.max(...magnitudes, 1e-8);
  const bars: number[] = [];
  const span = magnitudes.length;
  for (let i = 0; i < barCount; i++) {
    const idx = Math.min(span - 1, Math.floor((i / barCount) * span));
    bars.push(magnitudes[idx] / barMax);
  }

  return { peak, db, newBars: bars.slice(0, barCount) };
}

export function runHarnessCase(
  testCase: HarnessCase,
  settings: DetectionSettings = DEFAULT_SETTINGS
): HarnessResult {
  const sampleRate = 48000;
  const audio = synthesizeHarnessAudio(testCase, sampleRate);
  const hop = 1024;
  let history: { t: number; freq: number; db: number }[] = [];
  const confidenceState: ConfidenceState = {
    confidence: 0,
    yamnetScore: 0,
    specialistScore: 0,
    lastEvidenceAt: null,
  };
  let sweepSince: number | null = null;
  let maxConfidence = 0;
  let lastEvidence = false;
  const threshold = settings.alertThreshold;

  for (let offset = 0; offset + 2048 <= audio.length; offset += hop) {
    const chunk = audio.subarray(offset, offset + 2048);
    const now = (offset / sampleRate) * 1000;
    const reading = analyzeChunk(chunk, sampleRate, settings);
    const step = runDetectionStep(
      reading,
      history,
      settings,
      confidenceState,
      sweepSince,
      now,
      false
    );
    history = step.history;
    sweepSince = step.sweepSince;
    lastEvidence = step.result.evidence;
    maxConfidence = Math.max(maxConfidence, step.result.blended);
  }

  const sweepDetected = lastEvidence || evaluateSweep(history, settings);
  const alerted = maxConfidence >= threshold;
  const passed =
    testCase.category === "siren" ? alerted : !alerted;

  return {
    case: testCase,
    sweepDetected,
    maxConfidence,
    alerted,
    passed,
  };
}

export function runHarnessSuite(
  settings: DetectionSettings = DEFAULT_SETTINGS
): HarnessResult[] {
  return HARNESS_CASES.map((tc) => runHarnessCase(tc, settings));
}

export function summarizeHarness(results: HarnessResult[]): {
  passed: number;
  total: number;
  truePositiveRate: number;
  falsePositiveRate: number;
} {
  const sirens = results.filter((r) => r.case.category === "siren");
  const negatives = results.filter((r) => r.case.category === "negative");
  const tp = sirens.filter((r) => r.passed).length;
  const fp = negatives.filter((r) => !r.passed).length;

  return {
    passed: results.filter((r) => r.passed).length,
    total: results.length,
    truePositiveRate: sirens.length ? tp / sirens.length : 0,
    falsePositiveRate: negatives.length ? fp / negatives.length : 0,
  };
}
