import type { DetectionSettings, SensitivityPreset } from "@/lib/settings";

const PRESETS: { id: SensitivityPreset; label: string; hint: string }[] = [
  { id: "strict", label: "Strict", hint: "Fewer false alarms" },
  { id: "balanced", label: "Balanced", hint: "Default" },
  { id: "sensitive", label: "Sensitive", hint: "Catch faint sirens" },
];

type SettingsPanelProps = {
  settings: DetectionSettings;
  onPreset: (preset: SensitivityPreset) => void;
  onChange: (patch: Partial<DetectionSettings>) => void;
  disabled?: boolean;
};

export function SettingsPanel({
  settings,
  onPreset,
  onChange,
  disabled,
}: SettingsPanelProps) {
  return (
    <div className="w-full space-y-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-fog">
        Sensitivity
      </h2>

      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPreset(p.id)}
            className={`rounded-sm border px-2 py-2 text-left transition ${
              settings.preset === p.id
                ? "border-signal bg-signal/10 text-paper"
                : "border-line bg-panel/40 text-fog hover:border-fog/40"
            } disabled:opacity-50`}
          >
            <div className="text-xs font-semibold">{p.label}</div>
            <div className="mt-0.5 text-[10px] opacity-80">{p.hint}</div>
          </button>
        ))}
      </div>

      <SliderField
        label="Alert threshold"
        value={settings.alertThreshold}
        min={0.5}
        max={0.95}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        disabled={disabled}
        onChange={(alertThreshold) => onChange({ alertThreshold })}
      />
      <SliderField
        label="Noise floor"
        value={settings.loudnessFloorDb}
        min={-80}
        max={-35}
        step={1}
        format={(v) => `${v} dB`}
        disabled={disabled}
        onChange={(loudnessFloorDb) => onChange({ loudnessFloorDb })}
      />
      <SliderField
        label="Min frequency swing"
        value={settings.swingThresholdHz}
        min={100}
        max={300}
        step={5}
        format={(v) => `${v} Hz`}
        disabled={disabled}
        onChange={(swingThresholdHz) => onChange({ swingThresholdHz })}
      />
      <div className="grid grid-cols-2 gap-3">
        <SliderField
          label="Band min"
          value={settings.minHz}
          min={300}
          max={1200}
          step={50}
          format={(v) => `${v} Hz`}
          disabled={disabled}
          onChange={(minHz) => onChange({ minHz })}
        />
        <SliderField
          label="Band max"
          value={settings.maxHz}
          min={1200}
          max={2500}
          step={50}
          format={(v) => `${v} Hz`}
          disabled={disabled}
          onChange={(maxHz) => onChange({ maxHz })}
        />
      </div>

      {settings.preset === "custom" && (
        <p className="text-[10px] text-fog">Using custom tuning.</p>
      )}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-fog">
        <span>{label}</span>
        <span className="text-paper">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-signal disabled:opacity-50"
      />
    </div>
  );
}
