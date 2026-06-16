import { useEffect, useRef, useState } from "react";
import type { ThemeId, TimerState } from "@/types";

type OverlayState = Pick<
  TimerState,
  "mode" | "status" | "remainingSeconds"
> & {
  theme?: ThemeId | string;
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
};

export function FocusOverlay(): React.JSX.Element {
  const activePointerId = useRef<number | null>(null);
  const [timer, setTimer] = useState<OverlayState>({
    mode: "focus",
    status: "idle",
    remainingSeconds: 0,
    theme: "mono",
  });

  useEffect(() => window.monoFocus?.onFocusOverlayState(setTimer), []);

  useEffect(() => {
    document.documentElement.dataset.theme = timer.theme ?? "mono";
  }, [timer.theme]);

  return (
    <main
      className="focus-overlay"
      aria-label="Focus timer overlay"
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        activePointerId.current = event.pointerId;
        window.monoFocus?.beginFocusOverlayGesture(event.screenX, event.screenY);
      }}
      onPointerMove={(event) => {
        if (
          activePointerId.current === event.pointerId &&
          event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          event.preventDefault();
          window.monoFocus?.moveFocusOverlayGesture(event.screenX, event.screenY);
        }
      }}
      onPointerUp={(event) => {
        if (activePointerId.current !== event.pointerId) {
          return;
        }

        activePointerId.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        window.monoFocus?.endFocusOverlayGesture();
      }}
      onPointerCancel={(event) => {
        if (activePointerId.current !== event.pointerId) {
          return;
        }

        activePointerId.current = null;
        window.monoFocus?.endFocusOverlayGesture(true);
      }}
    >
      <span className="focus-overlay-dot" aria-hidden="true" />
      <div>
        <span>Focus</span>
        <time>{formatTime(timer.remainingSeconds)}</time>
      </div>
      <button
        className="focus-overlay-close"
        type="button"
        aria-label="Hide timer overlay"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          window.monoFocus?.hideFocusOverlay();
        }}
      >
        x
      </button>
    </main>
  );
}
