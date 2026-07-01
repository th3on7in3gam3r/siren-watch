import type { ClassificationResult } from "@/lib/yamnet";
import type { ClassifierState } from "@/lib/yamnet";
import type { ListeningStatus } from "@/hooks/useSirenDetection";

export function Radar({
  status,
  confidence,
  sweepDetected = false,
}: {
  status: ListeningStatus;
  confidence: number;
  sweepDetected?: boolean;
}) {
  const active =
    status === "listening" || status === "possible" || status === "alert";
  const alerting = status === "alert" && sweepDetected;
  const possible = status === "possible";
  return (
    <div className="relative flex h-56 w-56 items-center justify-center">
      {[1, 2, 3].map((r) => (
        <div
          key={r}
          className="absolute rounded-full border"
          style={{
            width: `${r * 33.3}%`,
            height: `${r * 33.3}%`,
            borderColor: alerting
              ? "rgba(255,59,59,0.25)"
              : possible
              ? "rgba(255,140,66,0.22)"
              : "rgba(78,205,196,0.18)",
          }}
        />
      ))}

      {active && (
        <div
          className="absolute h-full w-full animate-sweep"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${
              alerting
                ? "rgba(255,59,59,0.35)"
                : possible
                ? "rgba(255,140,66,0.3)"
                : "rgba(78,205,196,0.28)"
            } 40deg, transparent 90deg)`,
            borderRadius: "9999px",
          }}
        />
      )}

      {alerting && (
        <>
          <div className="absolute h-24 w-24 rounded-full border-2 border-alert animate-pulseRing" />
          <div
            className="absolute h-24 w-24 rounded-full border-2 border-alert animate-pulseRing"
            style={{ animationDelay: "0.5s" }}
          />
        </>
      )}

      <div
        className={`z-10 flex h-24 w-24 flex-col items-center justify-center rounded-full border transition-colors ${
          alerting
            ? "border-alert bg-alert/10"
            : possible
            ? "border-amber bg-amber/10"
            : active
            ? "border-signal bg-signal/10"
            : "border-line bg-panel"
        }`}
      >
        <span
          className={`font-display text-2xl font-bold ${
            alerting
              ? "text-alert"
              : possible
              ? "text-amber"
              : active
              ? "text-signal"
              : "text-fog"
          }`}
        >
          {Math.round(confidence * 100)}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-fog">
          confidence
        </span>
      </div>
    </div>
  );
}

export function Spectrum({
  bars,
  status,
  sweepDetected = false,
}: {
  bars: number[];
  status: ListeningStatus;
  sweepDetected?: boolean;
}) {
  const alerting = status === "alert" && sweepDetected;
  const possible = status === "possible";
  return (
    <div className="flex h-16 w-full items-end gap-[3px] rounded-sm border border-line bg-panel/60 px-3 py-2">
      {bars.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] transition-all duration-75"
          style={{
            height: `${Math.max(4, v * 100)}%`,
            backgroundColor: alerting
              ? "#FF3B3B"
              : possible
              ? "#FF8C42"
              : v > 0.5
              ? "#FF8C42"
              : "#4ECDC4",
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

export function ConfidenceBreakdown({
  heuristicConfidence,
  specialistScore,
  specialistState,
  yamnetScore,
  classifierState,
}: {
  heuristicConfidence: number;
  specialistScore: number;
  specialistState: import("@/lib/sirenSpecialist").SpecialistState;
  yamnetScore: number;
  classifierState: ClassifierState;
}) {
  const specialistNote =
    specialistState === "ready"
      ? "custom model"
      : specialistState === "fallback"
      ? "yelp modulation"
      : specialistState === "loading"
      ? "loading…"
      : "not started";

  const rows = [
    {
      label: "Acoustic pattern",
      value: heuristicConfidence,
      note: "frequency sweep, instant",
    },
    {
      label: "Siren specialist",
      value: specialistScore,
      note: specialistNote,
    },
    {
      label: "AI classifier",
      value: yamnetScore,
      note:
        classifierState === "ready"
          ? "YAMNet, ~1x/sec"
          : classifierState === "loading"
          ? "loading model..."
          : classifierState === "error"
          ? "unavailable, heuristic only"
          : "not started",
    },
  ];
  return (
    <div className="mt-6 w-full space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-fog">
            <span>{row.label}</span>
            <span>{row.note}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-panel">
            <div
              className="h-full rounded-full bg-signal transition-all duration-150"
              style={{ width: `${Math.round(row.value * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusPanel({
  peakFreq,
  loudnessDb,
  yamnetTop,
}: {
  peakFreq: number;
  loudnessDb: number;
  yamnetTop: ClassificationResult | null;
}) {
  const bestGuess =
    yamnetTop && yamnetTop.sirenScore > 0.2 && yamnetTop.sirenLabel
      ? yamnetTop.sirenLabel
      : "Uncertain";

  const items = [
    { label: "Peak frequency", value: `${peakFreq} Hz` },
    { label: "Signal level", value: `${loudnessDb} dB` },
    { label: "Best guess (AI)", value: bestGuess },
    { label: "Direction", value: "Not available", note: true },
  ];
  return (
    <div className="mt-6 grid w-full grid-cols-2 gap-2 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-sm border border-line bg-panel/60 px-3 py-2"
        >
          <div className="text-[10px] uppercase tracking-widest text-fog">
            {item.label}
          </div>
          <div
            className={`mt-1 font-display text-base ${
              item.note ? "text-fog" : "text-paper"
            }`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
