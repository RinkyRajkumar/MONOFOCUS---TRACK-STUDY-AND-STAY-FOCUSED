import type {
  BlockingSettings,
  Settings,
  ThemeId,
  TimerMode,
} from "@/types";

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  pomodorosBeforeLongBreak: 4,
  soundEnabled: true,
  notificationsEnabled: true,
  autoStartBreaks: false,
  autoStartFocus: false,
  theme: "mono",
};

export interface ThemeOption {
  id: ThemeId;
  label: string;
  swatch: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "mono", label: "Mono black", swatch: "#111113" },
  { id: "paper", label: "Clean white", swatch: "#fffaf2" },
  { id: "blush", label: "Pastel blush", swatch: "#ffe6e4" },
  { id: "sage", label: "Pastel sage", swatch: "#e5f3dc" },
  { id: "sky", label: "Pastel sky", swatch: "#e5f1ff" },
  { id: "lavender", label: "Pastel lavender", swatch: "#eee8ff" },
];

export const DEFAULT_BLOCKING_SETTINGS: BlockingSettings = {
  websites: [],
  apps: [],
  notifications: {
    silenceDuringFocus: false,
    useWindowsFocus: true,
    restoreAfterSession: true,
  },
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
