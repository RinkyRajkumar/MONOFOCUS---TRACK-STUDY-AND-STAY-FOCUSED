import { app, BrowserWindow, ipcMain, Menu, Notification } from "electron";
import { join } from "node:path";

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 680,
    show: false,
    icon: join(__dirname, "../../build/icon.png"),
    backgroundColor: "#09090a",
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#09090a",
      symbolColor: "#f5f5f5",
      height: 44,
    },
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(() => {
  app.setAppUserModelId("com.monofocus.desktop");
  Menu.setApplicationMenu(null);

  ipcMain.handle(
    "show-notification",
    (_event, title: string, body: string) => {
      if (!Notification.isSupported()) {
        return false;
      }

      new Notification({
        title,
        body,
        silent: true,
      }).show();

      return true;
    },
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
