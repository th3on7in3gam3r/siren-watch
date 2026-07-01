import { getTf } from "./tfLoader";

/**
 * YAMNet classifier layer — loaded on demand when listening starts.
 */

const MODEL_URLS = [
  "/models/yamnet/model.json",
  process.env.NEXT_PUBLIC_YAMNET_MODEL_URL,
  "https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1",
];

const CLASS_MAP_URLS = [
  "/yamnet_labels.txt",
  "https://cdn.jsdelivr.net/gh/tensorflow/models@master/research/audioset/yamnet/yamnet_class_map.csv",
  "https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv",
];

export type ClassifierState = "unloaded" | "loading" | "ready" | "error";

export type ClassificationResult = {
  topClasses: { label: string; score: number }[];
  sirenScore: number;
  sirenLabel: string | null;
};

type GraphModel = Awaited<ReturnType<Awaited<ReturnType<typeof getTf>>["loadGraphModel"]>>;

let model: GraphModel | null = null;
let classNames: string[] | null = null;
let loadPromise: Promise<void> | null = null;

function isEmergencyLabel(label: string): boolean {
  const lower = label.toLowerCase();
  return lower.includes("siren") || lower === "emergency vehicle";
}

function parseCsvClassNames(csv: string): string[] {
  const lines = csv.trim().split("\n").slice(1);
  return lines.map((line) => {
    const firstComma = line.indexOf(",");
    const secondComma = line.indexOf(",", firstComma + 1);
    return line
      .slice(secondComma + 1)
      .replace(/^"|"$/g, "")
      .trim();
  });
}

async function fetchClassNames(): Promise<string[]> {
  for (const url of CLASS_MAP_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      const names = url.endsWith(".txt")
        ? text.trim().split("\n")
        : parseCsvClassNames(text);
      if (names.length >= 500) return names;
    } catch {
      // try next mirror
    }
  }
  throw new Error("Could not load YAMNet class map from any mirror");
}

export async function loadYamnet(
  onStateChange?: (state: ClassifierState) => void
): Promise<void> {
  if (model && classNames) {
    onStateChange?.("ready");
    return;
  }
  if (loadPromise) return loadPromise;

  onStateChange?.("loading");
  loadPromise = (async () => {
    try {
      const tf = await getTf();
      await tf.ready();
      const names = await fetchClassNames();
      let loadedModel: GraphModel | null = null;
      let lastError: unknown;

      for (const url of MODEL_URLS) {
        if (!url) continue;
        try {
          const isRemoteHub = url.includes("tfhub.dev");
          loadedModel = await tf.loadGraphModel(
            url,
            isRemoteHub ? { fromTFHub: true } : undefined
          );
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!loadedModel) {
        throw lastError ?? new Error("Could not load YAMNet from any URL");
      }

      model = loadedModel;
      classNames = names;
      onStateChange?.("ready");
    } catch (err) {
      loadPromise = null;
      onStateChange?.("error");
      throw err;
    }
  })();

  return loadPromise;
}

export function isYamnetReady(): boolean {
  return !!model && !!classNames;
}

export async function classifyWaveform(
  waveform: Float32Array
): Promise<ClassificationResult | null> {
  if (!model || !classNames) return null;

  const tf = await getTf();
  return tf.tidy(() => {
    const input = tf.tensor1d(waveform);
    const output = model!.predict(input) as
      | import("@tensorflow/tfjs").Tensor
      | import("@tensorflow/tfjs").Tensor[];
    const scoresTensor = Array.isArray(output) ? output[0] : output;
    const meanScores = scoresTensor.mean(0);
    const scoresArr = meanScores.arraySync() as number[];
    meanScores.dispose();

    const ranked = scoresArr
      .map((score, i) => ({ label: classNames![i], score }))
      .sort((a, b) => b.score - a.score);

    const emergencyMatches = ranked.filter((c) => isEmergencyLabel(c.label));
    const bestEmergency = emergencyMatches[0] ?? null;

    return {
      topClasses: ranked.slice(0, 5),
      sirenScore: bestEmergency?.score ?? 0,
      sirenLabel: bestEmergency?.label ?? null,
    };
  }) as ClassificationResult;
}
