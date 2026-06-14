import type { DailyStats } from "@/types";

interface StatsCardProps {
  stats: DailyStats;
}

export function StatsCard({ stats }: StatsCardProps): React.JSX.Element {
  return (
    <section className="panel stats-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Daily rhythm</span>
          <h2>Today</h2>
        </div>
        <span className="live-indicator">
          <span aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="stats-grid">
        <article className="stat">
          <strong>{stats.completedPomodoros}</strong>
          <span>Pomodoros</span>
        </article>
        <article className="stat">
          <strong>{stats.focusMinutes}</strong>
          <span>Focus minutes</span>
        </article>
        <article className="stat">
          <strong>{stats.completedTasks}</strong>
          <span>Tasks finished</span>
        </article>
      </div>

      <div className="stats-note">
        <span className="stats-note-line" aria-hidden="true" />
        <p>Quiet progress, measured one session at a time.</p>
      </div>
    </section>
  );
}
