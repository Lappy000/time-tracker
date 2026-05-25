// time-tracker/electron/services/window-tracker.service.ts
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import {
  SessionRepository,
  ApplicationRepository,
  TimeEntryRepository,
  SettingsRepository,
  PrivacyRepository
} from '../database/repositories';

interface WindowInfo {
  title: string;
  owner: {
    name: string;
    path?: string;
    processId?: number;
  };
}

// Type for active-win result
interface ActiveWinResult {
  title: string;
  owner: {
    name: string;
    path?: string;
    processId?: number;
  };
}

// Type for the active-win function
type ActiveWinFunction = () => Promise<ActiveWinResult | undefined>;

// Cache the module function after first load
let activeWinFunction: ActiveWinFunction | null = null;

// Use Function constructor to prevent TypeScript from transforming import() to require()
// This is necessary because active-win is ESM-only and require() doesn't work with ESM modules
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

// Dynamic import for active-win (ESM module)
async function getActiveWindow(): Promise<ActiveWinResult | undefined> {
  try {
    if (!activeWinFunction) {
      const module = await dynamicImport('active-win');
      // active-win exports default function or activeWindow
      activeWinFunction = module.default || module.activeWindow || module;
    }
    const fn = activeWinFunction;
    if (!fn) {
      return undefined;
    }
    return await fn();
  } catch (error) {
    console.error('Failed to load or call active-win:', error);
    return undefined;
  }
}

export interface WindowTrackerState {
  isTracking: boolean;
  currentSessionId: number | null;
  currentEntryId: number | null;
  currentApp: {
    name: string;
    title: string;
  } | null;
}

class WindowTrackerService {
  private state: WindowTrackerState = {
    isTracking: false,
    currentSessionId: null,
    currentEntryId: null,
    currentApp: null
  };
  
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  getState(): WindowTrackerState {
    return { ...this.state };
  }

  async startTracking(): Promise<boolean> {
    if (this.state.isTracking) {
      console.log('Tracking already started');
      return true;
    }

    try {
      // Create a new session
      const session = SessionRepository.create();
      this.state.currentSessionId = session.id;
      this.state.isTracking = true;

      // Get tracking interval from settings
      const settings = SettingsRepository.getAppSettings();
      const interval = settings.tracking_interval || 1000;

      // Start polling
    this.pollInterval = setInterval(() => {
      if (this.isPolling) return;
      this.isPolling = true;
      this.pollActiveWindow().finally(() => { this.isPolling = false; });
    }, interval);

      // Poll immediately
      await this.pollActiveWindow();

      console.log('Tracking started, session:', session.id);
      return true;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      this.state.isTracking = false;
      this.state.currentSessionId = null;
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    if (!this.state.isTracking) {
      console.log('Tracking not started');
      return;
    }

    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // End current time entry if exists
    if (this.state.currentEntryId) {
      TimeEntryRepository.end(this.state.currentEntryId);
    }

    // End current session
    if (this.state.currentSessionId) {
      SessionRepository.end(this.state.currentSessionId);
    }

    // Reset state
    this.state = {
      isTracking: false,
      currentSessionId: null,
      currentEntryId: null,
      currentApp: null
    };

    console.log('Tracking stopped');
  }

  async pauseTracking(): Promise<void> {
    if (!this.state.isTracking) {
      console.log('Tracking not started, cannot pause');
      return;
    }

    // Stop polling but keep session alive
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // End current time entry if exists (but don't end session)
    if (this.state.currentEntryId) {
      TimeEntryRepository.end(this.state.currentEntryId);
      this.state.currentEntryId = null;
    }

    this.state.currentApp = null;
    console.log('Tracking paused (session still active)');
  }

  async resumeTracking(): Promise<void> {
    if (!this.state.isTracking || !this.state.currentSessionId) {
      console.log('Cannot resume - no active session');
      return;
    }

    // Restart polling if not already running
    if (!this.pollInterval) {
      const settings = SettingsRepository.getAppSettings();
      const interval = settings.tracking_interval || 1000;

    this.pollInterval = setInterval(() => {
      if (this.isPolling) return;
      this.isPolling = true;
      this.pollActiveWindow().finally(() => { this.isPolling = false; });
    }, interval);

      // Poll immediately
      await this.pollActiveWindow();
      console.log('Tracking resumed');
    }
  }

  private async pollActiveWindow(): Promise<void> {
    if (!this.state.isTracking || !this.state.currentSessionId) {
      return;
    }

    try {
      // Check if private mode is enabled
      if (PrivacyRepository.getPrivateMode()) {
        return;
      }

      const windowInfo = await getActiveWindow();
      
      if (!windowInfo) {
        // No active window (maybe locked screen)
        return;
      }

      const settings = SettingsRepository.getAppSettings();
      // Ensure app name is never empty - handle both null/undefined AND empty strings
      const rawAppName = windowInfo.owner?.name;
      const appName = (rawAppName && rawAppName.trim()) ? rawAppName.trim() : 'Unknown Application';
      const appPath = windowInfo.owner?.path;
      const windowTitle = settings.track_window_titles ? windowInfo.title : '';

      // Check if app is in excluded apps list (from privacy settings)
      if (PrivacyRepository.isAppExcluded(appName)) {
        return;
      }

      // Check if window title matches any excluded patterns
      if (PrivacyRepository.isWindowTitleExcluded(windowTitle)) {
        return;
      }

      // Check if excluded by legacy patterns
      if (this.isExcluded(appName, appPath, settings.exclude_patterns)) {
        return;
      }

      // Check if app/window changed
      const hasChanged = 
        !this.state.currentApp ||
        this.state.currentApp.name !== appName ||
        (settings.track_window_titles && this.state.currentApp.title !== windowTitle);

      if (hasChanged) {
        // End previous entry
        if (this.state.currentEntryId) {
          TimeEntryRepository.end(this.state.currentEntryId);
        }

        // Find or create application
        const app = ApplicationRepository.findOrCreate(appName, appPath);

        // Check if application should be tracked
        if (!app.is_tracked) {
          this.state.currentEntryId = null;
          this.state.currentApp = null;
          return;
        }

        // Create new time entry
        const entry = TimeEntryRepository.create(
          this.state.currentSessionId,
          app.id,
          windowTitle
        );

        this.state.currentEntryId = entry.id;
        this.state.currentApp = {
          name: appName,
          title: windowTitle
        };

        // Notify renderer about window change
        this.notifyWindowChanged(appName, windowTitle, app.category_id);
      }
    } catch (error) {
      console.error('Error polling active window:', error);
    }
  }

  private isExcluded(appName: string, appPath: string | undefined, patterns: string[]): boolean {
    const lowerName = appName.toLowerCase();
    const lowerPath = (appPath || '').toLowerCase();

    for (const pattern of patterns) {
      const lowerPattern = pattern.toLowerCase();
      if (lowerName.includes(lowerPattern) || lowerPath.includes(lowerPattern)) {
        return true;
      }
    }

    return false;
  }

  private notifyWindowChanged(appName: string, windowTitle: string, categoryId: number | null): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TRACKING.WINDOW_CHANGED, {
        name: appName,
        title: windowTitle,
        categoryId,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Singleton instance
export const windowTracker = new WindowTrackerService();