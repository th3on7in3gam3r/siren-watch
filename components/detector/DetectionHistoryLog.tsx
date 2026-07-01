import type { HistoryRecord } from "@/lib/detectionHistory";

type DetectionHistoryLogProps = {
  history: HistoryRecord[];
  loading: boolean;
  onExport: () => void;
  onClear: () => void;
  onShare?: (record: HistoryRecord) => void;
  shareBusyId?: string | null;
  onFalsePositive?: (record: HistoryRecord) => void;
};

export function DetectionHistoryLog({
  history,
  loading,
  onExport,
  onClear,
  onShare,
  shareBusyId,
  onFalsePositive,
}: DetectionHistoryLogProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fog">
          Detection history
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={history.length === 0}
            onClick={onExport}
            className="rounded-sm border border-line px-2 py-1 text-[10px] uppercase tracking-widest text-fog transition hover:border-signal/40 hover:text-signal disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            type="button"
            disabled={history.length === 0}
            onClick={onClear}
            className="rounded-sm border border-line px-2 py-1 text-[10px] uppercase tracking-widest text-fog transition hover:border-alert/40 hover:text-alert disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-xs text-fog">Loading history…</p>
      ) : history.length === 0 ? (
        <p className="mt-3 text-xs text-fog">
          No detections saved yet. Alerts are stored locally on this device.
        </p>
      ) : (
        <div className="mt-2 max-h-64 divide-y divide-line overflow-y-auto border border-line">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-1 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-alert">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-fog">
                <span>
                  {entry.peakFreq} Hz · {entry.loudnessDb} dB ·{" "}
                  {Math.round(entry.confidence * 100)}%
                  {entry.aiLabel ? ` · ${entry.aiLabel}` : ""}
                  {entry.feedback === "false_positive" && (
                    <span className="text-amber"> · not a siren</span>
                  )}
                </span>
                {onFalsePositive && entry.feedback !== "false_positive" && (
                  <button
                    type="button"
                    onClick={() => onFalsePositive(entry)}
                    className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition hover:border-amber/40 hover:text-amber"
                  >
                    Not a siren
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    disabled={shareBusyId === entry.id}
                    onClick={() => onShare(entry)}
                    className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition hover:border-signal/40 hover:text-signal disabled:opacity-40"
                  >
                    {shareBusyId === entry.id ? "…" : "Share"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Info() {
  return (
    <div className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-fog">
      <p>
        <span className="text-paper">How this works —</span> a fast heuristic
        watches for a tone sweeping 500–1800 Hz at a siren-like rate, while a
        pretrained YAMNet model checks the same audio against 521 real-world
        sound classes. When AI is inconclusive, the sweep heuristic can still
        alert. Mark false alarms with &ldquo;Not a siren&rdquo; on History.
      </p>
      <p className="mt-2">
        <span className="text-paper">Tuning —</span> use sensitivity presets or
        calibrate for your room. History is saved locally in your browser via
        IndexedDB.
      </p>
      <p className="mt-2">
        <span className="text-paper">Install —</span> deploy over HTTPS, open on
        your phone, and add to your home screen as a PWA. Enable notifications
        for alerts when a siren is detected.
      </p>
      <p className="mt-2">
        Audio never leaves your device — detection runs entirely in the
        browser.
      </p>
    </div>
  );
}
