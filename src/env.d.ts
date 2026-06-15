/// <reference types="vite/client" />

interface Window {
  monoFocus?: {
    notify: (title: string, body: string) => Promise<boolean>;
    getPlatform: () => Promise<string>;
    getInstalledApplications: () => Promise<
      Array<{ name: string; exePath?: string }>
    >;
    openWindowsNotificationSettings: () => Promise<boolean>;
    tryEnableFocusMode: () => Promise<{
      supported: boolean;
      platform: string;
    }>;
    tryRestoreNotificationMode: () => Promise<{
      supported: boolean;
      platform: string;
    }>;
    updateFocusOverlay: (state: {
      mode: "focus" | "shortBreak" | "longBreak";
      status: "idle" | "running" | "paused";
      remainingSeconds: number;
    }) => void;
    onFocusOverlayState: (
      callback: (state: {
        mode: "focus" | "shortBreak" | "longBreak";
        status: "idle" | "running" | "paused";
        remainingSeconds: number;
      }) => void,
    ) => () => void;
  };
}
