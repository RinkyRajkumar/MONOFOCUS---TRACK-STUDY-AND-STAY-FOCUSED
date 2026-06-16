import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  Notification,
  screen,
  shell,
} from "electron";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
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
  theme?: string;
}

interface AppBlockingState {
  mode: "focus" | "shortBreak" | "longBreak";
  status: "idle" | "running" | "paused";
  apps: InstalledApplication[];
}

interface WebsiteBlockingState {
  mode: "focus" | "shortBreak" | "longBreak";
  status: "idle" | "running" | "paused";
  websites: string[];
}

interface BrowserExtensionExportResult {
  success: boolean;
  cancelled?: boolean;
  path?: string;
  error?: string;
}

interface AppBlockingPermissionResult {
  granted: boolean;
  error?: string;
}

interface NotificationControlPermissionResult {
  granted: boolean;
  error?: string;
}

interface OverlayPointerPosition {
  screenX: number;
  screenY: number;
}

interface OverlayDragState extends OverlayPointerPosition {
  windowX: number;
  windowY: number;
  moved: boolean;
  startedAt: number;
}

const execFileAsync = promisify(execFile);
let mainWindow: BrowserWindow | null = null;
let focusOverlayWindow: BrowserWindow | null = null;
let focusOverlayState: FocusOverlayState = {
  mode: "focus",
  status: "idle",
  remainingSeconds: 0,
  theme: "mono",
};
let appBlockingState: AppBlockingState = {
  mode: "focus",
  status: "idle",
  apps: [],
};
let websiteBlockingState: WebsiteBlockingState = {
  mode: "focus",
  status: "idle",
  websites: [],
};
let elevatedHelperStarting = false;
let elevatedHelperStopPath: string | null = null;
let elevatedHelperConfigPath: string | null = null;
let appBlockingPermissionGranted = false;
let notificationHelperStarting = false;
let notificationHelperStopPath: string | null = null;
let notificationHelperConfigPath: string | null = null;
let notificationControlPermissionGranted = false;
let customOverlayPosition: { x: number; y: number } | null = null;
let overlayDragState: OverlayDragState | null = null;
let browserBridgeServer: Server | null = null;
let browserBridgeToken = "";
let browserExtensionLastSeenAt = 0;

const BROWSER_BRIDGE_PORT = 17831;

const titleBarThemes: Record<string, { color: string; symbolColor: string }> = {
  mono: { color: "#09090a", symbolColor: "#f5f5f5" },
  paper: { color: "#f4f0e8", symbolColor: "#171411" },
  blush: { color: "#fff1f0", symbolColor: "#241516" },
  sage: { color: "#f2faee", symbolColor: "#152015" },
  sky: { color: "#edf6ff", symbolColor: "#132033" },
  lavender: { color: "#f5f1ff", symbolColor: "#1c1830" },
};

const protectedExecutables = new Set([
  "csrss.exe",
  "dwm.exe",
  "electron.exe",
  "explorer.exe",
  "lsass.exe",
  "monofocus.exe",
  "powershell.exe",
  "services.exe",
  "sihost.exe",
  "smss.exe",
  "svchost.exe",
  "system",
  "taskhostw.exe",
  "wininit.exe",
  "winlogon.exe",
]);

const elevatedBlockingScript = `
param(
  [Parameter(Mandatory = $true)][string]$ConfigPath,
  [Parameter(Mandatory = $true)][string]$StopPath,
  [Parameter(Mandatory = $true)][int]$ParentPid
)

$ErrorActionPreference = "SilentlyContinue"

while (-not (Test-Path -LiteralPath $StopPath)) {
  if (-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) {
    break
  }

  try {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    foreach ($executable in @($config.executables)) {
      $processName = [System.IO.Path]::GetFileNameWithoutExtension([string]$executable)
      if ($processName) {
        Get-Process -Name $processName -ErrorAction SilentlyContinue |
          Where-Object { $_.Id -ne $PID } |
          Stop-Process -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {}

  Start-Sleep -Milliseconds 800
}

Remove-Item -LiteralPath $StopPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $ConfigPath -Force -ErrorAction SilentlyContinue
`;

