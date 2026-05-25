// time-tracker/electron/auto-launch.ts
// Handles automatic startup with Windows/macOS/Linux
import { app } from 'electron';

const isDev = !app.isPackaged;

/**
 * Sets the auto-launch (start with system) setting
 * @param enabled - Whether to enable auto-launch
 */
export function setAutoLaunch(enabled: boolean): void {
  // Don't set auto-launch in development mode
  // In dev, process.execPath points to generic electron.exe which won't load our app
  if (isDev) {
    console.log('[AutoLaunch] Skipping auto-launch setup in development mode');
    return;
  }

  console.log(`[AutoLaunch] Setting auto-launch to: ${enabled}`);

  try {
    if (process.platform === 'darwin') {
      // macOS - uses LSSharedFileList (managed by Electron)
      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true // Start minimized to tray
      });
    } else if (process.platform === 'win32') {
      // Windows - adds/removes from HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
      // process.execPath points to the installed Time Tracker.exe
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
        args: ['--hidden'] // Start minimized when launched at login
      });
    } else {
      // Linux - handled differently depending on desktop environment
      // Electron creates appropriate autostart entries
      app.setLoginItemSettings({
        openAtLogin: enabled
      });
    }

    // Verify the setting was applied
    const current = getAutoLaunchEnabled();
    console.log(`[AutoLaunch] Auto-launch is now: ${current ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('[AutoLaunch] Failed to set auto-launch:', error);
  }
}

/**
 * Gets the current auto-launch status from the OS
 * @returns Whether auto-launch is currently enabled
 */
export function getAutoLaunchEnabled(): boolean {
  // In dev mode, always return false since we don't support auto-launch
  if (isDev) {
    return false;
  }

  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (error) {
    console.error('[AutoLaunch] Failed to get auto-launch status:', error);
    return false;
  }
}

/**
 * Syncs the OS auto-launch setting with the app's stored setting
 * Call this on app startup to ensure consistency
 * @param storedSetting - The auto-launch setting stored in the app's database
 */
export function syncAutoLaunch(storedSetting: boolean): void {
  if (isDev) {
    console.log('[AutoLaunch] Skipping sync in development mode');
    return;
  }

  const currentOsSetting = getAutoLaunchEnabled();
  
  if (currentOsSetting !== storedSetting) {
    console.log(`[AutoLaunch] Syncing: DB says ${storedSetting}, OS says ${currentOsSetting}`);
    console.log(`[AutoLaunch] Applying DB setting: ${storedSetting}`);
    setAutoLaunch(storedSetting);
  } else {
    console.log(`[AutoLaunch] Already in sync: ${storedSetting ? 'enabled' : 'disabled'}`);
  }
}

/**
 * Checks if the app was launched with the --hidden flag (auto-start)
 * @returns Whether the app was started at system login
 */
export function wasLaunchedAtLogin(): boolean {
  return process.argv.includes('--hidden');
}