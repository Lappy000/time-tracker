import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

export interface CategoryLimit {
  id: number;
  category_id: number;
  daily_limit_minutes: number;
  warning_threshold_percent: number;
  action: 'notify' | 'block' | 'log';
  is_enabled: boolean;
  created_at?: string;
}

export interface CategoryLimitWithUsage extends CategoryLimit {
  category_name?: string;
  category_color?: string;
  used_minutes?: number;
  percent_used?: number;
}

export interface LimitStatus {
  category_id: number;
  category_name: string;
  daily_limit_minutes: number;
  used_minutes: number;
  percent_used: number;
  warning_threshold_percent: number;
  action: 'notify' | 'block' | 'log';
  is_warning: boolean;
  is_exceeded: boolean;
}

export interface CategoryLimitInput {
  category_id: number;
  daily_limit_minutes: number;
  warning_threshold_percent: number;
  action: 'notify' | 'block' | 'log';
  is_enabled: boolean;
}

export function useLimits() {
  const { invoke, on, channels } = useIpc();
  const [limits, setLimits] = useState<CategoryLimitWithUsage[]>([]);
  const [statuses, setStatuses] = useState<LimitStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<CategoryLimitWithUsage[]>(channels.LIMITS.GET_ALL);
      if (result.success && result.data) {
        setLimits(result.data);
      } else {
        setError(result.error || 'Failed to fetch limits');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke, channels]);

  const fetchStatuses = useCallback(async () => {
    try {
      const result = await invoke<LimitStatus[]>(channels.LIMITS.CHECK_STATUS);
      if (result.success && result.data) {
        setStatuses(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch limit statuses:', err);
    }
  }, [invoke, channels]);

  const getLimitByCategory = useCallback(async (categoryId: number): Promise<CategoryLimitWithUsage | null> => {
    try {
      const result = await invoke<CategoryLimitWithUsage | null>(channels.LIMITS.GET_BY_CATEGORY, categoryId);
      if (result.success) {
        return result.data || null;
      }
      setError(result.error || 'Failed to get limit');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, channels]);

  const upsertLimit = useCallback(async (limit: CategoryLimitInput): Promise<CategoryLimit | null> => {
    try {
      const result = await invoke<CategoryLimit>(channels.LIMITS.UPSERT, limit);
      if (result.success && result.data) {
        await fetchLimits();
        return result.data;
      }
      setError(result.error || 'Failed to save limit');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, channels, fetchLimits]);

  const deleteLimit = useCallback(async (categoryId: number): Promise<boolean> => {
    try {
      const result = await invoke(channels.LIMITS.DELETE, categoryId);
      if (result.success) {
        await fetchLimits();
        return true;
      }
      setError(result.error || 'Failed to delete limit');
      return false;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, channels, fetchLimits]);

  // Listen for limit warnings and exceeded events
  useEffect(() => {
    const unsubscribeWarning = on(channels.LIMITS.WARNING, (data: unknown) => {
      console.log('Limit warning:', data);
      fetchStatuses();
    });

    const unsubscribeExceeded = on(channels.LIMITS.EXCEEDED, (data: unknown) => {
      console.log('Limit exceeded:', data);
      fetchStatuses();
    });

    return () => {
      unsubscribeWarning();
      unsubscribeExceeded();
    };
  }, [on, channels, fetchStatuses]);

  useEffect(() => {
    fetchLimits();
    fetchStatuses();
  }, [fetchLimits, fetchStatuses]);

  return {
    limits,
    statuses,
    loading,
    error,
    fetchLimits,
    fetchStatuses,
    getLimitByCategory,
    upsertLimit,
    deleteLimit,
    clearError: () => setError(null)
  };
}