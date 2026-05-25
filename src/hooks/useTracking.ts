import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

interface TrackingStats {
  total_duration: number;
  productive_duration: number;
  distraction_duration: number;
  neutral_duration: number;
}

interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  total_duration: number;
  active_duration: number;
  idle_duration: number;
}

interface CurrentApp {
  name: string;
  title?: string;
}

interface TrackingStatus {
  isTracking: boolean;
  isIdle: boolean;
  currentSession: Session | null;
  currentApp: CurrentApp | null;
  todayStats: TrackingStats;
}

export function useTracking() {
  const { invoke, on, channels } = useIpc();
  const [status, setStatus] = useState<TrackingStatus>({
    isTracking: false,
    isIdle: false,
    currentSession: null,
    currentApp: null,
    todayStats: {
      total_duration: 0,
      productive_duration: 0,
      distraction_duration: 0,
      neutral_duration: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const result = await invoke<TrackingStatus>(channels.TRACKING.GET_STATUS);
    if (result.success && result.data) {
      setStatus(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to get tracking status');
    }
    setLoading(false);
  }, [invoke, channels]);

  const startTracking = useCallback(async () => {
    const result = await invoke<Session>(channels.TRACKING.START);
    if (result.success) {
      await fetchStatus();
      return true;
    }
    setError(result.error || 'Failed to start tracking');
    return false;
  }, [invoke, channels, fetchStatus]);

  const stopTracking = useCallback(async () => {
    console.log('useTracking: Stopping tracking...');
    const result = await invoke(channels.TRACKING.STOP);
    console.log('useTracking: Stop result:', result);
    if (result.success) {
      await fetchStatus();
      return true;
    }
    setError(result.error || 'Failed to stop tracking');
    return false;
  }, [invoke, channels, fetchStatus]);

  // Fetch status on mount and periodically
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Listen for window changes
  useEffect(() => {
    const unsubscribeWindow = on(channels.TRACKING.WINDOW_CHANGED, (data: unknown) => {
      const windowData = data as { name: string; title?: string } | null;
      setStatus(prev => ({
        ...prev,
        currentApp: windowData
      }));
    });

    const unsubscribeIdle = on(channels.TRACKING.IDLE_CHANGED, (data: unknown) => {
      const idleData = data as { isIdle: boolean };
      setStatus(prev => ({
        ...prev,
        isIdle: idleData.isIdle
      }));
    });

    return () => {
      unsubscribeWindow();
      unsubscribeIdle();
    };
  }, [on, channels]);

  return {
    ...status,
    loading,
    error,
    startTracking,
    stopTracking,
    refreshStatus: fetchStatus
  };
}