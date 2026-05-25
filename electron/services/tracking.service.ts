// time-tracker/electron/services/tracking.service.ts
import { BrowserWindow } from 'electron';
import { windowTracker, type WindowTrackerState } from './window-tracker.service';
import { idleDetector, type IdleState } from './idle-detector.service';
import { TimeEntryRepository, SettingsRepository } from '../database/repositories';
import { IPC_CHANNELS } from '../ipc/channels';

// Forward declaration to avoid circular dependency
let notificationsServiceRef: { onTrackingStarted: () => void; onTrackingStopped: () => void } | null = null;

export function setNotificationsServiceRef(service: { onTrackingStarted: () => void; onTrackingStopped: () => void }) {
  notificationsServiceRef = service;
}

export interface TrackingServiceState {
  isTracking: boolean;
  isPaused: boolean;
  isIdle: boolean;
  currentApp: {
    name: string;
    title: string;
  } | null;
}

class TrackingService {
  private mainWindow: BrowserWindow | null = null;
  private isPausedDueToIdle: boolean = false;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
    windowTracker.setMainWindow(window);
    idleDetector.setMainWindow(window);

    // Set up idle state callback with action type
    idleDetector.setOnIdleCallback((isIdle, action) => {
      this.handleIdleStateChange(isIdle, action);
    });
  }

  getState(): TrackingServiceState {
    const windowState = windowTracker.getState();
    const idleState = idleDetector.getState();

    return {
      isTracking: windowState.isTracking,
      isPaused: this.isPausedDueToIdle,
      isIdle: idleState.isIdle,
      currentApp: windowState.currentApp
    };
  }

  async startTracking(): Promise<boolean> {
    const success = await windowTracker.startTracking();
    if (success) {
      idleDetector.start();
      // Notify notifications service that tracking started
      if (notificationsServiceRef) {
        notificationsServiceRef.onTrackingStarted();
      }
    }
    return success;
  }

  async stopTracking(): Promise<void> {
    await windowTracker.stopTracking();
    idleDetector.stop();
    // Notify notifications service that tracking stopped
    if (notificationsServiceRef) {
      notificationsServiceRef.onTrackingStopped();
    }
  }

  private async handleIdleStateChange(isIdle: boolean, action?: 'pause' | 'mark_idle' | 'ask'): Promise<void> {
    const windowState = windowTracker.getState();
    const settings = SettingsRepository.getAppSettings();
    const idleAction = action || settings.idle_action;
    
    console.log(`Handling idle state change: isIdle=${isIdle}, action=${idleAction}`);
    
    if (isIdle) {
      // User went idle
      switch (idleAction) {
        case 'pause':
          // Pause tracking - stop the window tracker but keep session open
          if (windowState.isTracking && !this.isPausedDueToIdle) {
            console.log('Pausing tracking due to idle');
            this.isPausedDueToIdle = true;
            // End current entry but don't end session
            if (windowState.currentEntryId) {
              TimeEntryRepository.end(windowState.currentEntryId);
            }
            // Stop polling (internal method to pause without ending session)
            await windowTracker.pauseTracking();
            // Notify renderer
            this.notifyTrackingPaused(true);
          }
          break;
          
        case 'mark_idle':
          // Mark current entry as idle
          if (windowState.currentEntryId) {
            TimeEntryRepository.setIdle(windowState.currentEntryId, true);
          }
          break;
          
        case 'ask':
          // Show a dialog asking the user what to do
          // For now, default to marking as idle
          if (windowState.currentEntryId) {
            TimeEntryRepository.setIdle(windowState.currentEntryId, true);
          }
          // Send event to renderer to show dialog
          this.notifyIdlePrompt();
          break;
      }
    } else {
      // User returned from idle
      if (this.isPausedDueToIdle) {
        console.log('Resuming tracking after idle');
        this.isPausedDueToIdle = false;
        // Resume tracking
        await windowTracker.resumeTracking();
        // Notify renderer
        this.notifyTrackingPaused(false);
      } else if (windowState.currentEntryId) {
        // Mark entry as not idle
        TimeEntryRepository.setIdle(windowState.currentEntryId, false);
      }
    }
  }
  
  private notifyTrackingPaused(isPaused: boolean): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TRACKING.STATE_CHANGED, {
        isPaused,
        reason: 'idle',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  private notifyIdlePrompt(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.TRACKING.IDLE_PROMPT, {
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Singleton instance
export const trackingService = new TrackingService();