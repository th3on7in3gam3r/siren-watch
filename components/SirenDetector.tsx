"use client";

import { useCallback, useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useDetectionHistory } from "@/hooks/useDetectionHistory";
import { useCalibration } from "@/hooks/useCalibration";
import { useSirenDetection } from "@/hooks/useSirenDetection";
import { useRemotePush } from "@/hooks/useRemotePush";
import { Header, BackgroundBanner } from "@/components/detector/DetectorHeader";
import { TabBar, type AppTab } from "@/components/detector/TabBar";
import { AlertFlashOverlay } from "@/components/detector/AlertFlashOverlay";
import { SnoozeBanner } from "@/components/detector/SnoozeBanner";
import { ListenTab } from "@/components/detector/ListenTab";
import { SettingsTab } from "@/components/detector/SettingsTab";
import { HistoryTab } from "@/components/detector/HistoryTab";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { LegalFooter } from "@/components/LegalFooter";
import { shareDetection } from "@/lib/shareDetection";
import type { HistoryRecord } from "@/lib/detectionHistory";

export default function SirenDetector() {
  const [activeTab, setActiveTab] = useState<AppTab>("listen");
  const [shareBusyId, setShareBusyId] = useState<string | null>(null);

  const {
    settings,
    settingsRef,
    setPreset,
    updateSettings,
    replaceSettings,
  } = useSettings();

  const {
    history,
    loading: historyLoading,
    logDetection,
    clearHistory,
    exportCsv,
    reportFalsePositive,
  } = useDetectionHistory();

  const calibration = useCalibration(replaceSettings);
  const remotePush = useRemotePush();

  const detection = useSirenDetection({
    settingsRef,
    onDetection: (record) => {
      void logDetection(record);
    },
  });

  const handleWakeLockToggle = useCallback(async () => {
    const next = await detection.toggleWakeLock();
    updateSettings({ wakeLockEnabled: next });
  }, [detection, updateSettings]);

  const handleShare = useCallback(
    async (record: HistoryRecord) => {
      setShareBusyId(record.id);
      try {
        await shareDetection(record, settings.shareLocationEnabled);
      } finally {
        setShareBusyId(null);
      }
    },
    [settings.shareLocationEnabled]
  );

  const handleShareLast = useCallback(() => {
    const latest = history[0];
    if (latest) void handleShare(latest);
  }, [history, handleShare]);

  const handleFalsePositive = useCallback(
    async (record: HistoryRecord) => {
      await reportFalsePositive(record.id);
    },
    [reportFalsePositive]
  );

  const handleFalsePositiveLatest = useCallback(() => {
    const latest = history[0];
    if (latest) void handleFalsePositive(latest);
  }, [history, handleFalsePositive]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8 sm:max-w-lg">
      <OnboardingFlow
        onCalibrate={() => {
          setActiveTab("settings");
        }}
      />

      <AlertFlashOverlay
        active={
          detection.status === "alert" &&
          detection.sweepDetected &&
          settings.flashAlertEnabled
        }
        steady={settings.steadyAlertEnabled}
      />

      <Header
        status={detection.status}
        classifierState={detection.classifierState}
        notificationStatus={detection.notificationStatus}
      />

      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        historyCount={history.length}
      />

      <SnoozeBanner />

      <BackgroundBanner
        listening={detection.listening}
        isPageVisible={detection.isPageVisible}
        audioContextState={detection.audioContextState}
        wakeLockActive={detection.wakeLockActive}
      />

      {activeTab === "listen" && (
        <ListenTab
          detection={detection}
          settings={settings}
          onShareLast={history.length > 0 ? handleShareLast : undefined}
          shareBusy={shareBusyId !== null}
          onFalsePositive={
            history.length > 0 ? handleFalsePositiveLatest : undefined
          }
          remotePushConfigured={remotePush.configured}
          remotePushSubscribed={remotePush.status === "subscribed"}
          remotePushLoading={remotePush.loading}
          remotePushError={remotePush.errorMessage}
          remotePushServerReady={remotePush.serverReady}
          onEnableRemotePush={() => {
            void remotePush.enable().then((next) => {
              if (next === "subscribed") {
                updateSettings({ remotePushEnabled: true });
              }
            });
          }}
        />
      )}

      {activeTab === "settings" && (
        <SettingsTab
          settings={settings}
          detection={detection}
          calibration={calibration}
          remotePush={remotePush}
          onPreset={setPreset}
          onChange={updateSettings}
          onWakeLockToggle={() => void handleWakeLockToggle()}
          onRemoteEnable={() => {
            void remotePush.enable().then((next) => {
              if (next === "subscribed") {
                updateSettings({ remotePushEnabled: true });
              }
            });
          }}
          onRemoteDisable={() => {
            void remotePush.disable().then(() => {
              updateSettings({ remotePushEnabled: false });
            });
          }}
        />
      )}

      {activeTab === "history" && (
        <HistoryTab
          history={history}
          loading={historyLoading}
          onExport={exportCsv}
          onClear={clearHistory}
          onShare={(record) => void handleShare(record)}
          shareBusyId={shareBusyId}
          onFalsePositive={(record) => void handleFalsePositive(record)}
        />
      )}

      <LegalFooter />
    </div>
  );
}
