"use client";

import type { useSirenDetection } from "@/hooks/useSirenDetection";
import type { DetectionSettings } from "@/lib/settings";
import {
  Radar,
  Spectrum,
  ConfidenceBreakdown,
  StatusPanel,
} from "@/components/detector/DetectorVisuals";
import { DetectionFeedback } from "@/components/detector/DetectionFeedback";

type Detection = ReturnType<typeof useSirenDetection>;

type ListenTabProps = {
  detection: Detection;
  settings: DetectionSettings;
  onShareLast?: () => void;
  shareBusy?: boolean;
  onFalsePositive?: () => void;
  remotePushConfigured?: boolean;
  remotePushSubscribed?: boolean;
  onEnableRemotePush?: () => void;
  remotePushLoading?: boolean;
  remotePushError?: string | null;
  remotePushServerReady?: boolean | null;
};

export function ListenTab({
  detection,
  settings,
  onShareLast,
  shareBusy,
  onFalsePositive,
  remotePushConfigured,
  remotePushSubscribed,
  onEnableRemotePush,
  remotePushLoading,
  remotePushError,
  remotePushServerReady,
}: ListenTabProps) {
  const isIdle =
    detection.status === "idle" ||
    detection.status === "denied" ||
    detection.status === "unsupported";

  return (
    <div
      className="mt-6 flex flex-col items-center"
      role="tabpanel"
      aria-label="Listen"
    >
      <Radar
        status={detection.status}
        confidence={detection.confidence}
        sweepDetected={detection.sweepDetected}
      />

      <div className="mt-8 w-full">
        <Spectrum
          bars={detection.bars}
          status={detection.status}
          sweepDetected={detection.sweepDetected}
        />
      </div>

      <ConfidenceBreakdown
        heuristicConfidence={detection.heuristicConfidence}
        specialistScore={detection.specialistScore}
        specialistState={detection.specialistState}
        yamnetScore={detection.yamnetScore}
        classifierState={detection.classifierState}
      />

      <StatusPanel
        peakFreq={detection.peakFreq}
        loudnessDb={detection.loudnessDb}
        yamnetTop={detection.yamnetTop}
      />

      <DetectionFeedback
        status={detection.status}
        hint={detection.detectionHint}
        loudnessDb={detection.loudnessDb}
        settings={settings}
        sweepDetected={detection.sweepDetected}
        confidence={detection.confidence}
      />

      {detection.status === "alert" && !detection.isDemoMode && (
        <div className="mt-3 flex w-full gap-2">
          {onFalsePositive && (
            <button
              type="button"
              onClick={onFalsePositive}
              className="flex-1 rounded-sm border border-amber/40 py-2.5 text-xs font-semibold uppercase tracking-widest text-amber transition hover:bg-amber/10"
            >
              Not a siren
            </button>
          )}
          {onShareLast && (
            <button
              type="button"
              disabled={shareBusy}
              onClick={onShareLast}
              className="flex-1 rounded-sm border border-line py-2.5 text-xs font-semibold uppercase tracking-widest text-fog transition hover:border-signal/40 hover:text-signal disabled:opacity-50"
            >
              {shareBusy ? "Preparing…" : "Share"}
            </button>
          )}
        </div>
      )}

      {detection.status === "listening" &&
        !detection.isDemoMode &&
        remotePushConfigured &&
        !remotePushSubscribed && (
          <div className="mt-4 w-full rounded-sm border border-signal/30 bg-signal/5 px-3 py-3 text-xs leading-relaxed text-fog">
            <p>
              <span className="font-semibold text-signal">Background alerts:</span>{" "}
              Register this device for Web Push so you can get notified when the
              tab is closed (within OS limits).
            </p>
            {remotePushError && (
              <p className="mt-2 text-amber">{remotePushError}</p>
            )}
            {remotePushServerReady === false && !remotePushError && (
              <p className="mt-2 text-amber">
                Server push is not configured. Add{" "}
                <code className="text-paper">VAPID_PRIVATE_KEY</code> on Vercel,
                then redeploy.
              </p>
            )}
            {onEnableRemotePush && (
              <button
                type="button"
                disabled={remotePushLoading || remotePushServerReady === false}
                onClick={onEnableRemotePush}
                className="mt-2 rounded-sm border border-signal/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-signal transition hover:bg-signal/10 disabled:opacity-40"
              >
                {remotePushLoading ? "Registering…" : "Enable push backup"}
              </button>
            )}
          </div>
        )}

      <div className="mt-6 w-full">
        {isIdle ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={detection.start}
              className="w-full rounded-sm border border-signal/40 bg-signal/10 py-4 font-display text-lg font-semibold tracking-wide text-signal transition hover:bg-signal/20 active:scale-[0.99]"
            >
              Start listening
            </button>
            <button
              type="button"
              onClick={detection.startDemo}
              className="w-full rounded-sm border border-line bg-panel/40 py-3 font-display text-sm font-semibold tracking-wide text-fog transition hover:border-signal/30 hover:text-signal active:scale-[0.99]"
            >
              Try demo siren
            </button>
            <p className="text-center text-[10px] leading-relaxed text-fog">
              Demo plays a synthetic clip through the detector — no microphone
              needed.
            </p>
          </div>
        ) : (
          <button
            onClick={detection.stop}
            className="w-full rounded-sm border border-line bg-panel py-4 font-display text-lg font-semibold tracking-wide text-fog transition hover:border-fog/50 hover:text-paper active:scale-[0.99]"
          >
            Stop
          </button>
        )}
      </div>

      {detection.isDemoMode && !isIdle && (
        <p className="mt-3 text-center text-xs text-signal">
          Demo mode — alerts and history are not saved.
        </p>
      )}

      {detection.status === "denied" && (
        <p className="mt-3 text-xs text-alert/90">
          Microphone access was blocked. Allow it in your browser&apos;s site
          settings, then try again.
        </p>
      )}
      {detection.status === "unsupported" && (
        <p className="mt-3 text-xs text-alert/90">
          This browser doesn&apos;t support microphone capture. Try a recent
          Chrome, Edge, or Safari.
        </p>
      )}
    </div>
  );
}
