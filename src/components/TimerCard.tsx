import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MODE_LABELS } from "@/constants";
import { SessionProgress } from "@/components/SessionProgress";
import { FOCUS_QUOTES } from "@/data/focusQuotes";
import type { TimerMode, TimerStatus } from "@/types";

interface TimerCardProps {
  mode: TimerMode;
  status: TimerStatus;
  remainingSeconds: number;
  totalSeconds: number;
  completedInCycle: number;
  cycleTotal: number;
  onStart: () => void;
  onStartFocusTask: (title: string) => void;
  onPause: () => void;
  onReset: () => void;
  pendingFocusTaskReview: { title: string } | null;
  onResolveFocusTask: (completed: boolean) => void;
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
  onStartFocusTask,
  onPause,
  onReset,
  pendingFocusTaskReview,
  onResolveFocusTask,
}: TimerCardProps): React.JSX.Element {
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);
  const [isFocusPromptOpen, setIsFocusPromptOpen] = useState(false);
  const [focusInput, setFocusInput] = useState("");
  const [quoteOverlay, setQuoteOverlay] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const quoteTimeout = useRef<number | null>(null);
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

  const showFocusQuote = (): void => {
    const text =
      FOCUS_QUOTES[Math.floor(Math.random() * FOCUS_QUOTES.length)];

    if (quoteTimeout.current) {
      window.clearTimeout(quoteTimeout.current);
    }

    setQuoteOverlay({ id: Date.now(), text });
    quoteTimeout.current = window.setTimeout(() => {
      setQuoteOverlay(null);
      quoteTimeout.current = null;
    }, 3960);
  };

  const handlePrimaryAction = (): void => {
    if (status === "running") {
      onPause();
      return;
    }

    if (mode === "focus" && status === "idle") {
      setIsFocusPromptOpen(true);
      return;
    }

    onStart();
  };

  const submitFocusPrompt = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const title = focusInput.trim();
    if (!title) {
      return;
    }

    onStartFocusTask(title);
    setFocusInput("");
    setIsFocusPromptOpen(false);
    showFocusQuote();
  };

  useEffect(
    () => () => {
      if (quoteTimeout.current) {
        window.clearTimeout(quoteTimeout.current);
      }
    },
    [],
  );

  return (
    <section className="timer-card" aria-label="Pomodoro timer">
      {quoteOverlay ? (
        <div
          className="focus-quote-overlay"
          key={quoteOverlay.id}
          aria-live="polite"
        >
          <span>Focus cue</span>
          <p>{quoteOverlay.text}</p>
        </div>
      ) : null}
      {isFocusPromptOpen ? (
        <div className="focus-task-overlay" role="dialog" aria-modal="true">
          <form className="focus-task-dialog" onSubmit={submitFocusPrompt}>
            <span>Main focus</span>
            <h3>What is your main focus today?</h3>
            <input
              type="text"
              value={focusInput}
              autoFocus
              placeholder="One clear task..."
              aria-label="Main focus today"
              onChange={(event) => setFocusInput(event.target.value)}
            />
            <div className="focus-task-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setIsFocusPromptOpen(false);
                  setFocusInput("");
                }}
              >
                Cancel
              </button>
              <button className="button button-primary" type="submit">
                Start
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {pendingFocusTaskReview ? (
        <div className="focus-task-overlay" role="dialog" aria-modal="true">
          <div className="focus-task-dialog">
            <span>Session review</span>
            <h3>Did you complete this task?</h3>
            <p>{pendingFocusTaskReview.title}</p>
            <div className="focus-task-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => onResolveFocusTask(false)}
              >
                Not completed
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => onResolveFocusTask(true)}
              >
                Completed
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
          onClick={handlePrimaryAction}
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
