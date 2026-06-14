import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Settings } from "@/types";

interface SettingsDialogProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
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

interface ToggleFieldProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

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

export function SettingsDialog({
  settings,
  onSave,
  onClose,
}: SettingsDialogProps): React.JSX.Element {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dialog-header">
          <div>
            <span className="eyebrow">Preferences</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button className="dialog-close" type="button" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-group">
            <h3>Timer</h3>
            <NumberField
              label="Focus duration"
              hint="Length of each deep work session"
              value={draft.focusMinutes}
              min={1}
              max={120}
              suffix="min"
              onChange={(focusMinutes) => setDraft((current) => ({ ...current, focusMinutes }))}
            />
            <NumberField
              label="Short break"
              hint="A quick reset between sessions"
              value={draft.shortBreakMinutes}
              min={1}
              max={60}
              suffix="min"
              onChange={(shortBreakMinutes) =>
                setDraft((current) => ({ ...current, shortBreakMinutes }))
              }
            />
            <NumberField
              label="Long break"
              hint="A longer pause after a complete set"
              value={draft.longBreakMinutes}
              min={1}
              max={90}
              suffix="min"
              onChange={(longBreakMinutes) =>
                setDraft((current) => ({ ...current, longBreakMinutes }))
              }
            />
            <NumberField
              label="Sessions per set"
              hint="Focus sessions before the long break"
              value={draft.pomodorosBeforeLongBreak}
              min={2}
              max={10}
              suffix="sessions"
              onChange={(pomodorosBeforeLongBreak) =>
                setDraft((current) => ({
                  ...current,
                  pomodorosBeforeLongBreak,
                }))
              }
            />
          </div>

          <div className="settings-group">
            <h3>Flow</h3>
            <ToggleField
              label="Completion sound"
              hint="Play a soft tone when a session ends"
              checked={draft.soundEnabled}
              onChange={(soundEnabled) => setDraft((current) => ({ ...current, soundEnabled }))}
            />
            <ToggleField
              label="Windows notifications"
              hint="Show a desktop notification at transitions"
              checked={draft.notificationsEnabled}
              onChange={(notificationsEnabled) =>
                setDraft((current) => ({ ...current, notificationsEnabled }))
              }
            />
            <ToggleField
              label="Auto-start breaks"
              hint="Begin the next break immediately"
              checked={draft.autoStartBreaks}
              onChange={(autoStartBreaks) =>
                setDraft((current) => ({ ...current, autoStartBreaks }))
              }
            />
            <ToggleField
              label="Auto-start focus"
              hint="Begin focus after a break ends"
              checked={draft.autoStartFocus}
              onChange={(autoStartFocus) =>
                setDraft((current) => ({ ...current, autoStartFocus }))
              }
            />
          </div>

          <div className="dialog-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
