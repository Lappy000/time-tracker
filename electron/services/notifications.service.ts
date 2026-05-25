// time-tracker/electron/services/notifications.service.ts
import { Notification, BrowserWindow, app } from 'electron';
import { SettingsRepository, TimeEntryRepository, GoalRepository, LimitsRepository } from '../database/repositories';
import { trackingService } from './tracking.service';

export type NotificationType = 
  | 'breakReminder'
  | 'limitWarning'
  | 'limitExceeded'
  | 'goalProgress'
  | 'goalAchieved'
  | 'dailySummary'
  | 'idleDetected'
  | 'focusComplete';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationHistoryItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  dismissed: boolean;
}

class NotificationsService {
  private mainWindow: BrowserWindow | null = null;
  private breakReminderInterval: NodeJS.Timeout | null = null;
  private lastBreakReminderTime: Date | null = null;
  private notificationHistory: NotificationHistoryItem[] = [];
  private notificationIdCounter = 0;
  private activeTrackingStartTime: Date | null = null;

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  start(): void {
    console.log('Notifications service started');
    this.startBreakReminderScheduler();
  }

  stop(): void {
    this.stopBreakReminderScheduler();
    console.log('Notifications service stopped');
  }

  private getSettings() {
    return SettingsRepository.getAppSettings();
  }

  private canSendNotification(): boolean {
    const settings = this.getSettings();
    return settings.notifications_enabled;
  }

  private shouldPlaySound(): boolean {
    const settings = this.getSettings();
    return settings.notification_sound;
  }

  // Send a system notification
  send(payload: NotificationPayload): void {
    if (!this.canSendNotification()) {
      console.log('Notifications disabled, skipping:', payload.type);
      return;
    }

    // Check specific notification type settings
    const settings = this.getSettings();
    switch (payload.type) {
      case 'breakReminder':
        if (!settings.break_reminder_enabled) return;
        break;
      case 'limitWarning':
      case 'limitExceeded':
        if (!settings.limit_exceeded_notification) return;
        break;
      case 'dailySummary':
        if (!settings.daily_summary_notification) return;
        break;
      default:
        break;
    }

    // Create and show notification
    const notification = new Notification({
      title: payload.title,
      body: payload.body,
      silent: !this.shouldPlaySound(),
      icon: this.getNotificationIcon(payload.type)
    });

    notification.on('click', () => {
      this.handleNotificationClick(payload);
    });

    notification.show();

    // Add to history
    this.addToHistory(payload);

    console.log(`Notification sent: ${payload.type} - ${payload.title}`);
  }

  private getNotificationIcon(type: NotificationType): string | undefined {
    // Return appropriate icon path based on type
    // For now, use default app icon
    return undefined;
  }

