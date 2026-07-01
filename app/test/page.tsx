"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSettings } from "@/hooks/useSettings";
import {
  HARNESS_CASES,
  runHarnessSuite,
  summarizeHarness,
  type HarnessResult,
} from "@/lib/testHarness";

export default function TestHarnessPage() {
  const { settings } = useSettings();
  const [results, setResults] = useState<HarnessResult[] | null>(null);
  const [running, setRunning] = useState(false);

  const summary = useMemo(
    () => (results ? summarizeHarness(results) : null),
    [results]
  );

  const run = () => {
    setRunning(true);
    requestAnimationFrame(() => {
      const next = runHarnessSuite(settings);
      setResults(next);
      setRunning(false);
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-paper">
            Detection test harness
          </h1>
          <p className="mt-1 text-xs text-fog">
            Synthetic clips · heuristic + specialist scoring (YAMNet off in batch
            mode)
          </p>
        </div>
        <Link
          href="/"
          className="text-xs uppercase tracking-widest text-signal hover:underline"
        >
          ← App
        </Link>
      </div>

      <div className="mt-6 rounded-sm border border-line bg-panel/40 p-4 text-xs text-fog">
        <p>
          Preset: <span className="text-paper">{settings.preset}</span> · Alert
          at {Math.round(settings.alertThreshold * 100)}% · Noise floor{" "}
          {settings.loudnessFloorDb} dB · Swing {settings.swingThresholdHz} Hz
        </p>
        <button
          type="button"
          disabled={running}
          onClick={run}
          className="mt-4 w-full rounded-sm border border-signal/40 bg-signal/10 py-3 font-display text-sm font-semibold uppercase tracking-wide text-signal transition hover:bg-signal/20 disabled:opacity-50"
        >
          {running ? "Running…" : "Run all tests"}
        </button>
      </div>

      {summary && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-sm border border-line bg-panel/60 px-2 py-3">
            <div className="text-lg font-display text-paper">
              {summary.passed}/{summary.total}
            </div>
            <div className="text-fog">Passed</div>
          </div>
          <div className="rounded-sm border border-line bg-panel/60 px-2 py-3">
            <div className="text-lg font-display text-signal">
              {Math.round(summary.truePositiveRate * 100)}%
            </div>
            <div className="text-fog">Siren recall</div>
          </div>
          <div className="rounded-sm border border-line bg-panel/60 px-2 py-3">
            <div className="text-lg font-display text-amber">
              {Math.round(summary.falsePositiveRate * 100)}%
            </div>
            <div className="text-fog">False positive</div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {HARNESS_CASES.map((tc) => {
          const result = results?.find((r) => r.case.id === tc.id);
          return (
            <div
              key={tc.id}
              className="rounded-sm border border-line bg-panel/40 px-3 py-3 text-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-paper">{tc.label}</div>
                  <div className="mt-0.5 text-fog">{tc.description}</div>
                </div>
                {result ? (
                  <span
                    className={
                      result.passed ? "text-signal" : "text-alert"
                    }
                  >
                    {result.passed ? "PASS" : "FAIL"}
                  </span>
                ) : (
                  <span className="text-fog">—</span>
                )}
              </div>
              {result && (
                <p className="mt-2 text-fog">
                  Sweep: {result.sweepDetected ? "yes" : "no"} · Max confidence:{" "}
                  {Math.round(result.maxConfidence * 100)}% · Alerted:{" "}
                  {result.alerted ? "yes" : "no"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
