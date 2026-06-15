import type { Settings, TimerMode } from "@/types";

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  pomodorosBeforeLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: true,
  autoStartBreaks: false,
  autoStartFocus: false,
};

export const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

export const STORAGE_KEY = "monofocus-state-v1";

export const getDurationSeconds = (
  mode: TimerMode,
  settings: Settings,
): number => {
  const minutesByMode: Record<TimerMode, number> = {
    focus: settings.focusMinutes,
    shortBreak: settings.shortBreakMinutes,
    longBreak: settings.longBreakMinutes,
  };

  return minutesByMode[mode] * 60;
};