const elevatedNotificationScript = `
param(
  [Parameter(Mandatory = $true)][string]$ConfigPath,
  [Parameter(Mandatory = $true)][string]$StopPath,
  [Parameter(Mandatory = $true)][int]$ParentPid
)

$ErrorActionPreference = "SilentlyContinue"
$settingsPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings"
$valueName = "NOC_GLOBAL_SETTING_TOASTS_ENABLED"
$previousValue = $null
$isSilenced = $false

function Get-ToastValue {
  try {
    $item = Get-ItemProperty -LiteralPath $settingsPath -Name $valueName -ErrorAction SilentlyContinue
    if ($null -eq $item) {
      return $null
    }
    return [int]$item.$valueName
  } catch {
    return $null
  }
}

function Set-ToastValue([int]$value) {
  New-Item -Path $settingsPath -Force | Out-Null
  New-ItemProperty -LiteralPath $settingsPath -Name $valueName -Value $value -PropertyType DWord -Force | Out-Null
}

while (-not (Test-Path -LiteralPath $StopPath)) {
  if (-not (Get-Process -Id $ParentPid -ErrorAction SilentlyContinue)) {
    break
  }

  try {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    $shouldSilence = [bool]$config.silence

    if ($shouldSilence -and -not $isSilenced) {
      $previousValue = Get-ToastValue
      if ($null -eq $previousValue) {
        $previousValue = 1
      }
      Set-ToastValue 0
      $isSilenced = $true
    } elseif (-not $shouldSilence -and $isSilenced) {
      Set-ToastValue ([int]$previousValue)
      $isSilenced = $false
    }
  } catch {}

  Start-Sleep -Milliseconds 600
}

if ($isSilenced) {
  Set-ToastValue ([int]$previousValue)
}

Remove-Item -LiteralPath $StopPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $ConfigPath -Force -ErrorAction SilentlyContinue
`;

const getBrowserBridgeTokenPath = (): string =>
  join(app.getPath("userData"), "browser-extension-token.txt");

const loadBrowserBridgeToken = async (): Promise<void> => {
  try {
    const token = (await readFile(getBrowserBridgeTokenPath(), "utf8")).trim();
    browserBridgeToken = token || randomUUID();
  } catch {
    browserBridgeToken = randomUUID();
  }

  await writeFile(
    getBrowserBridgeTokenPath(),
    browserBridgeToken,
    "utf8",
  ).catch(() => undefined);
};

const getBrowserExtensionSource = (): string =>
  app.isPackaged
    ? join(process.resourcesPath, "browser-extension")
    : join(app.getAppPath(), "extension");

const startBrowserBridge = (): void => {
  if (browserBridgeServer) {
    return;
  }

  browserBridgeServer = createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Authorization");
    response.setHeader("Cache-Control", "no-store");

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const authorized =
      request.headers.authorization === `Bearer ${browserBridgeToken}`;
    if (!authorized) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    if (request.method !== "GET" || request.url !== "/v1/state") {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    browserExtensionLastSeenAt = Date.now();
    const active =
      websiteBlockingState.mode === "focus" &&
      websiteBlockingState.status === "running";
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        active,
        websites: active ? websiteBlockingState.websites : [],
      }),
    );
  });

  browserBridgeServer.on("error", () => {
    browserBridgeServer = null;
  });
  browserBridgeServer.listen(BROWSER_BRIDGE_PORT, "127.0.0.1");
};

