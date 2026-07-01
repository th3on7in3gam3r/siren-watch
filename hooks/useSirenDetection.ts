"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClassifierState, ClassificationResult } from "@/lib/yamnet";
import type { SpecialistState } from "@/lib/sirenSpecialist";
import { resampleTo16k, RollingAudioBuffer } from "@/lib/audioUtils";
import {
  getDetectionHint,
  type FrequencySample,
} from "@/lib/detection";
import {
  runDetectionStep,
  type ConfidenceState,
} from "@/lib/detectionEngine";
import {
  ensureNotificationsReady,
  enableRemotePush,
  getNotificationStatus,
  notifySirenAlert,
  relayPushAlert,
  startAlertHapticPulse,
  stopAlertHapticPulse,
  type NotificationStatus,
} from "@/lib/notifications";
import { isAlertsSnoozed } from "@/lib/alertSnooze";
import { reportError, reportEvent } from "@/lib/monitoring";
import { synthesizeDemoSiren } from "@/lib/testHarness";
import {
  isWakeLockSupported,
  requestWakeLock,
  releaseWakeLock,
} from "@/lib/wakeLock";
import {
  isVibrationSupported,
  startSirenVibration,
  startSirenAlertTone,
  startTitleFlash,
  stopAllAttentionAlerts,
} from "@/lib/attentionAlert";
import type { DetectionSettings } from "@/lib/settings";
import type { HistoryRecord } from "@/lib/detectionHistory";

const CLASSIFIER_WINDOW_SEC = 1.5;
const CLASSIFIER_INTERVAL_MS = 1200;
const DETECTION_TICK_MS = 50;
const LOG_COOLDOWN_MS = 5000;

type MlApi = {
  classifyWaveform: (
    waveform: Float32Array
  ) => Promise<ClassificationResult | null>;
  classifySirenSpecialist: (waveform: Float32Array) => Promise<number>;
  isYamnetReady: () => boolean;
};

type WorkletPcmMessage = { type: "pcm"; samples: Float32Array };
type WorkletSpectrumMessage = {
  type: "spectrum";
  peak: number;
  db: number;
  bars: number[];
  timestamp: number;
};

export type ListeningStatus =
  | "idle"
  | "requesting"
  | "listening"
  | "possible"
  | "alert"
  | "denied"
  | "unsupported";

type UseSirenDetectionOptions = {
  settingsRef: React.MutableRefObject<DetectionSettings>;
  onDetection: (
    record: Omit<HistoryRecord, "id" | "timestamp">
  ) => void | Promise<void>;
};

