"use client";

import type { useCalibration } from "@/hooks/useCalibration";
import type { useRemotePush } from "@/hooks/useRemotePush";
import type { useSirenDetection } from "@/hooks/useSirenDetection";
import type { DetectionSettings } from "@/lib/settings";
import { CalibrationPanel } from "@/components/detector/CalibrationPanel";
import { SettingsPanel } from "@/components/detector/SettingsPanel";
import { RemotePushPanel } from "@/components/detector/RemotePushPanel";
import { Info } from "@/components/detector/DetectionHistoryLog";

type SettingsTabProps = {
  settings: DetectionSettings;
  detection: ReturnType<typeof useSirenDetection>;
  calibration: ReturnType<typeof useCalibration>;
  remotePush: ReturnType<typeof useRemotePush>;
  onPreset: (preset: DetectionSettings["preset"]) => void;
  onChange: (patch: Partial<DetectionSettings>) => void;
  onWakeLockToggle: () => void;
  onRemoteEnable: () => void;
  onRemoteDisable: () => void;
};

export function SettingsTab({
  settings,
  detection,
  calibration,
  remotePush,
  onPreset,
  onChange,
  onWakeLockToggle,
  onRemoteEnable,
  onRemoteDisable,
}: SettingsTabProps) {
  return (
    <div className="mt-6 space-y-6" role="tabpanel" aria-label="Settings">
      <CalibrationPanel
        status={calibration.status}
        progress={calibration.progress}
        result={calibration.result}
        onStart={calibration.start}
        onApply={() => calibration.apply(settings)}
        onReset={calibration.reset}
        disabled={detection.listening}
      />

      <SettingsPanel
        settings={settings}
        onPreset={onPreset}
        onChange={onChange}
        disabled={calibration.status === "running"}
      />

      {detection.wakeLockSupported && (
        <label className="flex w-full cursor-pointer items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs text-fog">
          <input
            type="checkbox"
            checked={settings.wakeLockEnabled}
            onChange={onWakeLockToggle}
            className="accent-signal"
          />
          <span>
            Keep screen on while listening
            {detection.wakeLockActive ? (
              <span className="text-signal"> — active</span>
            ) : settings.wakeLockEnabled ? (
              <span className="text-amber"> — enables on start</span>
            ) : null}
          </span>
        </label>
      )}

      <div className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fog">
          Alert attention
        </h2>
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs text-fog">
              <input
                type="checkbox"
                checked={settings.flashAlertEnabled}
                onChange={(e) => onChange({ flashAlertEnabled: e.target.checked })}
                className="accent-alert"
              />
              <span>
                Flash screen on siren alert
                <span className="block text-[10px] text-fog/80">
                  Full-screen red flash + browser tab title blink
                </span>
              </span>
            </label>
            <label className="flex w-full cursor-pointer items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs text-fog">
              <input
                type="checkbox"
                checked={settings.steadyAlertEnabled}
                disabled={!settings.flashAlertEnabled}
                onChange={(e) =>
                  onChange({ steadyAlertEnabled: e.target.checked })
                }
                className="accent-alert disabled:opacity-40"
              />
              <span>
                Steady alert (no pulse)
                <span className="block text-[10px] text-fog/80">
                  Solid red bars instead of flashing — better for photosensitivity
                </span>
              </span>
            </label>
        <label
          className={`flex w-full items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs ${
            detection.hapticSupported ? "cursor-pointer text-fog" : "text-fog/50"
          }`}
        >
          <input
            type="checkbox"
            checked={settings.hapticAlertEnabled}
            disabled={!detection.hapticSupported}
            onChange={(e) => onChange({ hapticAlertEnabled: e.target.checked })}
            className="accent-alert disabled:opacity-40"
          />
          <span>
            Vibrate on siren alert
            <span className="block text-[10px] text-fog/80">
              {detection.hapticSupported
                ? "Repeating pulse while alert is active"
                : "Not supported in this browser"}
            </span>
          </span>
        </label>
        <label className="flex w-full cursor-pointer items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs text-fog">
          <input
            type="checkbox"
            checked={settings.soundAlertEnabled}
            onChange={(e) => onChange({ soundAlertEnabled: e.target.checked })}
            className="accent-alert"
          />
          <span>
            Play alert tone when app is open
            <span className="block text-[10px] text-fog/80">
              Alternating beeps while alert is active (works on silent if volume up)
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fog">
          Share &amp; privacy
        </h2>
        <label className="flex w-full cursor-pointer items-center gap-3 rounded-sm border border-line bg-panel/40 px-3 py-2.5 text-xs text-fog">
          <input
            type="checkbox"
            checked={settings.shareLocationEnabled}
            onChange={(e) =>
              onChange({ shareLocationEnabled: e.target.checked })
            }
            className="accent-signal"
          />
          <span>
            Include location when sharing a detection
            <span className="block text-[10px] text-fog/80">
              Opt-in only — asks for GPS when you tap Share
            </span>
          </span>
        </label>
      </div>

      <RemotePushPanel
        status={remotePush.status}
        loading={remotePush.loading}
        configured={remotePush.configured}
        serverReady={remotePush.serverReady}
        enabled={settings.remotePushEnabled}
        onEnable={onRemoteEnable}
        onDisable={onRemoteDisable}
        onToggleEnabled={(remotePushEnabled) =>
          onChange({ remotePushEnabled })
        }
      />

      <Info />
    </div>
  );
}
