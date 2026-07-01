import { getTf } from "./tfLoader";

const MODEL_URL =
  process.env.NEXT_PUBLIC_SIREN_MODEL_URL ?? "/models/siren-specialist/model.json";

export type SpecialistState = "unloaded" | "loading" | "ready" | "fallback" | "error";

type LayersModel = Awaited<ReturnType<Awaited<ReturnType<typeof getTf>>["loadLayersModel"]>>;
type GraphModel = Awaited<ReturnType<Awaited<ReturnType<typeof getTf>>["loadGraphModel"]>>;

let model: LayersModel | GraphModel | null = null;
let loadPromise: Promise<void> | null = null;
let state: SpecialistState = "unloaded";

export function getSpecialistState(): SpecialistState {
  return state;
}

export async function loadSirenSpecialist(
  onStateChange?: (s: SpecialistState) => void
): Promise<void> {
  if (model) {
    state = "ready";
    onStateChange?.("ready");
    return;
  }
  if (loadPromise) return loadPromise;

  state = "loading";
  onStateChange?.("loading");

  loadPromise = (async () => {
    try {
      const tf = await getTf();
      await tf.ready();
      try {
        model = await tf.loadLayersModel(MODEL_URL);
      } catch {
        model = await tf.loadGraphModel(MODEL_URL);
      }
      state = "ready";
      onStateChange?.("ready");
    } catch {
      model = null;
      loadPromise = null;
      state = "fallback";
      onStateChange?.("fallback");
    }
  })();

  return loadPromise;
}

export function isSpecialistModelReady(): boolean {
  return state === "ready" && model !== null;
}

export function computeYelpModulationScore(
  samples: Float32Array,
  sampleRate: number
): number {
  if (samples.length < sampleRate * 0.8) return 0;

  const windowSec = 0.05;
  const windowSamples = Math.max(1, Math.floor(sampleRate * windowSec));
  const rms: number[] = [];

  for (let i = 0; i + windowSamples <= samples.length; i += windowSamples) {
    let sum = 0;
    for (let j = 0; j < windowSamples; j++) {
      const v = samples[i + j];
      sum += v * v;
    }
    rms.push(Math.sqrt(sum / windowSamples));
  }

  if (rms.length < 8) return 0;

  const mean = rms.reduce((a, b) => a + b, 0) / rms.length;
  if (mean < 1e-5) return 0;

  const normalized = rms.map((v) => v / mean);
  const centered = normalized.map((v) => v - 1);

  let best = 0;
  for (let rateHz = 1; rateHz <= 6; rateHz += 0.5) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < centered.length; i++) {
      const angle = (2 * Math.PI * rateHz * i) / (1 / windowSec);
      re += centered[i] * Math.cos(angle);
      im += centered[i] * Math.sin(angle);
    }
    const power = (re * re + im * im) / centered.length;
    best = Math.max(best, power);
  }

  return Math.max(0, Math.min(1, best * 2.2));
}

export async function classifySirenSpecialist(
  waveform16k: Float32Array
): Promise<number> {
  if (model && state === "ready") {
    const tf = await getTf();
    return tf.tidy(() => {
      const input = tf.tensor(waveform16k).reshape([1, waveform16k.length]);
      const output = model!.predict(input) as import("@tensorflow/tfjs").Tensor;
      const values = output.dataSync();
      output.dispose();
      if (values.length === 1) return Math.max(0, Math.min(1, values[0]));
      if (values.length >= 2) return Math.max(0, Math.min(1, values[1]));
      return Math.max(0, Math.min(1, values[0]));
    });
  }

  return computeYelpModulationScore(waveform16k, 16000);
}
