import type { ListeningStatus } from "@/hooks/useSirenDetection";
import type { DetectionSettings } from "@/lib/settings";

type DetectionFeedbackProps = {
  status: ListeningStatus;
  hint: string;
  loudnessDb: number;
  settings: DetectionSettings;
  sweepDetected: boolean;
  confidence: number;
};

export function DetectionFeedback({
  status,
  hint,
  loudnessDb,
  settings,
  sweepDetected,
  confidence,
}: DetectionFeedbackProps) {
  if (status === "idle" || status === "requesting" || status === "denied") {
    return null;
  }

  const tooQuiet = loudnessDb <= settings.loudnessFloorDb + 3;
  const steady = settings.steadyAlertEnabled;
  const borderClass =
    status === "alert"
      ? "border-alert/40 bg-alert/10 text-alert"
      : status === "possible"
      ? "border-amber/40 bg-amber/10 text-amber"
      : tooQuiet
      ? "border-amber/30 bg-panel text-fog"
      : "border-line bg-panel/50 text-fog";

  return (
    <div
      className={`mt-4 w-full rounded-sm border px-3 py-3 leading-relaxed ${
        status === "alert"
          ? "text-sm sm:text-base"
          : "text-xs"
      } ${
        status === "alert" && !steady
          ? "motion-safe-alert-flash animate-alertBorder"
          : status === "alert" && steady
          ? "border-alert bg-alert/15"
          : ""
      } ${borderClass}`}
    >
      {status === "alert" && (
        <p className="font-display text-xl font-bold uppercase tracking-[0.12em] sm:text-2xl">
          Siren detected — check surroundings
        </p>
      )}
      {status === "possible" && (
        <p className="font-semibold uppercase tracking-widest">
          Possible siren — {Math.round(confidence * 100)}%
        </p>
      )}
      <p className={status === "alert" || status === "possible" ? "mt-1 opacity-90" : ""}>
        {hint}
      </p>
      {sweepDetected && status !== "alert" && (
        <p className="mt-1 text-[10px] uppercase tracking-widest opacity-80">
          Frequency sweep: detected
        </p>
      )}
    </div>
  );
}
