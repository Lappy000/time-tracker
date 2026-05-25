import { getDatabase } from '../index';
import type { Setting } from '../schema';

export interface AppSettings {
  tracking_interval: number;
  idle_threshold: number;
  auto_start: boolean;
  minimize_to_tray: boolean;
  start_minimized: boolean;
  theme: 'dark' | 'light' | 'system';
  daily_goal_hours: number;
  break_reminder_interval: number;
  show_notifications: boolean;
  track_window_titles: boolean;
  exclude_patterns: string[];
  // Idle detection settings
  idle_detection_enabled: boolean;
  idle_action: 'pause' | 'mark_idle' | 'ask';
  // Notification settings
  notifications_enabled: boolean;
  break_reminder_enabled: boolean;
  limit_exceeded_notification: boolean;
  daily_summary_notification: boolean;
  notification_sound: boolean;
  // Screenshot settings
  screenshots_enabled: boolean;
  screenshots_interval: number;
  screenshots_quality: number;
  screenshots_retention_days: number;
  screenshots_private_apps: string[];
  // Privacy settings
  private_mode: boolean;
  data_retention_days: number;
  // Theme settings
  selected_theme: string;
  // Onboarding
  onboarding_completed: boolean;
}

export const SettingsRepository = {
  get(key: string): string | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value;
  },

  set(key: string, value: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now', 'localtime')
    `);
    stmt.run(key, value, value);
  },

  getAll(): Record<string, string> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT key, value FROM settings');
    const results = stmt.all() as Setting[];
    return results.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  },

  getAppSettings(): AppSettings {
    const raw = this.getAll();
    return {
      tracking_interval: parseInt(raw.tracking_interval || '1000', 10),
      idle_threshold: parseInt(raw.idle_threshold || '300000', 10),
      auto_start: raw.auto_start === 'true',
      minimize_to_tray: raw.minimize_to_tray === 'true',
      start_minimized: raw.start_minimized === 'true',
      theme: (raw.theme as 'dark' | 'light' | 'system') || 'dark',
      daily_goal_hours: parseInt(raw.daily_goal_hours || '8', 10),
      break_reminder_interval: parseInt(raw.break_reminder_interval || '3000000', 10),
      show_notifications: raw.show_notifications === 'true',
      track_window_titles: raw.track_window_titles === 'true',
      exclude_patterns: JSON.parse(raw.exclude_patterns || '[]'),
      // Idle detection settings
      idle_detection_enabled: raw.idle_detection_enabled !== 'false',
      idle_action: (raw.idle_action as 'pause' | 'mark_idle' | 'ask') || 'pause',
      // Notification settings
      notifications_enabled: raw.notifications_enabled !== 'false',
      break_reminder_enabled: raw.break_reminder_enabled !== 'false',
      limit_exceeded_notification: raw.limit_exceeded_notification !== 'false',
      daily_summary_notification: raw.daily_summary_notification !== 'false',
      notification_sound: raw.notification_sound !== 'false',
      // Screenshot settings
      screenshots_enabled: raw.screenshots_enabled === 'true',
      screenshots_interval: parseInt(raw.screenshots_interval || '300000', 10),
      screenshots_quality: parseInt(raw.screenshots_quality || '70', 10),
      screenshots_retention_days: parseInt(raw.screenshots_retention_days || '7', 10),
      screenshots_private_apps: JSON.parse(raw.screenshots_private_apps || '[]'),
      // Privacy settings
      private_mode: raw.private_mode === 'true',
      data_retention_days: parseInt(raw.data_retention_days || '0', 10),
      // Theme settings
      selected_theme: raw.selected_theme || 'dark',
      // Onboarding
      onboarding_completed: raw.onboarding_completed === 'true'
    };
  },

  updateAppSettings(updates: Partial<AppSettings>): void {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      if (updates.tracking_interval !== undefined) {
        this.set('tracking_interval', String(updates.tracking_interval));
      }
      if (updates.idle_threshold !== undefined) {
        this.set('idle_threshold', String(updates.idle_threshold));
      }
      if (updates.auto_start !== undefined) {
        this.set('auto_start', String(updates.auto_start));
      }
      if (updates.minimize_to_tray !== undefined) {
        this.set('minimize_to_tray', String(updates.minimize_to_tray));
      }
      if (updates.start_minimized !== undefined) {
        this.set('start_minimized', String(updates.start_minimized));
      }
      if (updates.theme !== undefined) {
        this.set('theme', updates.theme);
      }
      if (updates.daily_goal_hours !== undefined) {
        this.set('daily_goal_hours', String(updates.daily_goal_hours));
      }
      if (updates.break_reminder_interval !== undefined) {
        this.set('break_reminder_interval', String(updates.break_reminder_interval));
      }
      if (updates.show_notifications !== undefined) {
        this.set('show_notifications', String(updates.show_notifications));
      }
      if (updates.track_window_titles !== undefined) {
        this.set('track_window_titles', String(updates.track_window_titles));
      }
      if (updates.exclude_patterns !== undefined) {
        this.set('exclude_patterns', JSON.stringify(updates.exclude_patterns));
      }
      // New settings
      if (updates.idle_detection_enabled !== undefined) {
        this.set('idle_detection_enabled', String(updates.idle_detection_enabled));
      }
      if (updates.idle_action !== undefined) {
        this.set('idle_action', updates.idle_action);
      }
      if (updates.notifications_enabled !== undefined) {
        this.set('notifications_enabled', String(updates.notifications_enabled));
      }
      if (updates.break_reminder_enabled !== undefined) {
        this.set('break_reminder_enabled', String(updates.break_reminder_enabled));
      }
      if (updates.limit_exceeded_notification !== undefined) {
        this.set('limit_exceeded_notification', String(updates.limit_exceeded_notification));
      }
      if (updates.daily_summary_notification !== undefined) {
        this.set('daily_summary_notification', String(updates.daily_summary_notification));
      }
      if (updates.notification_sound !== undefined) {
        this.set('notification_sound', String(updates.notification_sound));
      }
      // Screenshot settings
      if (updates.screenshots_enabled !== undefined) {
        this.set('screenshots_enabled', String(updates.screenshots_enabled));
      }
      if (updates.screenshots_interval !== undefined) {
        this.set('screenshots_interval', String(updates.screenshots_interval));
      }
      if (updates.screenshots_quality !== undefined) {
        this.set('screenshots_quality', String(updates.screenshots_quality));
      }
      if (updates.screenshots_retention_days !== undefined) {
        this.set('screenshots_retention_days', String(updates.screenshots_retention_days));
      }
      if (updates.screenshots_private_apps !== undefined) {
        this.set('screenshots_private_apps', JSON.stringify(updates.screenshots_private_apps));
      }
      // Privacy settings
      if (updates.private_mode !== undefined) {
        this.set('private_mode', String(updates.private_mode));
      }
      if (updates.data_retention_days !== undefined) {
        this.set('data_retention_days', String(updates.data_retention_days));
      }
      // Theme settings
      if (updates.selected_theme !== undefined) {
        this.set('selected_theme', updates.selected_theme);
      }
      // Onboarding
      if (updates.onboarding_completed !== undefined) {
        this.set('onboarding_completed', String(updates.onboarding_completed));
      }
    });
    transaction();
  }
};