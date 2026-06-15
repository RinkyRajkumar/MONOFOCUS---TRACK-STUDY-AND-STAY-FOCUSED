import type { Settings } from "@/types";

interface FocusBlockPanelProps {
  settings: Settings;
}

export function FocusBlockPanel({
  settings,
}: FocusBlockPanelProps): React.JSX.Element {
  return (
    <section className="panel focus-block-panel">
      <div className="panel-heading block-heading">
        <div>
          <span className="eyebrow">Session structure</span>
          <h2>Focus blocks</h2>
        </div>
        <span className="block-cycle-count">
          {settings.pomodorosBeforeLongBreak} sessions
        </span>
      </div>

      <div className="block-sequence" aria-label="Current focus cycle">
        <article className="block-segment is-primary">
          <span className="block-number">01</span>
          <div>
            <strong>Focus</strong>
            <span>{settings.focusMinutes} minutes</span>
          </div>
        </article>
        <article className="block-segment">
          <span className="block-number">02</span>
          <div>
            <strong>Short break</strong>
            <span>{settings.shortBreakMinutes} minutes</span>
          </div>
        </article>
        <article className="block-segment">
          <span className="block-number">03</span>
          <div>
            <strong>Long break</strong>
            <span>{settings.longBreakMinutes} minutes</span>
          </div>
        </article>
      </div>

      <div className="block-summary">
        <span className="block-summary-mark" aria-hidden="true" />
        <p>
          A long break begins after every{" "}
          <strong>{settings.pomodorosBeforeLongBreak} focus blocks</strong>.
        </p>
      </div>
    </section>
  );
}
