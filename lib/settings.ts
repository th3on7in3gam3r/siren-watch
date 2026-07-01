export type SensitivityPreset = "strict" | "balanced" | "sensitive" | "custom";

export type DetectionSettings = {
  preset: SensitivityPreset;
  minHz: number;
  maxHz: number;
  alertThreshold: number;
  loudnessFloorDb: number;
  swingThresholdHz: number;
  wakeLockEnabled: boolean;
  flashAlertEnabled: boolean;
  steadyAlertEnabled: boolean;
  hapticAlertEnabled: boolean;
  soundAlertEnabled: boolean;
  remotePushEnabled: boolean;
  shareLocationEnabled: boolean;
};

export const DEFAULT_SETTINGS: DetectionSettings = {
  preset: "balanced",
  minHz: 500,
  maxHz: 1800,
  alertThreshold: 0.68,
  loudnessFloorDb: -58,
  swingThresholdHz: 170,
  wakeLockEnabled: true,
  flashAlertEnabled: true,
  steadyAlertEnabled: false,
  hapticAlertEnabled: true,
  soundAlertEnabled: true,
  remotePushEnabled: false,
  shareLocationEnabled: false,
};

const PRESET_OVERRIDES: Record<
  Exclude<SensitivityPreset, "custom">,
  Partial<DetectionSettings>
> = {
  strict: {
    alertThreshold: 0.82,
    loudnessFloorDb: -50,
    swingThresholdHz: 220,
  },
  balanced: {},
  sensitive: {
    alertThreshold: 0.55,
    loudnessFloorDb: -65,
    swingThresholdHz: 120,
  },
};

const STORAGE_KEY = "siren-watch-settings";

export function applyPreset(
  preset: Exclude<SensitivityPreset, "custom">
): DetectionSettings {
  return { ...DEFAULT_SETTINGS, ...PRESET_OVERRIDES[preset], preset };
}

export function loadSettings(): DetectionSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DetectionSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: DetectionSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function settingsFromPreset(
  preset: SensitivityPreset,
  current?: DetectionSettings
): DetectionSettings {
  if (preset === "custom") {
    return { ...(current ?? DEFAULT_SETTINGS), preset: "custom" };
  }
  return applyPreset(preset);
}
