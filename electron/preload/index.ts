import { contextBridge, ipcRenderer } from "electron";

interface FocusOverlayState {
  mode: "focus" | "shortBreak" | "longBreak";
  status: "idle" | "running" | "paused";
  remainingSeconds: number;
  theme?: string;
}

interface AppBlockingState {
  mode: FocusOverlayState["mode"];
  status: FocusOverlayState["status"];
  apps: Array<{ name: string; exePath?: string }>;
  permanentApps: Array<{ name: string; exePath?: string }>;
}

interface WebsiteBlockingState {
  mode: FocusOverlayState["mode"];
  status: FocusOverlayState["status"];
  websites: string[];
  permanentWebsites: string[];
}

const monoFocusApi = {
  notify: (title: string, body: string): Promise<boolean> =>
    ipcRenderer.invoke("show-notification", title, body) as Promise<boolean>,
  getPlatform: (): Promise<string> =>
    ipcRenderer.invoke("get-platform") as Promise<string>,
  getInstalledApplications: (): Promise<
    Array<{ name: string; exePath?: string }>
  > =>
    ipcRenderer.invoke("get-installed-applications") as Promise<
      Array<{ name: string; exePath?: string }>
    >,
  requestAppBlockingPermission: (): Promise<{
    granted: boolean;
    error?: string;
  }> =>
    ipcRenderer.invoke("request-app-blocking-permission") as Promise<{
      granted: boolean;
      error?: string;
    }>,
  requestNotificationControlPermission: (): Promise<{
    granted: boolean;
    error?: string;
  }> =>
    ipcRenderer.invoke("request-notification-control-permission") as Promise<{
      granted: boolean;
      error?: string;
    }>,
  openWindowsNotificationSettings: (): Promise<boolean> =>
    ipcRenderer.invoke("open-windows-notification-settings") as Promise<boolean>,
  tryEnableFocusMode: (): Promise<{ supported: boolean; platform: string }> =>
    ipcRenderer.invoke("try-enable-focus-mode") as Promise<{
      supported: boolean;
      platform: string;
    }>,
  tryRestoreNotificationMode: (): Promise<{
    supported: boolean;
    platform: string;
  }> =>
    ipcRenderer.invoke("try-restore-notification-mode") as Promise<{
      supported: boolean;
      platform: string;
    }>,
  updateFocusOverlay: (state: FocusOverlayState): void => {
    ipcRenderer.send("update-focus-overlay", state);
  },
  hideFocusOverlay: (): void => {
    ipcRenderer.send("hide-focus-overlay");
  },
  updateAppBlocking: (state: AppBlockingState): void => {
    ipcRenderer.send("update-app-blocking", state);
  },
  updateWebsiteBlocking: (state: WebsiteBlockingState): void => {
    ipcRenderer.send("update-website-blocking", state);
  },
  exportBrowserExtension: (): Promise<{
    success: boolean;
    cancelled?: boolean;
    path?: string;
    error?: string;
  }> =>
    ipcRenderer.invoke("export-browser-extension") as Promise<{
      success: boolean;
      cancelled?: boolean;
      path?: string;
      error?: string;
    }>,
  getBrowserExtensionStatus: (): Promise<{ connected: boolean }> =>
    ipcRenderer.invoke("get-browser-extension-status") as Promise<{
      connected: boolean;
    }>,
  beginFocusOverlayGesture: (screenX: number, screenY: number): void => {
    ipcRenderer.send("focus-overlay-pointer-down", { screenX, screenY });
  },
  moveFocusOverlayGesture: (screenX: number, screenY: number): void => {
    ipcRenderer.send("focus-overlay-pointer-move", { screenX, screenY });
  },
  endFocusOverlayGesture: (cancelled = false): void => {
    ipcRenderer.send("focus-overlay-pointer-up", cancelled);
  },
  onFocusOverlayState: (
    callback: (state: FocusOverlayState) => void,
  ): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: FocusOverlayState) =>
      callback(state);
    ipcRenderer.on("focus-overlay-state", listener);
    return () => ipcRenderer.removeListener("focus-overlay-state", listener);
  },
};

contextBridge.exposeInMainWorld("monoFocus", monoFocusApi);
