# Auto-Launch (Start with Windows) Feature

This document explains how the Time Tracker app's auto-launch feature works on Windows and other platforms.

## Overview

The auto-launch feature allows Time Tracker to automatically start when Windows boots up. The app starts minimized to the system tray, allowing it to track time without user intervention.

## How to Enable/Disable

### From the App UI

1. Open Time Tracker
2. Go to **Settings** → **General Settings**
3. Toggle **"Auto-start with system"** switch
4. The change takes effect immediately

### What Happens Technically

When you enable auto-start:
- **Windows**: An entry is added to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
- **macOS**: The app is added to Login Items via LSSharedFileList
- **Linux**: An autostart `.desktop` file is created

## Implementation Details

### Files Involved

| File | Purpose |
|------|---------|
| [`electron/auto-launch.ts`](../electron/auto-launch.ts) | Core auto-launch logic |
| [`electron/main.ts`](../electron/main.ts) | Syncs setting on startup, handles `--hidden` flag |
| [`electron/ipc/handlers.ts`](../electron/ipc/handlers.ts) | IPC handler that calls `setAutoLaunch()` |
| [`src/components/settings/GeneralSettings.tsx`](../src/components/settings/GeneralSettings.tsx) | UI toggle |

### Key Functions

```typescript
// Set auto-launch enabled/disabled
setAutoLaunch(enabled: boolean): void

// Get current OS auto-launch status
getAutoLaunchEnabled(): boolean

// Sync stored setting with OS setting on startup
syncAutoLaunch(storedSetting: boolean): void

// Check if app was launched at login
wasLaunchedAtLogin(): boolean
```

### Startup Flow

1. App starts (either manually or at Windows login)
2. `main.ts` checks if launched with `--hidden` flag
3. Settings are loaded from the database
4. `syncAutoLaunch()` ensures OS registry matches stored setting
5. If launched at login (`--hidden`), window stays minimized to tray
6. If launched manually, window shows normally (unless `start_minimized` is enabled)

## Windows Registry Entry

When enabled, the following registry entry is created:

```
Key: HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
Name: Time Tracker
Value: "C:\Users\{user}\AppData\Local\Programs\time-tracker\Time Tracker.exe" --hidden
```

## Troubleshooting

### Auto-start not working?

1. **Check Windows Task Manager** → Startup tab → Look for "Time Tracker"
2. **Check Registry** → Run `regedit` → Navigate to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
3. **Rebuild the app** → Run `npm run build` or `pnpm build`

### App shows on auto-start instead of minimizing?

- Ensure the `--hidden` flag is in the registry entry
- Check that `start_minimized` setting is enabled

### Development Mode

Auto-launch is **disabled in development mode** because:
- `process.execPath` points to the generic `electron.exe`
- The dev app wouldn't load properly at login

To test auto-launch, build and install the production app:

```bash
npm run build
# or
pnpm build
```

Then install from `release/Time Tracker Setup 0.1.0.exe`.

## Related Settings

| Setting | Description |
|---------|-------------|
| `auto_start` | Enable/disable auto-launch |
| `start_minimized` | Always start minimized (even when launched manually) |
| `minimize_to_tray` | Keep running in tray when window is closed |

## API

The setting can be controlled via IPC:

```typescript
// Enable auto-start
await window.electron.invoke('settings:update', { auto_start: true });

// Disable auto-start  
await window.electron.invoke('settings:update', { auto_start: false });

// Get current settings (includes auto_start)
const result = await window.electron.invoke('settings:get');
console.log(result.data.auto_start); // true or false