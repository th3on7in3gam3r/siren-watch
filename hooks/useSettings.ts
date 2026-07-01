"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  settingsFromPreset,
  type DetectionSettings,
  type SensitivityPreset,
} from "@/lib/settings";

export function useSettings() {
  const [settings, setSettingsState] = useState<DetectionSettings>(
    DEFAULT_SETTINGS
  );
  const [hydrated, setHydrated] = useState(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    const loaded = loadSettings();
    setSettingsState(loaded);
    settingsRef.current = loaded;
    setHydrated(true);
  }, []);

  const persist = useCallback((next: DetectionSettings) => {
    settingsRef.current = next;
    setSettingsState(next);
    saveSettings(next);
  }, []);

  const setPreset = useCallback(
    (preset: SensitivityPreset) => {
      persist(settingsFromPreset(preset, settingsRef.current));
    },
    [persist]
  );

  const updateSettings = useCallback(
    (patch: Partial<DetectionSettings>) => {
      persist({ ...settingsRef.current, ...patch, preset: "custom" });
    },
    [persist]
  );

  const replaceSettings = useCallback(
    (next: DetectionSettings) => {
      persist(next);
    },
    [persist]
  );

  return {
    settings,
    settingsRef,
    hydrated,
    setPreset,
    updateSettings,
    replaceSettings,
  };
}
