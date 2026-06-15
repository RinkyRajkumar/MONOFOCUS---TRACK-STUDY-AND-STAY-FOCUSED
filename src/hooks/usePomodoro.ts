import { useCallback, useEffect, useRef, useState } from "react";
import {
  MODE_LABELS,
  getDurationSeconds,
} from "@/constants";
import { getLocalDateKey } from "@/lib/date";
import {
  playCompletionTone,
  playPauseTone,
  playSessionStartTone,
} from "@/lib/sound";
import { loadState, saveState } from "@/lib/storage";
import type {
  DailyStats,
  BlockingSettings,
  PersistedState,
  Settings,
  Task,
  TimerMode,
  TimerState,
} from "@/types";

const getNextMode = (
  mode: TimerMode,
  focusesCompletedInCycle: number,
  settings: Settings,
): TimerMode => {
  if (mode !== "focus") {
    return "focus";
  }

  return focusesCompletedInCycle >= settings.pomodorosBeforeLongBreak
    ? "longBreak"
    : "shortBreak";
};

const getTransitionStatus = (
  completedMode: TimerMode,
  settings: Settings,
): TimerState["status"] => {
  if (completedMode === "focus") {
    return settings.autoStartBreaks ? "running" : "idle";
  }

  return settings.autoStartFocus ? "running" : "idle";
};

const refreshDailyStats = (stats: DailyStats): DailyStats =>
  stats.date === getLocalDateKey()
    ? stats
    : {
        date: getLocalDateKey(),
        completedPomodoros: 0,
        focusMinutes: 0,
        completedTasks: 0,
      };

