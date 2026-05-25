// time-tracker/electron/services/limits.service.ts
import { BrowserWindow, Notification } from 'electron';
import { LimitsRepository, SettingsRepository, type LimitStatus } from '../database/repositories';

interface LimitWarning {
  category_id: number;
  category_name: string;
  type: 'warning' | 'exceeded';
  percent_used: number;
  timestamp: Date;
}

class LimitsService {
  private mainWindow: BrowserWindow | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastWarnings: Map<number, LimitWarning> = new Map();
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  start(): void {
    if (this.checkInterval) {
      return;
    }

    // Initial check
    this.checkLimits();

    // Periodic check
    this.checkInterval = setInterval(() => {
      this.checkLimits();
    }, this.CHECK_INTERVAL_MS);

    console.log('Limits service started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.lastWarnings.clear();
    console.log('Limits service stopped');
  }

  checkLimits(): LimitStatus[] {
    try {
      const settings = SettingsRepository.getAppSettings();
      const statuses = LimitsRepository.checkStatus();

      for (const status of statuses) {
        const lastWarning = this.lastWarnings.get(status.category_id);
        const now = new Date();

        // Check if we need to emit a warning (at threshold)
        if (status.is_warning && (!lastWarning || lastWarning.type !== 'warning')) {
          this.emitWarning(status);
          this.lastWarnings.set(status.category_id, {
            category_id: status.category_id,
            category_name: status.category_name,
            type: 'warning',
            percent_used: status.percent_used,
            timestamp: now
          });
        }

        // Check if limit exceeded
        if (status.is_exceeded && (!lastWarning || lastWarning.type !== 'exceeded')) {
          this.emitLimitReached(status);
          this.lastWarnings.set(status.category_id, {
            category_id: status.category_id,
            category_name: status.category_name,
            type: 'exceeded',
            percent_used: status.percent_used,
            timestamp: now
          });
        }

        // Reset warning if under threshold again
        if (!status.is_warning && !status.is_exceeded && lastWarning) {
          this.lastWarnings.delete(status.category_id);
        }
      }

      return statuses;
    } catch (error) {
      console.error('Failed to check limits:', error);
      return [];
    }
  }

  emitWarning(status: LimitStatus): void {
    const settings = SettingsRepository.getAppSettings();
    
    // Check if notifications are enabled
    if (!settings.show_notifications) {
      return;
    }

    const message = `${status.category_name} has reached ${status.percent_used}% of daily limit`;
    
    // Show OS notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '⚠️ Time Limit Warning',
        body: message,
        silent: !(settings as any).notification_sound
      });
      notification.show();
    }

    // Notify renderer
    this.notifyRenderer('limits:warning', {
      category_id: status.category_id,
      category_name: status.category_name,
      percent_used: status.percent_used,
      message
    });

    console.log(`Warning: ${message}`);
  }

  emitLimitReached(status: LimitStatus): void {
    const settings = SettingsRepository.getAppSettings();
    
    // Check if notifications are enabled
    if (!settings.show_notifications) {
      return;
    }

    const message = `${status.category_name} has exceeded its daily limit!`;
    
    // Show OS notification
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: '🚫 Time Limit Exceeded',
        body: message,
        silent: !(settings as any).notification_sound
      });
      notification.show();
    }

    // Notify renderer
    this.notifyRenderer('limits:exceeded', {
      category_id: status.category_id,
      category_name: status.category_name,
      percent_used: status.percent_used,
      action: status.action,
      message
    });

    console.log(`Limit exceeded: ${message}`);

    // Handle blocking action if needed
    if (status.action === 'block') {
      this.handleBlockAction(status);
    }
  }

  private handleBlockAction(status: LimitStatus): void {
    // This could trigger app blocking logic
    // For now we just log it - full implementation would involve window tracking
    console.log(`Blocking action triggered for category: ${status.category_name}`);
    
    // Notify renderer about block
    this.notifyRenderer('limits:blocked', {
      category_id: status.category_id,
      category_name: status.category_name
    });
  }

  getUsageVsLimit(categoryId: number): { used: number; limit: number; percent: number } {
    const result = LimitsRepository.getUsageForCategory(categoryId);
    return {
      used: result.used_minutes,
      limit: result.limit_minutes,
      percent: result.percent
    };
  }

  getAllStatuses(): LimitStatus[] {
    return LimitsRepository.checkStatus();
  }

  private notifyRenderer(channel: string, data: unknown): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  // Reset warnings at midnight
  resetDailyWarnings(): void {
    this.lastWarnings.clear();
    console.log('Daily limit warnings reset');
  }
}

// Singleton instance
export const limitsService = new LimitsService();