import {
  DEFAULT_BLOCKING_SETTINGS,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  getDurationSeconds,
} from "@/constants";
import { getLocalDateKey } from "@/lib/date";
import type { DailyStats, PersistedState, TimerState } from "@/types";

const createDailyStats = (): DailyStats => ({
  date: getLocalDateKey(),
  completedPomodoros: 0,
  focusMinutes: 0,
  completedTasks: 0,
});

const createTimerState = (): TimerState => ({
  mode: "focus",
  status: "idle",
  remainingSeconds: getDurationSeconds("focus", DEFAULT_SETTINGS),
  endsAt: null,
  focusesCompletedInCycle: 0,
  focusTaskId: null,
});

export const createInitialState = (): PersistedState => ({
  settings: DEFAULT_SETTINGS,
  blockingSettings: DEFAULT_BLOCKING_SETTINGS,
  timer: createTimerState(),
  tasks: [],
  stats: createDailyStats(),
  focusHistory: {},
});

export const loadState = (): PersistedState => {
  const fallback = createInitialState();

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return fallback;
    }

    const parsed = JSON.parse(rawState) as Partial<PersistedState>;
    const focusHistory =
      parsed.focusHistory &&
      typeof parsed.focusHistory === "object" &&
      !Array.isArray(parsed.focusHistory)
        ? { ...parsed.focusHistory }
        : {};

    if (parsed.stats?.date && parsed.stats.focusMinutes > 0) {
      focusHistory[parsed.stats.date] = Math.max(
        focusHistory[parsed.stats.date] ?? 0,
        parsed.stats.focusMinutes,
      );
    }

    const stats =
      parsed.stats?.date === getLocalDateKey()
        ? { ...fallback.stats, ...parsed.stats }
        : createDailyStats();

    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      blockingSettings: {
        ...DEFAULT_BLOCKING_SETTINGS,
        ...parsed.blockingSettings,
        websites: Array.isArray(parsed.blockingSettings?.websites)
          ? parsed.blockingSettings.websites
          : [],
        apps: Array.isArray(parsed.blockingSettings?.apps)
          ? parsed.blockingSettings.apps
          : [],
        permanentWebsites: Array.isArray(
          parsed.blockingSettings?.permanentWebsites,
        )
          ? parsed.blockingSettings.permanentWebsites
          : [],
        permanentApps: Array.isArray(parsed.blockingSettings?.permanentApps)
          ? parsed.blockingSettings.permanentApps
          : [],
        notifications: {
          ...DEFAULT_BLOCKING_SETTINGS.notifications,
          ...parsed.blockingSettings?.notifications,
        },
      },
      timer: { ...fallback.timer, ...parsed.timer },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      stats,
      focusHistory,
    };
  } catch {
    return fallback;
  }
};

export const saveState = (state: PersistedState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