const notifySessionComplete = async (
  completedMode: TimerMode,
  nextMode: TimerMode,
  settings: Settings,
): Promise<void> => {
  if (settings.soundEnabled) {
    playCompletionTone();
  }

  if (!settings.notificationsEnabled) {
    return;
  }

  const title =
    completedMode === "focus" ? "Focus session complete" : "Break complete";
  const body =
    completedMode === "focus"
      ? `${MODE_LABELS[nextMode]} is ready when you are.`
      : "Ready for another focused session?";

  if (window.monoFocus) {
    await window.monoFocus.notify(title, body);
    return;
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};

export interface PomodoroController extends PersistedState {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateSettings: (settings: Settings) => void;
  updateBlockingSettings: (settings: BlockingSettings) => void;
  toggleSound: () => void;
  notificationNotice: string | null;
  dismissNotificationNotice: () => void;
  openWindowsNotificationSettings: () => Promise<boolean>;
}

export const usePomodoro = (): PomodoroController => {
  const [state, setState] = useState<PersistedState>(loadState);
  const [notificationNotice, setNotificationNotice] = useState<string | null>(
    null,
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const openWindowsNotificationSettings = useCallback(async (): Promise<boolean> => {
    if (!window.monoFocus) {
      return false;
    }

    return window.monoFocus.openWindowsNotificationSettings();
  }, []);

  const trySilenceNotifications = useCallback(async (): Promise<void> => {
    const notifications =
      stateRef.current.blockingSettings.notifications;
    if (!notifications.silenceDuringFocus) {
      return;
    }

    if (!window.monoFocus) {
      setNotificationNotice(
        "System-wide notification control requires a desktop app build.",
      );
      return;
    }

    const platform = await window.monoFocus.getPlatform();
    if (platform !== "win32") {
      setNotificationNotice(
        "System notification blocking is currently available only on Windows.",
      );
      return;
    }

    if (!notifications.useWindowsFocus) {
      return;
    }

    const result = await window.monoFocus.tryEnableFocusMode();
    if (!result.supported) {
      setNotificationNotice(
        "Open Windows notification settings to enable Do Not Disturb for focus sessions.",
      );
    }
  }, []);

  const tryRestoreNotifications = useCallback(async (): Promise<void> => {
    const notifications =
      stateRef.current.blockingSettings.notifications;
    if (
      !notifications.silenceDuringFocus ||
      !notifications.restoreAfterSession ||
      !window.monoFocus
    ) {
      return;
    }

    await window.monoFocus.tryRestoreNotificationMode();
  }, []);

  const transitionSession = useCallback(
    (completedNaturally: boolean): void => {
      const current = stateRef.current;
      const completedMode = current.timer.mode;
      const completedFocus =
        completedNaturally && completedMode === "focus";
      const focusesCompletedInCycle = completedFocus
        ? current.timer.focusesCompletedInCycle + 1
        : current.timer.focusesCompletedInCycle;
      const nextMode = getNextMode(
        completedMode,
        focusesCompletedInCycle,
        current.settings,
      );
      const nextCycleCount =
        completedMode === "longBreak"
          ? 0
          : focusesCompletedInCycle;
      const nextStatus = completedNaturally
        ? getTransitionStatus(completedMode, current.settings)
        : "idle";
      const duration = getDurationSeconds(nextMode, current.settings);
      const now = Date.now();

      setState((previous) => ({
        ...previous,
        timer: {
          mode: nextMode,
          status: nextStatus,
          remainingSeconds: duration,
          endsAt: nextStatus === "running" ? now + duration * 1000 : null,
          focusesCompletedInCycle: nextCycleCount,
        },
        stats: completedFocus
          ? {
              ...refreshDailyStats(previous.stats),
              completedPomodoros:
                refreshDailyStats(previous.stats).completedPomodoros + 1,
              focusMinutes:
                refreshDailyStats(previous.stats).focusMinutes +
                previous.settings.focusMinutes,
            }
          : refreshDailyStats(previous.stats),
        focusHistory: completedFocus
          ? {
              ...previous.focusHistory,
              [getLocalDateKey()]:
                (previous.focusHistory[getLocalDateKey()] ?? 0) +
                previous.settings.focusMinutes,
            }
          : previous.focusHistory,
      }));

      if (completedMode === "focus") {
        void tryRestoreNotifications();
      }

      if (completedNaturally) {
        void notifySessionComplete(
          completedMode,
          nextMode,
          current.settings,
        );

        if (nextStatus === "running" && current.settings.soundEnabled) {
          playSessionStartTone(nextMode, 850);
        }

        if (nextStatus === "running" && nextMode === "focus") {
          void trySilenceNotifications();
        }
      }
    },
    [tryRestoreNotifications, trySilenceNotifications],
  );

  useEffect(() => {
    if (state.timer.status !== "running" || !state.timer.endsAt) {
      return;
    }

    const tick = (): void => {
      const current = stateRef.current;
      if (current.timer.status !== "running" || !current.timer.endsAt) {
        return;
      }

      const remainingSeconds = Math.max(
        0,
        Math.ceil((current.timer.endsAt - Date.now()) / 1000),
      );

      if (remainingSeconds === 0) {
        transitionSession(true);
        return;
      }

      setState((previous) => ({
        ...previous,
        timer: {
          ...previous.timer,
          remainingSeconds,
        },
      }));
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [state.timer.status, state.timer.endsAt, transitionSession]);

  const start = useCallback((): void => {
    const current = stateRef.current;
    if (
      current.timer.status !== "running" &&
      current.settings.soundEnabled
    ) {
      playSessionStartTone(current.timer.mode);
    }

    setState((previous) => ({
      ...previous,
      timer: {
        ...previous.timer,
        status: "running",
        endsAt: Date.now() + previous.timer.remainingSeconds * 1000,
      },
      stats: refreshDailyStats(previous.stats),
    }));

    if (current.timer.mode === "focus") {
      void trySilenceNotifications();
    }
  }, [trySilenceNotifications]);

  const pause = useCallback((): void => {
    if (stateRef.current.settings.soundEnabled) {
      playPauseTone();
    }

    setState((previous) => {
      const remainingSeconds = previous.timer.endsAt
        ? Math.max(
            0,
            Math.ceil((previous.timer.endsAt - Date.now()) / 1000),
          )
        : previous.timer.remainingSeconds;

      return {
        ...previous,
        timer: {
          ...previous.timer,
          status: "paused",
          remainingSeconds,
          endsAt: null,
        },
      };
    });
  }, []);

  const reset = useCallback((): void => {
    const shouldRestore =
      stateRef.current.timer.mode === "focus" &&
      stateRef.current.timer.status !== "idle";

    setState((previous) => ({
      ...previous,
      timer: {
        mode: "focus",
        status: "idle",
        remainingSeconds: getDurationSeconds(
          "focus",
          previous.settings,
        ),
        endsAt: null,
        focusesCompletedInCycle: 0,
      },
    }));

    if (shouldRestore) {
      void tryRestoreNotifications();
    }
  }, [tryRestoreNotifications]);

  const skip = useCallback((): void => {
    transitionSession(false);
  }, [transitionSession]);

  const addTask = useCallback((title: string): void => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    setState((previous) => ({
      ...previous,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: trimmedTitle,
          completed: false,
          createdAt: new Date().toISOString(),
          completedAt: null,
        },
        ...previous.tasks,
      ],
    }));
  }, []);

  const toggleTask = useCallback((id: string): void => {
    setState((previous) => {
      let completedDelta = 0;
      const tasks = previous.tasks.map((task): Task => {
        if (task.id !== id) {
          return task;
        }

        const completed = !task.completed;
        const wasCompletedToday =
          task.completedAt !== null &&
          getLocalDateKey(new Date(task.completedAt)) === getLocalDateKey();
        completedDelta = completed ? 1 : wasCompletedToday ? -1 : 0;
        return {
          ...task,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        };
      });
      const stats = refreshDailyStats(previous.stats);

      return {
        ...previous,
        tasks,
        stats: {
          ...stats,
          completedTasks: Math.max(0, stats.completedTasks + completedDelta),
        },
      };
    });
  }, []);

  const deleteTask = useCallback((id: string): void => {
    setState((previous) => ({
      ...previous,
      tasks: previous.tasks.filter((task) => task.id !== id),
    }));
  }, []);

  const updateSettings = useCallback((settings: Settings): void => {
    setState((previous) => {
      const timer =
        previous.timer.status === "running"
          ? previous.timer
          : {
              ...previous.timer,
              remainingSeconds: getDurationSeconds(
                previous.timer.mode,
                settings,
              ),
              endsAt: null,
            };

      return {
        ...previous,
        settings,
        timer,
      };
    });
  }, []);

  const updateBlockingSettings = useCallback(
    (blockingSettings: BlockingSettings): void => {
      setState((previous) => ({
        ...previous,
        blockingSettings,
      }));
    },
    [],
  );

  const toggleSound = useCallback((): void => {
    setState((previous) => ({
      ...previous,
      settings: {
        ...previous.settings,
        soundEnabled: !previous.settings.soundEnabled,
      },
    }));
  }, []);

  return {
    ...state,
    start,
    pause,
    reset,
    skip,
    addTask,
    toggleTask,
    deleteTask,
    updateSettings,
    updateBlockingSettings,
    toggleSound,
    notificationNotice,
    dismissNotificationNotice: () => setNotificationNotice(null),
    openWindowsNotificationSettings,
  };
};
