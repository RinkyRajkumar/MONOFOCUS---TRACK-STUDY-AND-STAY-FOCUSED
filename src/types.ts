export type TimerMode = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export interface Settings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  pomodorosBeforeLongBreak: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
}

export interface BlockedWebsite {
  id: string;
  pattern: string;
  category?: string;
  enabled: boolean;
}

export interface BlockedApp {
  id: string;
  name: string;
  exePath?: string;
  enabled: boolean;
}

export interface BlockingSettings {
  websites: BlockedWebsite[];
  apps: BlockedApp[];
  notifications: {
    silenceDuringFocus: boolean;
    useWindowsFocus: boolean;
    restoreAfterSession: boolean;
  };
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  remainingSeconds: number;
  endsAt: number | null;
  focusesCompletedInCycle: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface DailyStats {
  date: string;
  completedPomodoros: number;
  focusMinutes: number;
  completedTasks: number;
}

export interface PersistedState {
  settings: Settings;
  blockingSettings: BlockingSettings;
  timer: TimerState;
  tasks: Task[];
  stats: DailyStats;
  focusHistory: Record<string, number>;
}
