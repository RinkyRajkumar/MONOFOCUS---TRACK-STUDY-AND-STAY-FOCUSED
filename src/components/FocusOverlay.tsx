import { useEffect, useState } from "react";
import type { TimerState } from "@/types";

type OverlayState = Pick<
  TimerState,
  "mode" | "status" | "remainingSeconds"
>;

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
};

export function FocusOverlay(): React.JSX.Element {
  const [timer, setTimer] = useState<OverlayState>({
    mode: "focus",
    status: "idle",
    remainingSeconds: 0,
  });

  useEffect(() => window.monoFocus?.onFocusOverlayState(setTimer), []);

  return (
    <main className="focus-overlay" aria-label="Focus timer overlay">
      <span className="focus-overlay-dot" aria-hidden="true" />
      <div>
        <span>Focus</span>
        <time>{formatTime(timer.remainingSeconds)}</time>
      </div>
    </main>
  );
}
