# MonoFocus

MonoFocus is a minimal black-and-white Pomodoro timer built for Windows 11 with Electron, React, TypeScript, and Vite.

## Features

- 25-minute focus, 5-minute short break, and 20-minute long break defaults
- Long break after every four completed focus sessions
- Timestamp-based countdown that stays accurate while minimized
- Start, pause, resume, reset, and skip controls
- Persistent tasks, settings, current timer state, and daily statistics
- Windows desktop notifications and a soft generated completion tone
- Custom durations, session cycles, sound, notifications, and auto-start options
- Responsive monochrome interface for compact and large app windows

## Requirements

- Windows 11
- Node.js 20 or newer
- npm 10 or newer

## Run locally

Open PowerShell in this folder:

```powershell
npm.cmd install
npm.cmd run dev
```

The install step also downloads the Electron Windows runtime. Using `npm.cmd`
avoids PowerShell execution-policy issues that can block `npm.ps1`.

## Production build

Build the application bundle:

```powershell
npm.cmd run build
```

Create a Windows x64 installer:

```powershell
npm.cmd run dist:win
```

The installer is written to `release/MonoFocus-Setup-1.0.0.exe`.

## Folder structure

```text
MonoFocus/
|-- electron/
|   |-- main/index.ts        Native window and Windows notifications
|   `-- preload/index.ts     Secure renderer-to-main API
|-- scripts/
|   `-- generate-icon.ps1    Converts the badge artwork into PNG/ICO assets
|-- src/
|   |-- components/          Timer, tasks, stats, header, and settings UI
|   |-- hooks/usePomodoro.ts Timer transitions and application state
|   |-- lib/                 Date, sound, and local storage helpers
|   |-- App.tsx              Main responsive layout
|   |-- constants.ts         Defaults, labels, and duration helpers
|   |-- styles.css           Complete monochrome design system
|   `-- types.ts             Shared TypeScript models
|-- electron.vite.config.ts
|-- package.json
`-- README.md
```

## Main components

- `usePomodoro` owns timer transitions, completion rules, task mutations, daily statistics, and persistence.
- `TimerCard` renders the circular progress display and timer controls.
- `TaskPanel` provides the current focus queue with add, complete, and delete actions.
- `StatsCard` shows today's Pomodoros, focus minutes, and completed tasks.
- `SettingsDialog` edits all timer and flow preferences.
- Electron's main process creates the native Windows window and sends desktop notifications through a narrow preload bridge.
