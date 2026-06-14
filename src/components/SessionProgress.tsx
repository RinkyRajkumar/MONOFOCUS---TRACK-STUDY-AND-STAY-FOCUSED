interface SessionProgressProps {
  completed: number;
  total: number;
}

export function SessionProgress({
  completed,
  total,
}: SessionProgressProps): React.JSX.Element {
  return (
    <div
      className="session-progress"
      aria-label={`${Math.min(completed, total)} of ${total} focus sessions completed in this set`}
    >
      <span className="session-progress-label">Session set</span>
      <div className="session-dots" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            className={index < completed ? "session-dot is-complete" : "session-dot"}
            key={index}
          />
        ))}
      </div>
      <span className="session-progress-count">
        {Math.min(completed, total)}/{total}
      </span>
    </div>
  );
}
