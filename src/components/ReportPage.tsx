import { useMemo, useState } from "react";
import { getLocalDateKey } from "@/lib/date";
import type { DailyStats } from "@/types";

interface ReportPageProps {
  stats: DailyStats;
  focusHistory: Record<string, number>;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatFocusTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
};

const getIntensity = (minutes: number): number => {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
};

export function ReportPage({
  stats,
  focusHistory,
}: ReportPageProps): React.JSX.Element {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: mondayOffset + daysInMonth }, (_, index) => {
      if (index < mondayOffset) {
        return null;
      }

      const date = new Date(year, month, index - mondayOffset + 1);
      const key = getLocalDateKey(date);
      return {
        date,
        key,
        minutes: focusHistory[key] ?? 0,
        isToday: key === getLocalDateKey(today),
      };
    });
  }, [focusHistory, visibleMonth]);

  const monthMinutes = calendarDays.reduce(
    (total, day) => total + (day?.minutes ?? 0),
    0,
  );
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const isCurrentMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  const shiftMonth = (amount: number): void => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

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
          }).format(today)}
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

      <article className="focus-calendar">
        <header className="focus-calendar-header">
          <div>
            <span>Focus calendar</span>
            <strong>{monthLabel}</strong>
          </div>
          <div className="focus-calendar-summary">
            <span>{formatFocusTime(monthMinutes)} this month</span>
            <div className="focus-calendar-controls">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next month"
                disabled={isCurrentMonth}
                onClick={() => shiftMonth(1)}
              >
                ›
              </button>
            </div>
          </div>
        </header>

        <div className="focus-calendar-weekdays" aria-hidden="true">
          {WEEKDAYS.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>

        <div className="focus-calendar-grid">
          {calendarDays.map((day, index) =>
            day ? (
              <div
                className={[
                  "focus-calendar-day",
                  `is-level-${getIntensity(day.minutes)}`,
                  day.isToday ? "is-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={`${day.date.toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}: ${day.minutes} focus minutes`}
                key={day.key}
              >
                <span>{day.date.getDate()}</span>
                <strong>{day.minutes > 0 ? `${day.minutes}m` : "—"}</strong>
              </div>
            ) : (
              <div
                className="focus-calendar-day is-placeholder"
                aria-hidden="true"
                key={`placeholder-${index}`}
              />
            ),
          )}
        </div>

        <footer className="focus-calendar-legend">
          <span>Focus intensity</span>
          <div aria-hidden="true">
            {[0, 1, 2, 3, 4].map((level) => (
              <i className={`is-level-${level}`} key={level} />
            ))}
          </div>
        </footer>
      </article>
    </section>
  );
}