const exportBrowserExtension =
  async (): Promise<BrowserExtensionExportResult> => {
    const saveDialogOptions = {
      title: "Download MonoFocus Website Blocker",
      defaultPath: join(
        app.getPath("downloads"),
        "MonoFocus-Browser-Extension.zip",
      ),
      buttonLabel: "Download extension",
      filters: [{ name: "ZIP archive", extensions: ["zip"] }],
      properties: ["createDirectory", "showOverwriteConfirmation"],
    } satisfies Electron.SaveDialogOptions;
    const saveResult = mainWindow
      ? await dialog.showSaveDialog(mainWindow, saveDialogOptions)
      : await dialog.showSaveDialog(saveDialogOptions);

    if (saveResult.canceled || !saveResult.filePath) {
      return { success: false, cancelled: true };
    }

    const exportRoot = join(
      app.getPath("temp"),
      `monofocus-extension-${randomUUID()}`,
    );
    const extensionDirectory = join(exportRoot, "MonoFocus Website Blocker");

    try {
      await mkdir(exportRoot, { recursive: true });
      await cp(getBrowserExtensionSource(), extensionDirectory, {
        recursive: true,
      });
      await writeFile(
        join(extensionDirectory, "config.js"),
        `globalThis.MONOFOCUS_CONFIG = Object.freeze(${JSON.stringify(
          {
            endpoint: `http://127.0.0.1:${BROWSER_BRIDGE_PORT}/v1/state`,
            token: browserBridgeToken,
          },
          null,
          2,
        )});\n`,
        "utf8",
      );
      await rm(saveResult.filePath, { force: true });

      const compressionScript =
        `Compress-Archive -LiteralPath ${quotePowerShell(extensionDirectory)} ` +
        `-DestinationPath ${quotePowerShell(saveResult.filePath)} -Force`;
      await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          compressionScript,
        ],
        { windowsHide: true, timeout: 30000 },
      );

      shell.showItemInFolder(saveResult.filePath);
      return { success: true, path: saveResult.filePath };
    } catch {
      return {
        success: false,
        error: "MonoFocus could not create the extension archive.",
      };
    } finally {
      await rm(exportRoot, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  };

const getEnabledExecutableNames = (): string[] => {
  const names = appBlockingState.apps
    .map((blockedApp) => blockedApp.exePath ?? blockedApp.name)
    .map((value) => value.split(/[\\/]/).pop()?.trim() ?? "")
    .map((value) => (value.toLowerCase().endsWith(".exe") ? value : `${value}.exe`))
    .filter((value) => /^[a-z0-9_.() -]+\.exe$/i.test(value))
    .filter((value) => !protectedExecutables.has(value.toLowerCase()));

  return [...new Set(names.map((name) => name.toLowerCase()))];
};

const quotePowerShell = (value: string): string =>
  `'${value.replaceAll("'", "''")}'`;

const stopElevatedAppBlocking = async (): Promise<void> => {
  const stopPath = elevatedHelperStopPath;
  elevatedHelperStopPath = null;
  elevatedHelperConfigPath = null;
  appBlockingPermissionGranted = false;

  if (stopPath) {
    await writeFile(stopPath, "", "utf8").catch(() => undefined);
  }
};

const startElevatedAppBlocking = async (
  executables: string[],
): Promise<void> => {
  if (
    process.platform !== "win32" ||
    elevatedHelperStarting ||
    elevatedHelperStopPath
  ) {
    return;
  }

  elevatedHelperStarting = true;
  const helperDirectory = join(app.getPath("userData"), "blocking-helper");
  const sessionId = randomUUID();
  const scriptPath = join(helperDirectory, "block-apps.ps1");
  const configPath = join(helperDirectory, `${sessionId}.json`);
  const stopPath = join(helperDirectory, `${sessionId}.stop`);

  try {
    await mkdir(helperDirectory, { recursive: true });
    await Promise.all([
      writeFile(scriptPath, elevatedBlockingScript, "utf8"),
      writeFile(configPath, JSON.stringify({ executables }), "utf8"),
      rm(stopPath, { force: true }),
    ]);

    const elevatedArguments = [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-ConfigPath",
      configPath,
      "-StopPath",
      stopPath,
      "-ParentPid",
      String(process.pid),
    ];
    const argumentList = elevatedArguments.map(quotePowerShell).join(",");
    const command =
      `Start-Process -FilePath 'powershell.exe' -Verb RunAs ` +
      `-WindowStyle Hidden -ArgumentList @(${argumentList})`;

    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        command,
      ],
      { windowsHide: true },
    );

    elevatedHelperConfigPath = configPath;
    elevatedHelperStopPath = stopPath;

    const latestExecutables = getEnabledExecutableNames();
    const shouldStillBlock =
      appBlockingState.mode === "focus" &&
      appBlockingState.status === "running" &&
      latestExecutables.length > 0;
    const shouldKeepHelperAlive =
      appBlockingPermissionGranted || shouldStillBlock;

    if (shouldKeepHelperAlive) {
      await writeFile(
        configPath,
        JSON.stringify({
          executables: shouldStillBlock ? latestExecutables : [],
        }),
        "utf8",
      );
    } else {
      await stopElevatedAppBlocking();
    }
  } catch {
    await Promise.all([
      rm(configPath, { force: true }),
      rm(stopPath, { force: true }),
    ]);
  } finally {
    elevatedHelperStarting = false;
  }
};

