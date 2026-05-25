import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

// Define Application type locally to avoid importing from electron
export interface Application {
  id: number;
  name: string;
  executable_name: string;
  category_id: number | null;
  is_browser: boolean;
  is_tracked: boolean;
  first_seen: string;
  last_seen: string;
}

export interface ApplicationWithCategory extends Application {
  category_name?: string;
  category_color?: string;
  category_productivity_score?: number;
}

export function useApplications() {
  const { invoke, channels } = useIpc();
  const [applications, setApplications] = useState<ApplicationWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ApplicationWithCategory[]>(channels.APPLICATIONS.GET_ALL);
      if (result.success && result.data) {
        setApplications(result.data);
      } else {
        setError(result.error || 'Failed to fetch applications');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke, channels]);

  const updateApplicationCategory = useCallback(async (
    appId: number, 
    categoryId: number | null
  ): Promise<boolean> => {
    try {
      const result = await invoke(channels.APPLICATIONS.UPDATE_CATEGORY, appId, categoryId);
      if (result.success) {
        await fetchApplications();
        return true;
      } else {
        setError(result.error || 'Failed to update application category');
        return false;
      }
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, channels, fetchApplications]);

  const setApplicationTracked = useCallback(async (
    appId: number, 
    isTracked: boolean
  ): Promise<boolean> => {
    try {
      const result = await invoke(channels.APPLICATIONS.SET_TRACKED, appId, isTracked);
      if (result.success) {
        await fetchApplications();
        return true;
      } else {
        setError(result.error || 'Failed to update tracked status');
        return false;
      }
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, channels, fetchApplications]);

  const getUnassignedApps = useCallback((): ApplicationWithCategory[] => {
    return applications.filter(app => !app.category_id);
  }, [applications]);

  const getAppsByCategory = useCallback((categoryId: number): ApplicationWithCategory[] => {
    return applications.filter(app => app.category_id === categoryId);
  }, [applications]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    fetchApplications,
    updateApplicationCategory,
    setApplicationTracked,
    getUnassignedApps,
    getAppsByCategory,
    clearError: () => setError(null)
  };
}