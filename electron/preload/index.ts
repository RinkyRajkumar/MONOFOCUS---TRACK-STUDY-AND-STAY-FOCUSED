import { contextBridge, ipcRenderer } from "electron";

const monoFocusApi = {
  notify: (title: string, body: string): Promise<boolean> =>
    ipcRenderer.invoke("show-notification", title, body) as Promise<boolean>,
};

contextBridge.exposeInMainWorld("monoFocus", monoFocusApi);