const syncElevatedAppBlocking = async (): Promise<void> => {
  const shouldBlock =
    appBlockingState.mode === "focus" &&
    appBlockingState.status === "running";
  const executables = getEnabledExecutableNames();

  if (!shouldBlock || executables.length === 0) {
    if (elevatedHelperConfigPath && appBlockingPermissionGranted) {
      await writeFile(
        elevatedHelperConfigPath,
        JSON.stringify({ executables: [] }),
        "utf8",
      ).catch(() => undefined);
      return;
    }

    await stopElevatedAppBlocking();
    return;
  }

  if (elevatedHelperConfigPath) {
    await writeFile(
      elevatedHelperConfigPath,
      JSON.stringify({ executables }),
      "utf8",
    ).catch(() => undefined);
    return;
  }

  await startElevatedAppBlocking(executables);
};

const requestAppBlockingPermission =
  async (): Promise<AppBlockingPermissionResult> => {
    if (process.platform !== "win32") {
      return {
        granted: false,
        error: "App blocking permissions are only available on Windows.",
      };
    }

    if (elevatedHelperStopPath) {
      appBlockingPermissionGranted = true;
      return { granted: true };
    }

    const permissionDialogOptions = {
      type: "question",
      title: "Allow app blocking",
      message: "Allow MonoFocus to close blocked apps during focus sessions?",
      detail:
        "Windows will ask for administrator permission once so MonoFocus can run its blocking helper. The helper stays idle until a focus session is active.",
      buttons: ["Allow", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    } satisfies Electron.MessageBoxOptions;
    const permissionResult = mainWindow
      ? await dialog.showMessageBox(mainWindow, permissionDialogOptions)
      : await dialog.showMessageBox(permissionDialogOptions);

    if (permissionResult.response !== 0) {
      return { granted: false, error: "Permission was cancelled." };
    }

    appBlockingPermissionGranted = true;
    await startElevatedAppBlocking([]);

    if (!elevatedHelperStopPath) {
      appBlockingPermissionGranted = false;
      return {
        granted: false,
        error: "Administrator permission was not granted.",
      };
    }

    return { granted: true };
  };

const stopElevatedNotificationControl = async (): Promise<void> => {
  const stopPath = notificationHelperStopPath;
  notificationHelperStopPath = null;
  notificationHelperConfigPath = null;
  notificationControlPermissionGranted = false;

  if (stopPath) {
    await writeFile(stopPath, "", "utf8").catch(() => undefined);
  }
};

const startElevatedNotificationControl = async (): Promise<void> => {
  if (
    process.platform !== "win32" ||
    notificationHelperStarting ||
    notificationHelperStopPath
  ) {
    return;
  }

  notificationHelperStarting = true;
  const helperDirectory = join(app.getPath("userData"), "notification-helper");
  const sessionId = randomUUID();
  const scriptPath = join(helperDirectory, "control-notifications.ps1");
  const configPath = join(helperDirectory, `${sessionId}.json`);
  const stopPath = join(helperDirectory, `${sessionId}.stop`);

  try {
    await mkdir(helperDirectory, { recursive: true });
    await Promise.all([
      writeFile(scriptPath, elevatedNotificationScript, "utf8"),
      writeFile(configPath, JSON.stringify({ silence: false }), "utf8"),
      rm(stopPath, { force: true }),
    ]);

    const elevatedArguments = [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
      "-ConfigPath",
      configPath,
      "-StopPath",
      stopPath,
      "-ParentPid",
      String(process.pid),
    ];
    const argumentList = elevatedArguments.map(quotePowerShell).join(",");
    const command =
      `Start-Process -FilePath 'powershell.exe' -Verb RunAs ` +
      `-WindowStyle Hidden -ArgumentList @(${argumentList})`;

    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        command,
      ],
      { windowsHide: true },
    );

    notificationHelperConfigPath = configPath;
    notificationHelperStopPath = stopPath;
  } catch {
    await Promise.all([
      rm(configPath, { force: true }),
      rm(stopPath, { force: true }),
    ]);
  } finally {
    notificationHelperStarting = false;
  }
};

const setWindowsNotificationsSilenced = async (
  silence: boolean,
): Promise<boolean> => {
  if (!notificationHelperConfigPath) {
    return false;
  }

  await writeFile(
    notificationHelperConfigPath,
    JSON.stringify({ silence }),
    "utf8",
  );
  return true;
};

