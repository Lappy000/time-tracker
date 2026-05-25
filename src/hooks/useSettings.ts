import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

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
}

const defaultSettings: AppSettings = {
  tracking_interval: 1000,
  idle_threshold: 300000,
  auto_start: true,
  minimize_to_tray: true,
  start_minimized: false,
  theme: 'dark',
  daily_goal_hours: 8,
  break_reminder_interval: 3000000,
  show_notifications: true,
  track_window_titles: true,
  exclude_patterns: [],
  // Idle detection defaults
  idle_detection_enabled: true,
  idle_action: 'pause',
  // Notification defaults
  notifications_enabled: true,
  break_reminder_enabled: true,
  limit_exceeded_notification: true,
  daily_summary_notification: true,
  notification_sound: true,
  // Screenshot defaults
  screenshots_enabled: false,
  screenshots_interval: 300000,
  screenshots_quality: 70,
  screenshots_retention_days: 7,
  screenshots_private_apps: []
};

export function useSettings() {
  const { invoke, channels } = useIpc();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const result = await invoke<AppSettings>(channels.SETTINGS.GET);
    if (result.success && result.data) {
      setSettings(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to get settings');
    }
    setLoading(false);
  }, [invoke, channels]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const result = await invoke<AppSettings>(channels.SETTINGS.UPDATE, updates);
    if (result.success && result.data) {
      setSettings(result.data);
      return true;
    }
    setError(result.error || 'Failed to update settings');
    return false;
  }, [invoke, channels]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: fetchSettings
  };
}