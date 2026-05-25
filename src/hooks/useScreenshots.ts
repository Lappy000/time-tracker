import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

export interface Screenshot {
  id: number;
  session_id: number | null;
  application_id: number | null;
  file_path: string;
  thumbnail_path: string | null;
  timestamp: string;
  window_title: string | null;
  app_name?: string;
  category_name?: string;
  category_color?: string;
}

export interface ScreenshotSettings {
  screenshots_enabled: boolean;
  screenshots_interval: number;
  screenshots_quality: number;
  screenshots_retention_days: number;
  screenshots_private_apps: string[];
}

export interface ScreenshotStats {
  total: number;
  byApp: { app_name: string; count: number }[];
}

const defaultSettings: ScreenshotSettings = {
  screenshots_enabled: false,
  screenshots_interval: 300000, // 5 minutes
  screenshots_quality: 70,
  screenshots_retention_days: 7,
  screenshots_private_apps: []
};

export function useScreenshots() {
  const { invoke, channels } = useIpc();
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [settings, setSettings] = useState<ScreenshotSettings>(defaultSettings);
  const [stats, setStats] = useState<ScreenshotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all screenshots
  const fetchScreenshots = useCallback(async (limit?: number) => {
    setLoading(true);
    const result = await invoke<Screenshot[]>(channels.SCREENSHOTS.GET_ALL, limit);
    if (result.success && result.data) {
      setScreenshots(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch screenshots');
    }
    setLoading(false);
  }, [invoke, channels]);

  // Fetch screenshots by date range
  const fetchByDateRange = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    const result = await invoke<Screenshot[]>(channels.SCREENSHOTS.GET_BY_DATE_RANGE, startDate, endDate);
    if (result.success && result.data) {
      setScreenshots(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch screenshots');
    }
    setLoading(false);
  }, [invoke, channels]);

  // Fetch screenshots by application
  const fetchByApp = useCallback(async (appId: number) => {
    setLoading(true);
    const result = await invoke<Screenshot[]>(channels.SCREENSHOTS.GET_BY_APP, appId);
    if (result.success && result.data) {
      setScreenshots(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch screenshots');
    }
    setLoading(false);
  }, [invoke, channels]);

  // Get screenshot by ID
  const getById = useCallback(async (id: number): Promise<Screenshot | null> => {
    const result = await invoke<Screenshot>(channels.SCREENSHOTS.GET_BY_ID, id);
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  }, [invoke, channels]);

  // Delete screenshot
  const deleteScreenshot = useCallback(async (id: number): Promise<boolean> => {
    const result = await invoke<void>(channels.SCREENSHOTS.DELETE, id);
    if (result.success) {
      setScreenshots(prev => prev.filter(s => s.id !== id));
      return true;
    }
    setError(result.error || 'Failed to delete screenshot');
    return false;
  }, [invoke, channels]);

  // Delete multiple screenshots
  const deleteMultiple = useCallback(async (ids: number[]): Promise<number> => {
    let deleted = 0;
    for (const id of ids) {
      const success = await deleteScreenshot(id);
      if (success) deleted++;
    }
    return deleted;
  }, [deleteScreenshot]);

  // Delete old screenshots
  const deleteOld = useCallback(async (daysOld: number): Promise<number> => {
    const result = await invoke<{ deleted: number }>(channels.SCREENSHOTS.DELETE_OLD, daysOld);
    if (result.success && result.data) {
      await fetchScreenshots();
      return result.data.deleted;
    }
    return 0;
  }, [invoke, channels, fetchScreenshots]);

  // Take manual screenshot
  const takeManualScreenshot = useCallback(async (): Promise<{ success: boolean; path?: string; error?: string }> => {
    const result = await invoke<{ path?: string }>(channels.SCREENSHOTS.TAKE_MANUAL);
    if (result.success) {
      await fetchScreenshots();
      return { success: true, path: result.data?.path };
    }
    return { success: false, error: result.error };
  }, [invoke, channels, fetchScreenshots]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    const result = await invoke<ScreenshotSettings>(channels.SCREENSHOTS.GET_SETTINGS);
    if (result.success && result.data) {
      setSettings(result.data);
    }
  }, [invoke, channels]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<ScreenshotSettings>): Promise<boolean> => {
    const result = await invoke<ScreenshotSettings>(channels.SCREENSHOTS.UPDATE_SETTINGS, updates);
    if (result.success && result.data) {
      setSettings(result.data);
      return true;
    }
    setError(result.error || 'Failed to update settings');
    return false;
  }, [invoke, channels]);

  // Fetch stats
  const fetchStats = useCallback(async (startDate?: string, endDate?: string) => {
    const result = await invoke<ScreenshotStats>(channels.SCREENSHOTS.GET_STATS, startDate, endDate);
    if (result.success && result.data) {
      setStats(result.data);
    }
  }, [invoke, channels]);

  // Initial fetch
  useEffect(() => {
    fetchScreenshots();
    fetchSettings();
    fetchStats();
  }, [fetchScreenshots, fetchSettings, fetchStats]);

  return {
    screenshots,
    settings,
    stats,
    loading,
    error,
    fetchScreenshots,
    fetchByDateRange,
    fetchByApp,
    getById,
    deleteScreenshot,
    deleteMultiple,
    deleteOld,
    takeManualScreenshot,
    fetchSettings,
    updateSettings,
    fetchStats,
    refresh: fetchScreenshots
  };
}