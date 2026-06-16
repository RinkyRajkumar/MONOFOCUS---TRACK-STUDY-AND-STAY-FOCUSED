import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import type { AppView } from "@/components/BottomNav";
import { FocusBlockPanel } from "@/components/FocusBlockPanel";
import { ReportPage } from "@/components/ReportPage";
import { SettingsPage } from "@/components/SettingsPage";
import { TaskPanel } from "@/components/TaskPanel";
import { TimerCard } from "@/components/TimerCard";
import { getDurationSeconds } from "@/constants";
import { usePomodoro } from "@/hooks/usePomodoro";

export function App(): React.JSX.Element {
  const [activeView, setActiveView] = useState<AppView>("timer");
  const pomodoro = usePomodoro();

  useEffect(() => {
    document.documentElement.dataset.theme = pomodoro.settings.theme;
  }, [pomodoro.settings.theme]);

  useEffect(() => {
    window.monoFocus?.updateFocusOverlay({
      mode: pomodoro.timer.mode,
      status: pomodoro.timer.status,
      remainingSeconds: pomodoro.timer.remainingSeconds,
      theme: pomodoro.settings.theme,
    });
  }, [
    pomodoro.settings.theme,
    pomodoro.timer.mode,
    pomodoro.timer.remainingSeconds,
    pomodoro.timer.status,
  ]);

  useEffect(() => {
    window.monoFocus?.updateAppBlocking({
      mode: pomodoro.timer.mode,
      status: pomodoro.timer.status,
      apps: pomodoro.blockingSettings.apps
        .filter((blockedApp) => blockedApp.enabled)
        .map(({ name, exePath }) => ({ name, exePath })),
      permanentApps: pomodoro.blockingSettings.permanentApps
        .filter((blockedApp) => blockedApp.enabled)
        .map(({ name, exePath }) => ({ name, exePath })),
    });
  }, [
    pomodoro.blockingSettings.apps,
    pomodoro.blockingSettings.permanentApps,
    pomodoro.timer.mode,
    pomodoro.timer.status,
  ]);

  useEffect(() => {
    window.monoFocus?.updateWebsiteBlocking({
      mode: pomodoro.timer.mode,
      status: pomodoro.timer.status,
      websites: pomodoro.blockingSettings.websites
        .filter((website) => website.enabled)
        .map((website) => website.pattern),
      permanentWebsites: pomodoro.blockingSettings.permanentWebsites
        .filter((website) => website.enabled)
        .map((website) => website.pattern),
    });
  }, [
    pomodoro.blockingSettings.permanentWebsites,
    pomodoro.blockingSettings.websites,
    pomodoro.timer.mode,
    pomodoro.timer.status,
  ]);

  const handleNavigation = (view: AppView): void => {
    setActiveView(view);
  };

  return (
    <div className="app-shell">
      <div className="window-drag-region" aria-hidden="true" />

      <main className="app-content">
        <div className="workspace-grid">
          {activeView === "tasks" ? (
            <TaskPanel
              tasks={pomodoro.tasks}
              onAddTask={pomodoro.addTask}
              onToggleTask={pomodoro.toggleTask}
              onDeleteTask={pomodoro.deleteTask}
            />
          ) : activeView === "block" ? (
            <FocusBlockPanel
              settings={pomodoro.blockingSettings}
              timer={pomodoro.timer}
              onChange={pomodoro.updateBlockingSettings}
              onOpenWindowsSettings={pomodoro.openWindowsNotificationSettings}
            />
          ) : activeView === "settings" ? (
            <SettingsPage
              settings={pomodoro.settings}
              onChange={pomodoro.updateSettings}
            />
          ) : activeView === "report" ? (
            <ReportPage
              stats={pomodoro.stats}
              focusHistory={pomodoro.focusHistory}
            />
          ) : (
            <TimerCard
              mode={pomodoro.timer.mode}
              status={pomodoro.timer.status}
              remainingSeconds={pomodoro.timer.remainingSeconds}
              totalSeconds={getDurationSeconds(
                pomodoro.timer.mode,
                pomodoro.settings,
              )}
              completedInCycle={pomodoro.timer.focusesCompletedInCycle}
              cycleTotal={pomodoro.settings.pomodorosBeforeLongBreak}
              onStart={pomodoro.start}
              onStartFocusTask={pomodoro.startWithTask}
              onPause={pomodoro.pause}
              onReset={pomodoro.reset}
              pendingFocusTaskReview={pomodoro.pendingFocusTaskReview}
              onResolveFocusTask={pomodoro.resolveFocusTaskReview}
            />
          )}
        </div>
      </main>

      {pomodoro.notificationNotice ? (
        <div className="system-focus-notice" role="status">
          <p>{pomodoro.notificationNotice}</p>
          <button
            type="button"
            onClick={() => void pomodoro.openWindowsNotificationSettings()}
          >
            Open settings
          </button>
          <button
            className="system-focus-notice-close"
            type="button"
            aria-label="Dismiss notification notice"
            onClick={pomodoro.dismissNotificationNotice}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="nav-dock">
        <BottomNav activeView={activeView} onSelect={handleNavigation} />
      </div>
    </div>
  );
}
