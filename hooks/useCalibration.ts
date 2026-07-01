"use client";

import { useCallback, useRef, useState } from "react";
import {
  analyzeCalibration,
  applyCalibration,
  captureCalibrationSample,
  CALIBRATION_DURATION_MS,
} from "@/lib/calibration";
import type { DetectionSettings } from "@/lib/settings";

export type CalibrationStatus =
  | "idle"
  | "running"
  | "done"
  | "error"
  | "denied";

export function useCalibration(
  onApply: (settings: DetectionSettings) => void
) {
  const [status, setStatus] = useState<CalibrationStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    ambientDb: number;
    peakDb: number;
    loudnessFloorDb: number;
    swingThresholdHz: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("denied");
      return;
    }

    setStatus("running");
    setProgress(0);
    setResult(null);
    stopTimer();

    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = performance.now() - startTime;
      setProgress(Math.min(1, elapsed / CALIBRATION_DURATION_MS));
    }, 100);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const samples = await captureCalibrationSample(stream);
      stopTimer();
      setProgress(1);

      const analysis = analyzeCalibration(samples);
      if (!analysis) {
        setStatus("error");
        return;
      }

      setResult(analysis);
      setStatus("done");
    } catch {
      stopTimer();
      setStatus("denied");
    }
  }, []);

  const apply = useCallback(
    (currentSettings: DetectionSettings) => {
      if (!result) return;
      onApply(applyCalibration(currentSettings, result));
      setStatus("idle");
      setResult(null);
      setProgress(0);
    },
    [onApply, result]
  );

  const reset = useCallback(() => {
    stopTimer();
    setStatus("idle");
    setProgress(0);
    setResult(null);
  }, []);

  return { status, progress, result, start, apply, reset };
}
