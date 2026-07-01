import type { DetectionSettings } from "./settings";
import {
  blendConfidence,
  evaluateSweep,
  type FrequencySample,
  type SpectrumReading,
} from "./detection";

export type DetectionTickResult = {
  peak: number;
  db: number;
  bars: number[];
  evidence: boolean;
  heuristicConf: number;
  blended: number;
  sustainedSweepMs: number;
};

export type ConfidenceState = {
  confidence: number;
  yamnetScore: number;
  specialistScore: number;
  lastEvidenceAt: number | null;
};

const HISTORY_QUIET_MS = 600;
const HISTORY_LOUD_MS = 2200;
const NO_EVIDENCE_FAST_DECAY_MS = 2000;
const NO_EVIDENCE_HARD_DECAY_MS = 4000;

export function updateConfidence(
  state: ConfidenceState,
  evidence: boolean,
  now: number
): ConfidenceState {
  if (evidence) {
    state.lastEvidenceAt = now;
  }

  const silenceMs =
    state.lastEvidenceAt === null ? Infinity : now - state.lastEvidenceAt;

  const target = evidence ? 1 : 0;
  let riseRate = 0.28;
  let decayRate = 0.06;

  if (!evidence) {
    if (silenceMs >= NO_EVIDENCE_HARD_DECAY_MS) {
      decayRate = 0.42;
    } else if (silenceMs >= NO_EVIDENCE_FAST_DECAY_MS) {
      decayRate = 0.22;
    } else if (silenceMs >= 400) {
      decayRate = 0.18;
    }
  }

  const rate = evidence ? riseRate : decayRate;
  state.confidence += (target - state.confidence) * rate;
  state.confidence = Math.max(0, Math.min(1, state.confidence));

  if (!evidence) {
    const aiDecay =
      silenceMs >= 400 ? 0.22 : silenceMs >= NO_EVIDENCE_FAST_DECAY_MS ? 0.18 : 0.08;
    state.yamnetScore += (0 - state.yamnetScore) * aiDecay;
    state.specialistScore += (0 - state.specialistScore) * aiDecay;
  }

  return state;
}

export function blendDetectionScores(
  heuristicConf: number,
  specialistConf: number,
  yamnetConf: number,
  hasYamnetSignal: boolean,
  sustainedSweepMs: number
): number {
  const acoustic = Math.max(heuristicConf, specialistConf * 0.9);

  let blended = blendConfidence(acoustic, yamnetConf, hasYamnetSignal);

  if (sustainedSweepMs >= 2000 && heuristicConf >= 0.5) {
    blended = Math.max(blended, heuristicConf);
  }

  return blended;
}

export function runDetectionStep(
  reading: SpectrumReading,
  history: FrequencySample[],
  settings: DetectionSettings,
  confidenceState: ConfidenceState,
  sweepSince: number | null,
  now: number,
  hasYamnetSignal: boolean
): {
  history: FrequencySample[];
  confidenceState: ConfidenceState;
  sweepSince: number | null;
  result: DetectionTickResult;
} {
  const { peak, db, newBars: bars } = reading;
  const loudEnough = db > settings.loudnessFloorDb;

  if (loudEnough) {
    history.push({ t: now, freq: peak, db });
  }
  history = history.filter((s) =>
    now - s.t <= (loudEnough ? HISTORY_LOUD_MS : HISTORY_QUIET_MS)
  );

  const evidence = loudEnough && evaluateSweep(history, settings);
  let nextSweepSince = sweepSince;
  if (evidence) {
    if (nextSweepSince === null) nextSweepSince = now;
  } else {
    nextSweepSince = null;
  }
  const sustainedSweepMs =
    nextSweepSince !== null ? now - nextSweepSince : 0;

  updateConfidence(confidenceState, evidence, now);
  const heuristicConf = confidenceState.confidence;

  const blended = blendDetectionScores(
    heuristicConf,
    confidenceState.specialistScore,
    confidenceState.yamnetScore,
    hasYamnetSignal,
    sustainedSweepMs
  );

  return {
    history,
    confidenceState,
    sweepSince: nextSweepSince,
    result: {
      peak,
      db,
      bars,
      evidence,
      heuristicConf,
      blended,
      sustainedSweepMs,
    },
  };
}
