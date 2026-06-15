import { contextBridge, ipcRenderer } from "electron";

interface FocusOverlayState {
  mode: "focus" | "shortBreak" | "longBreak";
  status: "idle" | "running" | "paused";
  remainingSeconds: number;
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