  private handleNotificationClick(payload: NotificationPayload): void {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
      
      // Navigate to relevant page based on notification type
      switch (payload.type) {
        case 'goalProgress':
        case 'goalAchieved':
          this.mainWindow.webContents.send('navigate', 'goals');
          break;
        case 'limitWarning':
        case 'limitExceeded':
          this.mainWindow.webContents.send('navigate', 'settings');
          break;
        case 'dailySummary':
          this.mainWindow.webContents.send('navigate', 'analytics');
          break;
        case 'focusComplete':
          this.mainWindow.webContents.send('navigate', 'focus');
          break;
        default:
          this.mainWindow.webContents.send('navigate', 'dashboard');
      }
    }
  }

  private addToHistory(payload: NotificationPayload): void {
    const historyItem: NotificationHistoryItem = {
      id: ++this.notificationIdCounter,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      timestamp: new Date().toISOString(),
      dismissed: false
    };

    this.notificationHistory.unshift(historyItem);

    // Keep only last 100 notifications
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }
  }

  getHistory(): NotificationHistoryItem[] {
    return [...this.notificationHistory];
  }

  clearHistory(): void {
    this.notificationHistory = [];
  }

  // Break reminder scheduler
  private startBreakReminderScheduler(): void {
    const settings = this.getSettings();
    
    if (!settings.break_reminder_enabled || !settings.notifications_enabled) {
      return;
    }

    this.activeTrackingStartTime = new Date();

    // Check every minute if we should send a break reminder
    this.breakReminderInterval = setInterval(() => {
      this.checkBreakReminder();
    }, 60000); // Check every minute

    console.log('Break reminder scheduler started');
  }

  private stopBreakReminderScheduler(): void {
    if (this.breakReminderInterval) {
      clearInterval(this.breakReminderInterval);
      this.breakReminderInterval = null;
    }
    this.activeTrackingStartTime = null;
    console.log('Break reminder scheduler stopped');
  }

  private checkBreakReminder(): void {
    const settings = this.getSettings();
    const state = trackingService.getState();

    if (!state.isTracking || state.isIdle) {
      // Reset tracking start time when not actively tracking
      this.activeTrackingStartTime = null;
      return;
    }

    if (!this.activeTrackingStartTime) {
      this.activeTrackingStartTime = new Date();
      return;
    }

    const now = new Date();
    const workingDuration = now.getTime() - this.activeTrackingStartTime.getTime();
    const reminderInterval = settings.break_reminder_interval;

    // Check if enough time has passed since we started or since last reminder
    const timeSinceLastReminder = this.lastBreakReminderTime 
      ? now.getTime() - this.lastBreakReminderTime.getTime()
      : workingDuration;

    if (timeSinceLastReminder >= reminderInterval) {
      const hours = Math.floor(workingDuration / 3600000);
      const minutes = Math.floor((workingDuration % 3600000) / 60000);

      let timeStr = '';
      if (hours > 0) {
        timeStr = `${hours}h ${minutes}m`;
      } else {
        timeStr = `${minutes} minutes`;
      }

      this.send({
        type: 'breakReminder',
        title: 'Time for a break! ☕',
        body: `You've been working for ${timeStr}. Take a short break to stay productive.`,
        data: { workingDuration }
      });

      this.lastBreakReminderTime = now;
    }
  }

  // Notification helper methods for specific types

  sendLimitWarning(categoryName: string, percentage: number): void {
    this.send({
      type: 'limitWarning',
      title: `${categoryName} usage at ${percentage}%`,
      body: `You're approaching your daily limit for ${categoryName}.`,
      data: { categoryName, percentage }
    });
  }

  sendLimitExceeded(categoryName: string): void {
    this.send({
      type: 'limitExceeded',
      title: `Daily limit reached! 🚫`,
      body: `You've reached your daily limit for ${categoryName}.`,
      data: { categoryName }
    });
  }

  sendGoalProgress(goalName: string, percentage: number): void {
    const milestones = [25, 50, 75, 90];
    
    // Only send at milestones
    if (!milestones.includes(Math.floor(percentage))) {
      return;
    }

    this.send({
      type: 'goalProgress',
      title: `Goal Progress: ${percentage}%`,
      body: `${percentage}% of your "${goalName}" goal completed!`,
      data: { goalName, percentage }
    });
  }

  sendGoalAchieved(goalName: string): void {
    this.send({
      type: 'goalAchieved',
      title: '🎉 Daily goal achieved!',
      body: `Congratulations! You've completed your "${goalName}" goal.`,
      data: { goalName }
    });
  }

  sendDailySummary(): void {
    try {
      const stats = TimeEntryRepository.getTodayStats();
      
      const totalHours = Math.floor(stats.total_duration / 3600);
      const totalMinutes = Math.floor((stats.total_duration % 3600) / 60);
      const productiveHours = Math.floor(stats.productive_duration / 3600);
      const productiveMinutes = Math.floor((stats.productive_duration % 3600) / 60);

      let summaryBody = `Total time: ${totalHours}h ${totalMinutes}m`;
      if (stats.productive_duration > 0) {
        summaryBody += `\nProductive time: ${productiveHours}h ${productiveMinutes}m`;
      }

      this.send({
        type: 'dailySummary',
        title: '📊 Daily Summary',
        body: summaryBody,
        data: { stats }
      });
    } catch (error) {
      console.error('Failed to send daily summary:', error);
    }
  }

  sendIdleDetected(): void {
    this.send({
      type: 'idleDetected',
      title: 'You seem idle',
      body: 'No activity detected. Pause tracking?',
      data: {}
    });
  }

  sendFocusComplete(duration: number): void {
    const minutes = Math.round(duration / 60);
    this.send({
      type: 'focusComplete',
      title: '🎯 Focus session complete!',
      body: `Great work! You focused for ${minutes} minutes.`,
      data: { duration }
    });
  }

  // Schedule daily summary notification
  scheduleDailySummary(): void {
    // Schedule for 6 PM local time
    const now = new Date();
    const summaryTime = new Date();
    summaryTime.setHours(18, 0, 0, 0);

    if (summaryTime <= now) {
      // Already past 6 PM, schedule for tomorrow
      summaryTime.setDate(summaryTime.getDate() + 1);
    }

    const delay = summaryTime.getTime() - now.getTime();

    setTimeout(() => {
      this.sendDailySummary();
      // Reschedule for next day
      this.scheduleDailySummary();
    }, delay);

    console.log(`Daily summary scheduled for ${summaryTime.toISOString()}`);
  }

  // Called when tracking starts
  onTrackingStarted(): void {
    this.startBreakReminderScheduler();
  }

  // Called when tracking stops
  onTrackingStopped(): void {
    this.stopBreakReminderScheduler();
  }

  // Reset break timer (called when user takes a break)
  resetBreakTimer(): void {
    this.activeTrackingStartTime = new Date();
    this.lastBreakReminderTime = null;
    console.log('Break timer reset');
  }
}

// Singleton instance
export const notificationsService = new NotificationsService();