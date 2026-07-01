import type { CalibrationStatus } from "@/hooks/useCalibration";

type CalibrationPanelProps = {
  status: CalibrationStatus;
  progress: number;
  result: {
    ambientDb: number;
    peakDb: number;
    loudnessFloorDb: number;
    swingThresholdHz: number;
  } | null;
  onStart: () => void;
  onApply: () => void;
  onReset: () => void;
  disabled?: boolean;
};

export function CalibrationPanel({
  status,
  progress,
  result,
  onStart,
  onApply,
  onReset,
  disabled,
}: CalibrationPanelProps) {
  return (
    <div className="w-full space-y-3 rounded-sm border border-line bg-panel/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-fog">
            Environment calibration
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-fog">
            Listen to your room for 10 seconds and auto-set the noise floor.
          </p>
        </div>
      </div>

      {status === "running" && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel">
            <div
              className="h-full rounded-full bg-signal transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-amber">
            Stay quiet — sampling ambient noise…
          </p>
        </div>
      )}

      {status === "done" && result && (
        <div className="text-xs text-fog">
          <p>
            Ambient level: <span className="text-paper">{result.ambientDb} dB</span>
            {" · "}
            Peak: <span className="text-paper">{result.peakDb} dB</span>
          </p>
          <p className="mt-1">
            Suggested noise floor:{" "}
            <span className="text-signal">{result.loudnessFloorDb} dB</span>
            {" · "}
            Min swing:{" "}
            <span className="text-signal">{result.swingThresholdHz} Hz</span>
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="text-xs text-alert">
          Not enough samples — try again in a quieter moment.
        </p>
      )}

      {status === "denied" && (
        <p className="text-xs text-alert">
          Microphone access is required for calibration.
        </p>
      )}

      <div className="flex gap-2">
        {status === "idle" || status === "error" || status === "denied" ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onStart}
            className="flex-1 rounded-sm border border-line bg-panel py-2 text-xs font-semibold uppercase tracking-widest text-fog transition hover:border-signal/40 hover:text-signal disabled:opacity-50"
          >
            Calibrate
          </button>
        ) : status === "running" ? (
          <button
            type="button"
            disabled
            className="flex-1 rounded-sm border border-line bg-panel py-2 text-xs font-semibold uppercase tracking-widest text-fog opacity-50"
          >
            Calibrating…
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 rounded-sm border border-signal/40 bg-signal/10 py-2 text-xs font-semibold uppercase tracking-widest text-signal transition hover:bg-signal/20"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-sm border border-line bg-panel px-3 py-2 text-xs uppercase tracking-widest text-fog"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
