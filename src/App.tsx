import { useState } from "react";
import { Header } from "@/components/Header";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StatsCard } from "@/components/StatsCard";
import { TaskPanel } from "@/components/TaskPanel";
import { TimerCard } from "@/components/TimerCard";
import { getDurationSeconds } from "@/constants";
import { usePomodoro } from "@/hooks/usePomodoro";

export function App(): React.JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pomodoro = usePomodoro();

  return (
    <div className="app-shell">
      <Header
        soundEnabled={pomodoro.settings.soundEnabled}
        onToggleSound={pomodoro.toggleSound}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="app-content">
        <div className="workspace-grid">
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
            onSkip={pomodoro.skip}
          />

          <aside className="side-column">
            <TaskPanel
              tasks={pomodoro.tasks}
              onAddTask={pomodoro.addTask}
              onToggleTask={pomodoro.toggleTask}
              onDeleteTask={pomodoro.deleteTask}
            />
            <StatsCard stats={pomodoro.stats} />
          </aside>
        </div>
      </main>

      <footer className="app-footer">
        <span>MonoFocus</span>
        <span className="footer-separator" aria-hidden="true" />
        <span>One session. One intention.</span>
      </footer>

      {settingsOpen ? (
        <SettingsDialog
          settings={pomodoro.settings}
          onSave={pomodoro.updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