const requestNotificationControlPermission =
  async (): Promise<NotificationControlPermissionResult> => {
    if (process.platform !== "win32") {
      return {
        granted: false,
        error: "Notification control is only available on Windows.",
      };
    }

    if (notificationHelperStopPath) {
      notificationControlPermissionGranted = true;
      return { granted: true };
    }

    const permissionDialogOptions = {
      type: "question",
      title: "Allow notification control",
      message:
        "Allow MonoFocus to turn on Windows notification quieting during focus sessions?",
      detail:
        "Windows will ask for administrator permission once so MonoFocus can run a small helper. It stays idle until a focus session starts, then restores your notification setting when the session ends.",
      buttons: ["Allow", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    } satisfies Electron.MessageBoxOptions;
    const permissionResult = mainWindow
      ? await dialog.showMessageBox(mainWindow, permissionDialogOptions)
      : await dialog.showMessageBox(permissionDialogOptions);

    if (permissionResult.response !== 0) {
      return { granted: false, error: "Permission was cancelled." };
    }

    notificationControlPermissionGranted = true;
    await startElevatedNotificationControl();

    if (!notificationHelperStopPath) {
      notificationControlPermissionGranted = false;
      return {
        granted: false,
        error: "Administrator permission was not granted.",
      };
    }

    return { granted: true };
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

const getOverlayPositionPath = (): string =>
  join(app.getPath("userData"), "overlay-position.json");

const clampOverlayPosition = (
  position: { x: number; y: number },
): { x: number; y: number } => {
  if (!focusOverlayWindow || focusOverlayWindow.isDestroyed()) {
    return position;
  }

  const display = screen.getDisplayNearestPoint(position);
  const { x, y, width, height } = display.workArea;
  const [overlayWidth, overlayHeight] = focusOverlayWindow.getSize();
  return {
    x: Math.min(Math.max(position.x, x), x + width - overlayWidth),
    y: Math.min(Math.max(position.y, y), y + height - overlayHeight),
  };
};

const saveOverlayPosition = async (): Promise<void> => {
  if (!customOverlayPosition) {
    return;
  }

  await writeFile(
    getOverlayPositionPath(),
    JSON.stringify(customOverlayPosition),
    "utf8",
  ).catch(() => undefined);
};

const loadOverlayPosition = async (): Promise<void> => {
  try {
    const position = JSON.parse(
      await readFile(getOverlayPositionPath(), "utf8"),
    ) as { x?: unknown; y?: unknown };
    if (typeof position.x === "number" && typeof position.y === "number") {
      customOverlayPosition = { x: position.x, y: position.y };
    }
  } catch {
    customOverlayPosition = null;
  }
};

const positionFocusOverlay = (): void => {
  if (!focusOverlayWindow || focusOverlayWindow.isDestroyed()) {
    return;
  }

  if (customOverlayPosition) {
    customOverlayPosition = clampOverlayPosition(customOverlayPosition);
    focusOverlayWindow.setPosition(
      customOverlayPosition.x,
      customOverlayPosition.y,
      false,
    );
    return;
  }

  const display = mainWindow
    ? screen.getDisplayMatching(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const { x, y, width } = display.workArea;
  const [overlayWidth] = focusOverlayWindow.getSize();
  focusOverlayWindow.setPosition(x + width - overlayWidth - 20, y + 20, false);
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

const syncTitleBarTheme = (theme = focusOverlayState.theme): void => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const titleBarTheme = titleBarThemes[theme ?? "mono"] ?? titleBarThemes.mono;

  mainWindow.setTitleBarOverlay({
    ...titleBarTheme,
    height: 44,
  });
  mainWindow.setBackgroundColor(titleBarTheme.color);
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
    movable: true,
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
    backgroundColor: titleBarThemes.mono.color,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      ...titleBarThemes.mono,
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
    syncTitleBarTheme();
    mainWindow?.show();
  });
  mainWindow.on("focus", syncFocusOverlay);
  mainWindow.on("blur", syncFocusOverlay);
  mainWindow.on("move", positionFocusOverlay);
  mainWindow.on("closed", () => {
    mainWindow = null;
    focusOverlayWindow?.close();
    void stopElevatedAppBlocking();
    void stopElevatedNotificationControl();
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
  ipcMain.handle("request-app-blocking-permission", (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      return {
        granted: false,
        error: "App blocking permission can only be requested from MonoFocus.",
      } satisfies AppBlockingPermissionResult;
    }

    return requestAppBlockingPermission();
  });
  ipcMain.handle("request-notification-control-permission", (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      return {
        granted: false,
        error:
          "Notification control permission can only be requested from MonoFocus.",
      } satisfies NotificationControlPermissionResult;
    }

    return requestNotificationControlPermission();
  });
  ipcMain.on(
    "update-focus-overlay",
    (event, state: FocusOverlayState) => {
      if (!mainWindow || event.sender !== mainWindow.webContents) {
        return;
      }

      focusOverlayState = state;
      syncTitleBarTheme(state.theme);
      syncFocusOverlay();
    },
  );
  ipcMain.on(
    "update-app-blocking",
    (event, state: AppBlockingState) => {
      if (!mainWindow || event.sender !== mainWindow.webContents) {
        return;
      }

      appBlockingState = state;
      void syncElevatedAppBlocking();
    },
  );
  ipcMain.on(
    "update-website-blocking",
    (event, state: WebsiteBlockingState) => {
      if (!mainWindow || event.sender !== mainWindow.webContents) {
        return;
      }

      websiteBlockingState = state;
    },
  );
  ipcMain.handle("export-browser-extension", (event) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) {
      return {
        success: false,
        error: "The extension can only be exported from the main app.",
      } satisfies BrowserExtensionExportResult;
    }

    return exportBrowserExtension();
  });
  ipcMain.handle("get-browser-extension-status", () => ({
    connected: Date.now() - browserExtensionLastSeenAt < 10000,
  }));
  ipcMain.on(
    "focus-overlay-pointer-down",
    (event, pointer: OverlayPointerPosition) => {
      if (
        !focusOverlayWindow ||
        event.sender !== focusOverlayWindow.webContents
      ) {
        return;
      }

      const [windowX, windowY] = focusOverlayWindow.getPosition();
      overlayDragState = {
        ...pointer,
        windowX,
        windowY,
        moved: false,
        startedAt: Date.now(),
      };
    },
  );
  ipcMain.on(
    "focus-overlay-pointer-move",
    (event, pointer: OverlayPointerPosition) => {
      if (
        !focusOverlayWindow ||
        event.sender !== focusOverlayWindow.webContents ||
        !overlayDragState
      ) {
        return;
      }

      const deltaX = pointer.screenX - overlayDragState.screenX;
      const deltaY = pointer.screenY - overlayDragState.screenY;
      if (!overlayDragState.moved && Math.hypot(deltaX, deltaY) < 5) {
        return;
      }

      overlayDragState.moved = true;
      customOverlayPosition = clampOverlayPosition({
        x: overlayDragState.windowX + deltaX,
        y: overlayDragState.windowY + deltaY,
      });
      focusOverlayWindow.setPosition(
        customOverlayPosition.x,
        customOverlayPosition.y,
        false,
      );
    },
  );
  ipcMain.on("focus-overlay-pointer-up", (event, cancelled: boolean) => {
    if (
      !focusOverlayWindow ||
      event.sender !== focusOverlayWindow.webContents ||
      !overlayDragState
    ) {
      return;
    }

    const moved = overlayDragState.moved;
    const wasQuickClick = Date.now() - overlayDragState.startedAt < 300;
    overlayDragState = null;
    if (cancelled) {
      return;
    }

    if (moved) {
      void saveOverlayPosition();
      return;
    }

    if (wasQuickClick && mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.handle("open-windows-notification-settings", async () => {
    if (process.platform !== "win32") {
      return false;
    }

    await shell.openExternal("ms-settings:notifications");
    return true;
  });

  ipcMain.handle("try-enable-focus-mode", async () => {
    const supported =
      notificationControlPermissionGranted &&
      (await setWindowsNotificationsSilenced(true).catch(() => false));

    return {
      supported,
      platform: process.platform,
    };
  });

  ipcMain.handle("try-restore-notification-mode", async () => {
    const supported = await setWindowsNotificationsSilenced(false).catch(
      () => false,
    );

    return {
      supported,
      platform: process.platform,
    };
  });

  void Promise.all([loadOverlayPosition(), loadBrowserBridgeToken()]).then(
    () => {
      startBrowserBridge();
      createWindow();
    },
  );

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  void stopElevatedAppBlocking();
  void stopElevatedNotificationControl();
  browserBridgeServer?.close();
  browserBridgeServer = null;
  if (process.platform !== "darwin") {
    app.quit();
  }
});
