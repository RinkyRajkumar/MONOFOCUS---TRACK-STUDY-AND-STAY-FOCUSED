import { useEffect, useRef, useState } from "react";
import { THEME_OPTIONS } from "@/constants";
import type { Settings, ThemeId } from "@/types";

interface SettingsPageProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

interface NumberFieldProps {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}

interface DurationFieldProps {
  label: string;
  hint: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

interface ToggleFieldProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface ThemeFieldProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

const snapToFive = (value: number, max: number): number =>
  Math.min(max, Math.max(5, Math.round(value / 5) * 5));

const normalizeDurations = (settings: Settings): Settings => ({
  ...settings,
  theme: settings.theme ?? "mono",
  focusMinutes: snapToFive(settings.focusMinutes, 90),
  shortBreakMinutes: snapToFive(settings.shortBreakMinutes, 60),
  longBreakMinutes: snapToFive(settings.longBreakMinutes, 90),
});

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  suffix,
  onChange,
}: NumberFieldProps): React.JSX.Element {
  return (
    <label className="setting-number">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <span className="number-control">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(event) =>
            onChange(
              Math.min(max, Math.max(min, Number(event.target.value) || min)),
            )
          }
        />
        <span>{suffix}</span>
      </span>
    </label>
  );
}

function DurationField({
  label,
  hint,
  value,
  max,
  onChange,
}: DurationFieldProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const values = Array.from({ length: max / 5 }, (_, index) => (index + 1) * 5);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      if (!controlRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectDuration = (minutes: number): void => {
    onChange(minutes);
    setOpen(false);
  };

  return (
    <div className="setting-number">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <div
        className={open ? "duration-picker is-open" : "duration-picker"}
        ref={controlRef}
      >
        <button
          className="number-control select-control"
          type="button"
          aria-label={`${label} in minutes`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="duration-value">{value}</span>
          <span className="duration-suffix">min</span>
        </button>

        <div
          className="duration-menu"
          role="listbox"
          aria-label={`${label} options`}
        >
          {values.map((minutes) => (
            <button
              className={
                minutes === value
                  ? "duration-option is-selected"
                  : "duration-option"
              }
              type="button"
              role="option"
              aria-selected={minutes === value}
              key={minutes}
              onClick={() => selectDuration(minutes)}
            >
              <span>{minutes} min</span>
              <span className="duration-check" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: ToggleFieldProps): React.JSX.Element {
  return (
    <label className="setting-toggle">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

function ThemeField({ value, onChange }: ThemeFieldProps): React.JSX.Element {
  return (
    <div className="theme-field">
      <div>
        <strong>App theme</strong>
        <small>Choose a calm color palette for MonoFocus.</small>
      </div>
      <div className="theme-swatch-row" role="radiogroup" aria-label="App theme">
        {THEME_OPTIONS.map((theme) => (
          <button
            className={
              theme.id === value ? "theme-swatch is-selected" : "theme-swatch"
            }
            type="button"
            role="radio"
            aria-checked={theme.id === value}
            aria-label={theme.label}
            title={theme.label}
            key={theme.id}
            style={{ "--theme-swatch": theme.swatch } as React.CSSProperties}
            onClick={() => onChange(theme.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function SettingsPage({
  settings,
  onChange,
}: SettingsPageProps): React.JSX.Element {
  const normalizedSettings = normalizeDurations(settings);

  const saveSetting = <Key extends keyof Settings>(
    key: Key,
    value: Settings[Key],
  ): void => {
    onChange({
      ...normalizedSettings,
      [key]: value,
    });
  };

  return (
    <section className="panel settings-page" aria-labelledby="settings-title">
      <div className="settings-page-header">
        <div>
          <span className="eyebrow">Preferences</span>
          <h2 id="settings-title">Settings</h2>
        </div>
        <span className="settings-local-label">Saved locally</span>
      </div>

      <div className="settings-page-form">
        <div className="settings-sections">
          <div className="settings-group">
            <h3>Timer</h3>
            <DurationField
              label="Focus duration"
              hint="Length of each deep work session"
              value={normalizedSettings.focusMinutes}
              max={90}
              onChange={(focusMinutes) =>
                saveSetting("focusMinutes", focusMinutes)
              }
            />
            <DurationField
              label="Short break"
              hint="A quick reset between sessions"
              value={normalizedSettings.shortBreakMinutes}
              max={60}
              onChange={(shortBreakMinutes) =>
                saveSetting("shortBreakMinutes", shortBreakMinutes)
              }
            />
            <DurationField
              label="Long break"
              hint="A longer pause after a complete set"
              value={normalizedSettings.longBreakMinutes}
              max={90}
              onChange={(longBreakMinutes) =>
                saveSetting("longBreakMinutes", longBreakMinutes)
              }
            />
            <NumberField
              label="Sessions per set"
              hint="Focus sessions before the long break"
              value={normalizedSettings.pomodorosBeforeLongBreak}
              min={2}
              max={10}
              suffix="sessions"
              onChange={(pomodorosBeforeLongBreak) =>
                saveSetting("pomodorosBeforeLongBreak", pomodorosBeforeLongBreak)
              }
            />
          </div>

          <div className="settings-group">
            <h3>Flow</h3>
            <ToggleField
              label="Completion sound"
              hint="Play soft tones when sessions start and end"
              checked={normalizedSettings.soundEnabled}
              onChange={(soundEnabled) =>
                saveSetting("soundEnabled", soundEnabled)
              }
            />
            <ToggleField
              label="Windows notifications"
              hint="Show a desktop notification at transitions"
              checked={normalizedSettings.notificationsEnabled}
              onChange={(notificationsEnabled) =>
                saveSetting("notificationsEnabled", notificationsEnabled)
              }
            />
            <ToggleField
              label="Auto-start breaks"
              hint="Begin the next break immediately"
              checked={normalizedSettings.autoStartBreaks}
              onChange={(autoStartBreaks) =>
                saveSetting("autoStartBreaks", autoStartBreaks)
              }
            />
            <ToggleField
              label="Auto-start focus"
              hint="Begin focus after a break ends"
              checked={normalizedSettings.autoStartFocus}
              onChange={(autoStartFocus) =>
                saveSetting("autoStartFocus", autoStartFocus)
              }
            />
          </div>
        </div>

        <ThemeField
          value={normalizedSettings.theme}
          onChange={(theme) => saveSetting("theme", theme)}
        />
      </div>
    </section>
  );
}
