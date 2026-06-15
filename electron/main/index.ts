import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  screen,
  shell,
} from "electron";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

interface InstalledApplication {
  name: string;
  exePath?: string;
}

interface FocusOverlayState {
  mode: "focus" | "shortBreak" | "longBreak";
  status: "idle" | "running" | "paused";
  remainingSeconds: number;
}

const execFileAsync = promisify(execFile);
let mainWindow: BrowserWindow | null = null;
let focusOverlayWindow: BrowserWindow | null = null;
let focusOverlayState: FocusOverlayState = {
  mode: "focus",
  status: "idle",
  remainingSeconds: 0,
};

const installedAppsScript = `
$ErrorActionPreference = "SilentlyContinue"
$apps = @()
$uninstallPaths = @(
  "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
  "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)

foreach ($path in $uninstallPaths) {
  Get-ItemProperty $path | Where-Object {
    $_.DisplayName -and $_.SystemComponent -ne 1 -and $_.ParentKeyName -eq $null
  } | ForEach-Object {
    $target = $_.DisplayIcon
    if ($target) {
      $target = $target -replace '^"(.*?)".*$', '$1'
      $target = $target.Trim('"') -replace ',\\s*-?\\d+$', ''
      $target = [Environment]::ExpandEnvironmentVariables($target)
      if (-not $target.EndsWith(".exe")) {
        $target = $null
      }
    }
    $apps += [PSCustomObject]@{
      name = [string]$_.DisplayName
      exePath = [string]$target
    }
  }
}

$apps |
  Where-Object { $_.name } |
  Sort-Object name, exePath -Unique |
  ConvertTo-Json -Compress
`;

const getInstalledApplications = async (): Promise<InstalledApplication[]> => {
  if (process.platform !== "win32") {
    return [];
  }

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        installedAppsScript,
      ],
      {
        windowsHide: true,
        timeout: 15000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    const parsed = JSON.parse(stdout || "[]") as
      | InstalledApplication
      | InstalledApplication[];
    const applications = Array.isArray(parsed) ? parsed : [parsed];
    const windowsDirectory = process.env.WINDIR?.toLowerCase();
    const candidates = applications
      .filter((application) => application.name.trim())
      .map((application) => ({
        name: application.name.trim(),
        exePath: application.exePath?.trim() || undefined,
      }))
      .filter(
        (application) =>
          !windowsDirectory ||
          !application.exePath?.toLowerCase().startsWith(windowsDirectory),
      );
    const uniqueApplications = new Map<string, InstalledApplication>();
    const nameScore = (name: string): number =>
      (name.match(/\d/g)?.length ?? 0) * 12 + name.length;

    for (const application of candidates) {
      const key =
        application.exePath?.toLowerCase() ?? application.name.toLowerCase();
      const existing = uniqueApplications.get(key);
      if (!existing || nameScore(application.name) < nameScore(existing.name)) {
        uniqueApplications.set(key, application);
      }
    }

    return [...uniqueApplications.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  } catch {
    return [];
  }
};

const shouldShowFocusOverlay = (): boolean =>
  focusOverlayState.mode === "focus" &&
  focusOverlayState.status === "running" &&
  Boolean(mainWindow && !mainWindow.isFocused());

const positionFocusOverlay = (): void => {
  if (!focusOverlayWindow || focusOverlayWindow.isDestroyed()) {
    return;
  }

  const display = mainWindow
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  const [overlayWidth] = focusOverlayWindow.getSize();
  focusOverlayWindow.setPosition(
    x + width - overlayWidth - 20,
    y + 20,
    false,
  );
};

const syncFocusOverlay = (): void => {
  if (!focusOverlayWindow || focusOverlayWindow.isDestroyed()) {
    return;
  }

  focusOverlayWindow.webContents.send(
    "focus-overlay-state",
    focusOverlayState,
  );

  if (shouldShowFocusOverlay()) {
    positionFocusOverlay();
    focusOverlayWindow.showInactive();
  } else {
    focusOverlayWindow.hide();
  }
};

const loadRenderer = (
  window: BrowserWindow,
  query?: Record<string, string>,
): void => {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    const url = new URL(rendererUrl);
    Object.entries(query ?? {}).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    void window.loadURL(url.toString());
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"), {
      query,
    });
  }
};

const createFocusOverlayWindow = (): void => {
  focusOverlayWindow = new BrowserWindow({
    width: 190,
    height: 76,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  focusOverlayWindow.setAlwaysOnTop(true, "screen-saver");
  focusOverlayWindow.setIgnoreMouseEvents(true);
  focusOverlayWindow.on("closed", () => {
    focusOverlayWindow = null;
  });
  focusOverlayWindow.webContents.on("did-finish-load", syncFocusOverlay);
  loadRenderer(focusOverlayWindow, { overlay: "1" });
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
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
    mainWindow?.show();
  });
  mainWindow.on("focus", syncFocusOverlay);
  mainWindow.on("blur", syncFocusOverlay);
  mainWindow.on("move", positionFocusOverlay);
  mainWindow.on("closed", () => {
    mainWindow = null;
    focusOverlayWindow?.close();
  });

  loadRenderer(mainWindow);
  createFocusOverlayWindow();
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

  ipcMain.handle("get-platform", () => process.platform);
  ipcMain.handle("get-installed-applications", getInstalledApplications);
  ipcMain.on(
    "update-focus-overlay",
    (event, state: FocusOverlayState) => {
      if (!mainWindow || event.sender !== mainWindow.webContents) {
        return;
      }

      focusOverlayState = state;
      syncFocusOverlay();
    },
  );

  ipcMain.handle("open-windows-notification-settings", async () => {
    if (process.platform !== "win32") {
      return false;
    }

    await shell.openExternal("ms-settings:notifications");
    return true;
  });

  ipcMain.handle("try-enable-focus-mode", () => ({
    supported: false,
    platform: process.platform,
  }));

  ipcMain.handle("try-restore-notification-mode", () => ({
    supported: false,
    platform: process.platform,
  }));

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
