import { useState } from "react";
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
            <FocusBlockPanel settings={pomodoro.settings} />
          ) : activeView === "settings" ? (
            <SettingsPage
              settings={pomodoro.settings}
              onSave={pomodoro.updateSettings}
            />
          ) : activeView === "report" ? (
            <ReportPage
              stats={pomodoro.stats}
              settings={pomodoro.settings}
              tasks={pomodoro.tasks}
              timer={pomodoro.timer}
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
              onPause={pomodoro.pause}
              onReset={pomodoro.reset}
            />
          )}
        </div>
      </main>

      <div className="nav-dock">
        <BottomNav activeView={activeView} onSelect={handleNavigation} />
      </div>
    </div>
  );
}
