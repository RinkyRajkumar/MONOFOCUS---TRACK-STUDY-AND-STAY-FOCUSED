import {
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
});

export const createInitialState = (): PersistedState => ({
  settings: DEFAULT_SETTINGS,
  timer: createTimerState(),
  tasks: [],
  stats: createDailyStats(),
});

export const loadState = (): PersistedState => {
  const fallback = createInitialState();

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return fallback;
    }

    const parsed = JSON.parse(rawState) as Partial<PersistedState>;
    const stats =
      parsed.stats?.date === getLocalDateKey()
        ? { ...fallback.stats, ...parsed.stats }
        : createDailyStats();

    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      timer: { ...fallback.timer, ...parsed.timer },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      stats,
    };
  } catch {
    return fallback;
  }
};

export const saveState = (state: PersistedState): void => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
