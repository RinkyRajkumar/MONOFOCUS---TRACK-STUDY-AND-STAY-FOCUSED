import { MODE_EYEBROWS, MODE_LABELS } from "@/constants";
import { SessionProgress } from "@/components/SessionProgress";
import type { TimerMode, TimerStatus } from "@/types";

interface TimerCardProps {
  mode: TimerMode;
  status: TimerStatus;
  remainingSeconds: number;
  totalSeconds: number;
  completedInCycle: number;
  cycleTotal: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

export function TimerCard({
  mode,
  status,
  remainingSeconds,
  totalSeconds,
  completedInCycle,
  cycleTotal,
  onStart,
  onPause,
  onReset,
  onSkip,
}: TimerCardProps): React.JSX.Element {
  const radius = 146;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const offset = circumference * (1 - progress);
  const primaryLabel =
    status === "running"
      ? "Pause"
      : status === "paused"
        ? "Resume"
        : mode === "focus"
          ? "Start focus"
          : "Start break";

  return (
    <section className="timer-card" aria-label="Pomodoro timer">
      <div className="timer-heading">
        <span className="eyebrow">{MODE_EYEBROWS[mode]}</span>
        <h1>{MODE_LABELS[mode]}</h1>
      </div>

      <div className="timer-orbit">
        <svg className="progress-ring" viewBox="0 0 336 336" aria-hidden="true">
          <circle className="progress-ring-track" cx="168" cy="168" r={radius} />
          <circle
            className="progress-ring-value"
            cx="168"
            cy="168"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="timer-readout">
          <span className="timer-mode">{MODE_LABELS[mode]}</span>
          <time className="timer-time" dateTime={`PT${remainingSeconds}S`}>
            {formatTime(remainingSeconds)}
          </time>
          <span className="timer-status">
            {status === "running"
              ? "Stay with one thing"
              : status === "paused"
                ? "Paused"
                : "Ready when you are"}
          </span>
        </div>
      </div>

      <SessionProgress completed={completedInCycle} total={cycleTotal} />

      <div className="timer-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={status === "running" ? onPause : onStart}
        >
          {status === "running" ? (
            <span className="pause-glyph" aria-hidden="true" />
          ) : (
            <span className="play-glyph" aria-hidden="true" />
          )}
          {primaryLabel}
        </button>
        <button className="button button-secondary" type="button" onClick={onReset}>
          Reset
        </button>
        <button className="button button-quiet" type="button" onClick={onSkip}>
          Skip
          <span className="skip-glyph" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
