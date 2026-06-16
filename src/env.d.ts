/// <reference types="vite/client" />

interface Window {
  monoFocus?: {
    notify: (title: string, body: string) => Promise<boolean>;
    getPlatform: () => Promise<string>;
    getInstalledApplications: () => Promise<
      Array<{ name: string; exePath?: string }>
    >;
    requestAppBlockingPermission: () => Promise<{
      granted: boolean;
      error?: string;
    }>;
    requestNotificationControlPermission: () => Promise<{
      granted: boolean;
      error?: string;
    }>;
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
      theme?: string;
    }) => void;
    updateAppBlocking: (state: {
      mode: "focus" | "shortBreak" | "longBreak";
      status: "idle" | "running" | "paused";
      apps: Array<{ name: string; exePath?: string }>;
    }) => void;
    updateWebsiteBlocking: (state: {
      mode: "focus" | "shortBreak" | "longBreak";
      status: "idle" | "running" | "paused";
      websites: string[];
    }) => void;
    exportBrowserExtension: () => Promise<{
      success: boolean;
      cancelled?: boolean;
      path?: string;
      error?: string;
    }>;
    getBrowserExtensionStatus: () => Promise<{ connected: boolean }>;
    beginFocusOverlayGesture: (screenX: number, screenY: number) => void;
    moveFocusOverlayGesture: (screenX: number, screenY: number) => void;
    endFocusOverlayGesture: (cancelled?: boolean) => void;
    onFocusOverlayState: (
      callback: (state: {
        mode: "focus" | "shortBreak" | "longBreak";
        status: "idle" | "running" | "paused";
        remainingSeconds: number;
        theme?: string;
      }) => void,
    ) => () => void;
  };
}
