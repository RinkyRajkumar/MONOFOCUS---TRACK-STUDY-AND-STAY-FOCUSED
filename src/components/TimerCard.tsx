import { useState } from "react";
import { MODE_LABELS } from "@/constants";
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
}: TimerCardProps): React.JSX.Element {
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
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

  const confirmReset = (): void => {
    onReset();
    setIsResetConfirmationOpen(false);
  };

  return (
    <section className="timer-card" aria-label="Pomodoro timer">
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
        <div
          className={
            isResetConfirmationOpen
              ? "reset-action is-confirming"
              : "reset-action"
          }
        >
          <button
            className="button button-secondary reset-button"
            type="button"
            aria-expanded={isResetConfirmationOpen}
            aria-controls="reset-confirmation"
            onClick={() => setIsResetConfirmationOpen(true)}
          >
            Reset
          </button>
          <div
            className="reset-confirmation"
            id="reset-confirmation"
            aria-hidden={!isResetConfirmationOpen}
          >
            <button
              className="button reset-confirm-button"
              type="button"
              tabIndex={isResetConfirmationOpen ? 0 : -1}
              onClick={confirmReset}
            >
              Yes
            </button>
            <button
              className="button reset-confirm-button"
              type="button"
              tabIndex={isResetConfirmationOpen ? 0 : -1}
              onClick={() => setIsResetConfirmationOpen(false)}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
