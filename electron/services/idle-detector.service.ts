// time-tracker/electron/services/idle-detector.service.ts
import { powerMonitor, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import { SettingsRepository, TimeEntryRepository } from '../database/repositories';

export interface IdleState {
  isIdle: boolean;
  idleTime: number;
  lastActivity: Date;
}

class IdleDetectorService {
  private state: IdleState = {
    isIdle: false,
    idleTime: 0,
    lastActivity: new Date()
  };

  private checkInterval: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;
  private onIdleCallback: ((isIdle: boolean, action?: 'pause' | 'mark_idle' | 'ask') => void) | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  setOnIdleCallback(callback: (isIdle: boolean, action?: 'pause' | 'mark_idle' | 'ask') => void): void {
    this.onIdleCallback = callback;
  }

  getState(): IdleState {
    return { ...this.state };
  }

  start(): void {
    if (this.checkInterval) {
      return;
    }

    // Check if idle detection is enabled
    const settings = SettingsRepository.getAppSettings();
    if (!settings.idle_detection_enabled) {
      console.log('Idle detection is disabled in settings');
      return;
    }

    // Check idle state every second
    this.checkInterval = setInterval(() => {
      this.checkIdleState();
    }, 1000);

    // Listen for system events
    powerMonitor.on('suspend', () => this.handleSuspend());
    powerMonitor.on('resume', () => this.handleResume());
    powerMonitor.on('lock-screen', () => this.handleLockScreen());
    powerMonitor.on('unlock-screen', () => this.handleUnlockScreen());

    console.log('Idle detector started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    powerMonitor.removeAllListeners('suspend');
    powerMonitor.removeAllListeners('resume');
    powerMonitor.removeAllListeners('lock-screen');
    powerMonitor.removeAllListeners('unlock-screen');

    console.log('Idle detector stopped');
  }

  private checkIdleState(): void {
    const settings = SettingsRepository.getAppSettings();
    
    // Check if idle detection is still enabled
    if (!settings.idle_detection_enabled) {
      // If was idle, mark as not idle before stopping
      if (this.state.isIdle) {
        this.state.isIdle = false;
        if (this.onIdleCallback) {
          this.onIdleCallback(false);
        }
        this.notifyIdleChanged();
      }
      return;
    }
    
    const idleThreshold = settings.idle_threshold / 1000; // Convert to seconds

    // Get system idle time in seconds
    const systemIdleTime = powerMonitor.getSystemIdleTime();
    this.state.idleTime = systemIdleTime * 1000; // Store in milliseconds

    const wasIdle = this.state.isIdle;
    this.state.isIdle = systemIdleTime >= idleThreshold;

    // State changed
    if (wasIdle !== this.state.isIdle) {
      if (this.state.isIdle) {
        console.log(`User went idle after ${systemIdleTime}s (threshold: ${idleThreshold}s, action: ${settings.idle_action})`);
      } else {
        console.log('User returned from idle');
        this.state.lastActivity = new Date();
      }

      // Notify callback with the action type
      if (this.onIdleCallback) {
        this.onIdleCallback(this.state.isIdle, settings.idle_action);
      }

      // Notify renderer
      this.notifyIdleChanged();
    }
  }

  private handleSuspend(): void {
    console.log('System suspended');
    this.state.isIdle = true;
    this.notifyIdleChanged();
    if (this.onIdleCallback) {
      this.onIdleCallback(true);
    }
  }

  private handleResume(): void {
    console.log('System resumed');
    this.state.isIdle = false;
    this.state.lastActivity = new Date();
    this.notifyIdleChanged();
    if (this.onIdleCallback) {
      this.onIdleCallback(false);
    }
  }

  private handleLockScreen(): void {
    console.log('Screen locked');
    this.state.isIdle = true;
    this.notifyIdleChanged();
    if (this.onIdleCallback) {
      this.onIdleCallback(true);
    }
  }

  private handleUnlockScreen(): void {
    console.log('Screen unlocked');
    this.state.isIdle = false;
    this.state.lastActivity = new Date();
    this.notifyIdleChanged();
    if (this.onIdleCallback) {
      this.onIdleCallback(false);
    }
  }

  private notifyIdleChanged(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TRACKING.IDLE_CHANGED, {
        isIdle: this.state.isIdle,
        idleTime: this.state.idleTime,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Singleton instance
export const idleDetector = new IdleDetectorService();