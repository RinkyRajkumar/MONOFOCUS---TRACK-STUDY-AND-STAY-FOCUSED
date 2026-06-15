import type { DailyStats, Settings, Task, TimerState } from "@/types";

interface ReportPageProps {
  stats: DailyStats;
  settings: Settings;
  tasks: Task[];
  timer: TimerState;
}

const formatFocusTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
};

export function ReportPage({
  stats,
  settings,
  tasks,
  timer,
}: ReportPageProps): React.JSX.Element {
  const taskTotal = tasks.length;
  const taskProgress =
    taskTotal > 0 ? Math.min(100, (stats.completedTasks / taskTotal) * 100) : 0;
  const cycleProgress = Math.min(
    100,
    (timer.focusesCompletedInCycle / settings.pomodorosBeforeLongBreak) * 100,
  );
  const focusGoalMinutes =
    settings.focusMinutes * settings.pomodorosBeforeLongBreak;
  const focusProgress = Math.min(
    100,
    focusGoalMinutes > 0 ? (stats.focusMinutes / focusGoalMinutes) * 100 : 0,
  );

  return (
    <section className="panel report-page" aria-labelledby="report-title">
      <div className="report-header">
        <div>
          <span className="eyebrow">Daily report</span>
          <h2 id="report-title">Today</h2>
        </div>
        <span className="report-date">
          {new Intl.DateTimeFormat(undefined, {
            month: "short",
            day: "numeric",
          }).format(new Date())}
        </span>
      </div>

      <div className="report-metrics">
        <article className="report-metric">
          <span>Pomodoros</span>
          <strong>{stats.completedPomodoros}</strong>
          <small>completed today</small>
        </article>
        <article className="report-metric">
          <span>Focus time</span>
          <strong>{formatFocusTime(stats.focusMinutes)}</strong>
          <small>deep work logged</small>
        </article>
        <article className="report-metric">
          <span>Tasks</span>
          <strong>{stats.completedTasks}</strong>
          <small>finished today</small>
        </article>
      </div>

      <div className="report-progress-list">
        <article className="report-progress-row">
          <div className="report-progress-copy">
            <div>
              <strong>Daily focus set</strong>
              <span>
                {stats.focusMinutes} of {focusGoalMinutes} minutes
              </span>
            </div>
            <span>{Math.round(focusProgress)}%</span>
          </div>
          <div className="report-progress-track">
            <span style={{ width: `${focusProgress}%` }} />
          </div>
        </article>

        <article className="report-progress-row">
          <div className="report-progress-copy">
            <div>
              <strong>Current cycle</strong>
              <span>
                {timer.focusesCompletedInCycle} of{" "}
                {settings.pomodorosBeforeLongBreak} sessions
              </span>
            </div>
            <span>{Math.round(cycleProgress)}%</span>
          </div>
          <div className="report-progress-track">
            <span style={{ width: `${cycleProgress}%` }} />
          </div>
        </article>

        <article className="report-progress-row">
          <div className="report-progress-copy">
            <div>
              <strong>Task completion</strong>
              <span>
                {taskTotal > 0
                  ? `${stats.completedTasks} of ${taskTotal} tasks`
                  : "No tasks added today"}
              </span>
            </div>
            <span>{Math.round(taskProgress)}%</span>
          </div>
          <div className="report-progress-track">
            <span style={{ width: `${taskProgress}%` }} />
          </div>
        </article>
      </div>
    </section>
  );
}