export function useSirenDetection({
  settingsRef,
  onDetection,
}: UseSirenDetectionOptions) {
  const [status, setStatus] = useState<ListeningStatus>("idle");
  const [confidence, setConfidence] = useState(0);
  const [heuristicConfidence, setHeuristicConfidence] = useState(0);
  const [peakFreq, setPeakFreq] = useState(0);
  const [loudnessDb, setLoudnessDb] = useState(-100);
  const [bars, setBars] = useState<number[]>(new Array(32).fill(0));
  const [classifierState, setClassifierState] =
    useState<ClassifierState>("unloaded");
  const [specialistState, setSpecialistState] =
    useState<SpecialistState>("unloaded");
  const [specialistScore, setSpecialistScore] = useState(0);
  const [yamnetScore, setYamnetScore] = useState(0);
  const [yamnetTop, setYamnetTop] = useState<ClassificationResult | null>(null);
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>("default");
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [audioContextState, setAudioContextState] =
    useState<AudioContextState>("running");
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [hapticSupported, setHapticSupported] = useState(false);
  const [sweepDetected, setSweepDetected] = useState(false);
  const [detectionHint, setDetectionHint] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const historyRef = useRef<FrequencySample[]>([]);
  const confidenceStateRef = useRef<ConfidenceState>({
    confidence: 0,
    yamnetScore: 0,
    specialistScore: 0,
    lastEvidenceAt: null,
  });
  const spectrumRef = useRef<{
    peak: number;
    db: number;
    newBars: number[];
  } | null>(null);
  const yamnetScoreRef = useRef(0);
  const yamnetTopRef = useRef<ClassificationResult | null>(null);
  const classifierReadyRef = useRef(false);
  const lastLoggedRef = useRef(0);
  const lastClassifyRef = useRef(0);
  const classifyingRef = useRef(false);
  const rollingBufferRef = useRef<RollingAudioBuffer | null>(null);
  const lastDetectionTickRef = useRef(0);
  const pageVisibleRef = useRef(true);
  const listeningRef = useRef(false);
  const demoModeRef = useRef(false);
  const demoSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sweepSinceRef = useRef<number | null>(null);
  const mlRef = useRef<MlApi | null>(null);

  useEffect(() => {
    classifierReadyRef.current = classifierState === "ready";
  }, [classifierState]);

  useEffect(() => {
    setNotificationStatus(getNotificationStatus());
    setWakeLockSupported(isWakeLockSupported());
    setHapticSupported(isVibrationSupported());
  }, []);

  useEffect(() => {
    const settings = settingsRef.current;
    const active =
      status === "alert" && sweepDetected && !isAlertsSnoozed();
    if (active) {
      if (settings.flashAlertEnabled) startTitleFlash();
      if (settings.hapticAlertEnabled) {
        if (getNotificationStatus() === "granted") {
          startAlertHapticPulse();
        } else {
          startSirenVibration();
        }
      }
      if (settings.soundAlertEnabled) startSirenAlertTone();
    } else {
      stopAlertHapticPulse();
      stopAllAttentionAlerts();
    }
    return () => {
      stopAlertHapticPulse();
      stopAllAttentionAlerts();
    };
  }, [status, sweepDetected, settingsRef]);

  useEffect(() => {
    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      pageVisibleRef.current = visible;
      setIsPageVisible(visible);

      const ctx = audioCtxRef.current;
      if (visible && ctx?.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (
        visible &&
        listeningRef.current &&
        settingsRef.current.wakeLockEnabled &&
        isWakeLockSupported()
      ) {
        requestWakeLock().then((ok) => setWakeLockActive(ok));
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [settingsRef]);

  const runDetectionTick = useCallback(() => {
    const reading = spectrumRef.current;
    if (!reading) return;

    const settings = settingsRef.current;
    const now = performance.now();
    const hasYamnetSignal =
      classifierReadyRef.current || (mlRef.current?.isYamnetReady() ?? false);

    const step = runDetectionStep(
      reading,
      historyRef.current,
      settings,
      confidenceStateRef.current,
      sweepSinceRef.current,
      now,
      hasYamnetSignal
    );

    historyRef.current = step.history;
    sweepSinceRef.current = step.sweepSince;

    const {
      evidence,
      heuristicConf,
      blended,
      peak,
      db,
      bars,
      sustainedSweepMs,
    } = step.result;

    setSweepDetected(evidence);
    setPeakFreq(Math.round(peak));
    setLoudnessDb(Math.round(db));
    if (!pageVisibleRef.current) {
      setBars(bars);
    }
    setHeuristicConfidence(heuristicConf);
    setSpecialistScore(confidenceStateRef.current.specialistScore);
    setYamnetScore(confidenceStateRef.current.yamnetScore);
    setConfidence(blended);

    setDetectionHint(
      getDetectionHint({
        loudnessDb: Math.round(db),
        loudnessFloorDb: settings.loudnessFloorDb,
        sweepDetected: evidence,
        confidence: blended,
        alertThreshold: settings.alertThreshold,
        yamnetScore: confidenceStateRef.current.yamnetScore,
        classifierReady: hasYamnetSignal,
        classifierLoading: classifierState === "loading",
      })
    );

    const threshold = settings.alertThreshold;
    const snoozed = isAlertsSnoozed();
    const lastEvidenceAt = confidenceStateRef.current.lastEvidenceAt;
    const msSinceEvidence =
      lastEvidenceAt === null ? Infinity : now - lastEvidenceAt;
    const sustainedAlert = evidence || msSinceEvidence < 700;

    if (!snoozed && blended >= threshold && sustainedAlert) {
      setStatus("alert");
      if (!demoModeRef.current && now - lastLoggedRef.current > LOG_COOLDOWN_MS) {
        lastLoggedRef.current = now;
        const payload = {
          peakFreq: Math.round(peak),
          loudnessDb: Math.round(db),
          confidence: blended,
          aiLabel: yamnetTopRef.current?.sirenLabel ?? null,
        };
        void notifySirenAlert(payload);
        if (settingsRef.current.remotePushEnabled) {
          void relayPushAlert(payload);
        }
        void onDetection(payload);
      }
    } else if (
      blended >= threshold * 0.4 ||
      evidence ||
      confidenceStateRef.current.yamnetScore >= 0.18
    ) {
      setStatus("possible");
    } else {
      setStatus("listening");
    }
  }, [onDetection, settingsRef, classifierState]);

  const maybeRunClassifier = useCallback((sampleRate: number) => {
    const buffer = rollingBufferRef.current;
    if (!buffer || !buffer.isFull()) return;
    if (classifyingRef.current) return;
    const now = performance.now();
    if (now - lastClassifyRef.current < CLASSIFIER_INTERVAL_MS) return;
    lastClassifyRef.current = now;
    classifyingRef.current = true;

    const snapshot = buffer.toFloat32Array();
    const ml = mlRef.current;
    if (!ml) {
      classifyingRef.current = false;
      return;
    }

    (async () => {
      try {
        const resampled = await resampleTo16k(snapshot, sampleRate);
        const [result, specialist] = await Promise.all([
          ml.classifyWaveform(resampled),
          ml.classifySirenSpecialist(resampled),
        ]);
        if (result) {
          confidenceStateRef.current.yamnetScore +=
            (result.sirenScore - confidenceStateRef.current.yamnetScore) * 0.4;
          yamnetScoreRef.current = confidenceStateRef.current.yamnetScore;
          yamnetTopRef.current = result;
          setYamnetScore(confidenceStateRef.current.yamnetScore);
          setYamnetTop(result);
        }
        confidenceStateRef.current.specialistScore +=
          (specialist - confidenceStateRef.current.specialistScore) * 0.35;
        setSpecialistScore(confidenceStateRef.current.specialistScore);
      } catch (err) {
        reportError("classifier_error", err);
      } finally {
        classifyingRef.current = false;
      }
    })();
  }, []);

  const startUiLoop = useCallback(() => {
    const tick = () => {
      if (!listeningRef.current) return;

      if (
        pageVisibleRef.current &&
        spectrumRef.current
      ) {
        setBars(spectrumRef.current.newBars);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const loadMlModels = useCallback(() => {
    void (async () => {
      const [yamnet, specialist] = await Promise.all([
        import("@/lib/yamnet"),
        import("@/lib/sirenSpecialist"),
      ]);
      mlRef.current = {
        classifyWaveform: yamnet.classifyWaveform,
        classifySirenSpecialist: specialist.classifySirenSpecialist,
        isYamnetReady: yamnet.isYamnetReady,
      };
      void yamnet.loadYamnet(setClassifierState).catch((err) => {
        setClassifierState("error");
        reportError("yamnet_load_failed", err);
      });
      void specialist.loadSirenSpecialist(setSpecialistState).catch((err) => {
        setSpecialistState("fallback");
        reportError("specialist_load_failed", err);
      });
    })();
  }, []);

  const connectWorklet = useCallback(
    async (ctx: AudioContext, input: AudioNode, outputGain: number) => {
      await ctx.audioWorklet.addModule("/pcm-capture-processor.js");
      rollingBufferRef.current = new RollingAudioBuffer(
        Math.ceil(ctx.sampleRate * CLASSIFIER_WINDOW_SEC)
      );
      const workletNode = new AudioWorkletNode(ctx, "pcm-capture-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      workletNode.port.postMessage({
        type: "config",
        minHz: settingsRef.current.minHz,
        maxHz: settingsRef.current.maxHz,
      });
      const sampleRate = ctx.sampleRate;
      workletNode.port.onmessage = (
        event: MessageEvent<WorkletPcmMessage | WorkletSpectrumMessage>
      ) => {
        if (event.data?.type === "spectrum") {
          spectrumRef.current = {
            peak: event.data.peak,
            db: event.data.db,
            newBars: event.data.bars,
          };
          const now = performance.now();
          if (now - lastDetectionTickRef.current < DETECTION_TICK_MS) return;
          lastDetectionTickRef.current = now;
          runDetectionTick();
          return;
        }

        if (event.data?.type !== "pcm") return;
        rollingBufferRef.current?.push(event.data.samples);
        maybeRunClassifier(sampleRate);
      };
      const gain = ctx.createGain();
      gain.gain.value = outputGain;
      input.connect(workletNode);
      workletNode.connect(gain);
      gain.connect(ctx.destination);
      workletRef.current = workletNode;
      return sampleRate;
    },
    [maybeRunClassifier, runDetectionTick, settingsRef]
  );

  const stop = useCallback(() => {
    listeningRef.current = false;
    demoModeRef.current = false;
    if (demoSourceRef.current) {
      try {
        demoSourceRef.current.stop();
      } catch {
        // already stopped
      }
      demoSourceRef.current.disconnect();
      demoSourceRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    void releaseWakeLock();
    setWakeLockActive(false);
    if (workletRef.current) {
      workletRef.current.port.onmessage = null;
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    rollingBufferRef.current = null;
    spectrumRef.current = null;
    historyRef.current = [];
    confidenceStateRef.current = {
      confidence: 0,
      yamnetScore: 0,
      specialistScore: 0,
      lastEvidenceAt: null,
    };
    yamnetScoreRef.current = 0;
    yamnetTopRef.current = null;
    mlRef.current = null;
    classifierReadyRef.current = false;
    setConfidence(0);
    setHeuristicConfidence(0);
    setYamnetScore(0);
    setSpecialistScore(0);
    setSpecialistState("unloaded");
    setYamnetTop(null);
    setBars(new Array(32).fill(0));
    sweepSinceRef.current = null;
    setSweepDetected(false);
    stopAlertHapticPulse();
    stopAllAttentionAlerts();
    setDetectionHint("");
    setAudioContextState("running");
    setIsDemoMode(false);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof AudioWorkletNode === "undefined"
    ) {
      setStatus("unsupported");
      reportEvent("mic_unsupported");
      return;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      ctx.addEventListener("statechange", () => {
        setAudioContextState(ctx.state);
      });

      const source = ctx.createMediaStreamSource(stream);
      await connectWorklet(ctx, source, 0);

      const permission = await ensureNotificationsReady();
      setNotificationStatus(permission);

      if (settingsRef.current.wakeLockEnabled && isWakeLockSupported()) {
        const ok = await requestWakeLock();
        setWakeLockActive(ok);
      }

      setIsDemoMode(false);
      listeningRef.current = true;
      setStatus("listening");
      startUiLoop();
      loadMlModels();

      if (settingsRef.current.remotePushEnabled) {
        void enableRemotePush().then((status) => {
          if (status === "server-unconfigured") {
            settingsRef.current = {
              ...settingsRef.current,
              remotePushEnabled: false,
            };
          }
        });
      }
    } catch (err) {
      setStatus("denied");
      reportEvent("mic_denied");
      reportError("mic_denied", err);
    }
  }, [connectWorklet, loadMlModels, settingsRef, startUiLoop]);

  const startDemo = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (typeof AudioWorkletNode === "undefined") {
      setStatus("unsupported");
      return;
    }

    stop();
    setStatus("requesting");

    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      ctx.addEventListener("statechange", () => {
        setAudioContextState(ctx.state);
      });

      const samples = synthesizeDemoSiren(ctx.sampleRate);
      const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
      buffer.getChannelData(0).set(samples);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.start(0);
      demoSourceRef.current = source;

      await connectWorklet(ctx, source, 0.25);

      demoModeRef.current = true;
      setIsDemoMode(true);
      listeningRef.current = true;
      setStatus("listening");
      setDetectionHint("Demo mode — synthetic siren clip, no microphone");
      startUiLoop();
      loadMlModels();
    } catch (err) {
      stop();
      setStatus("unsupported");
      reportError("classifier_error", err);
    }
  }, [connectWorklet, loadMlModels, startUiLoop, stop]);

  const toggleWakeLock = useCallback(async () => {
    const next = !settingsRef.current.wakeLockEnabled;
    settingsRef.current = { ...settingsRef.current, wakeLockEnabled: next };

    if (!next) {
      await releaseWakeLock();
      setWakeLockActive(false);
      return next;
    }

    if (listeningRef.current) {
      const ok = await requestWakeLock();
      setWakeLockActive(ok);
    }
    return next;
  }, [settingsRef]);

  useEffect(() => stop, [stop]);

  return {
    status,
    confidence,
    heuristicConfidence,
    peakFreq,
    loudnessDb,
    bars,
    classifierState,
    specialistState,
    specialistScore,
    yamnetScore,
    yamnetTop,
    notificationStatus,
    isPageVisible,
    audioContextState,
    wakeLockActive,
    wakeLockSupported,
    hapticSupported,
    sweepDetected,
    detectionHint,
    isDemoMode,
    start,
    startDemo,
    stop,
    toggleWakeLock,
    listening: status === "listening" || status === "possible" || status === "alert",
  };
}
