import { useState, useCallback } from 'react';
import { useIpc } from './useIpc';

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

export function useNotifications() {
  const { invoke, channels } = useIpc();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send a notification
  const send = useCallback(async (payload: NotificationPayload): Promise<boolean> => {
    const result = await invoke<void>(channels.NOTIFICATIONS.SEND, payload);
    if (result.success) {
      // Refresh history after sending
      await fetchHistory();
      return true;
    }
    setError(result.error || 'Failed to send notification');
    return false;
  }, [invoke, channels]);

  // Fetch notification history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const result = await invoke<NotificationHistoryItem[]>(channels.NOTIFICATIONS.GET_HISTORY);
    if (result.success && result.data) {
      setHistory(result.data);
      setError(null);
    } else {
      setError(result.error || 'Failed to fetch notification history');
    }
    setLoading(false);
  }, [invoke, channels]);

  // Clear notification history
  const clearHistory = useCallback(async (): Promise<boolean> => {
    const result = await invoke<void>(channels.NOTIFICATIONS.CLEAR_HISTORY);
    if (result.success) {
      setHistory([]);
      return true;
    }
    setError(result.error || 'Failed to clear notification history');
    return false;
  }, [invoke, channels]);

  // Reset break timer
  const resetBreakTimer = useCallback(async (): Promise<boolean> => {
    const result = await invoke<void>(channels.NOTIFICATIONS.RESET_BREAK_TIMER);
    if (result.success) {
      return true;
    }
    setError(result.error || 'Failed to reset break timer');
    return false;
  }, [invoke, channels]);

  // Helper to send specific notification types
  const sendBreakReminder = useCallback(async (workingDuration?: number) => {
    const hours = workingDuration ? Math.floor(workingDuration / 3600000) : 0;
    const minutes = workingDuration ? Math.floor((workingDuration % 3600000) / 60000) : 0;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
    
    return send({
      type: 'breakReminder',
      title: 'Time for a break! ☕',
      body: `You've been working for ${timeStr}. Take a short break to stay productive.`,
      data: { workingDuration }
    });
  }, [send]);

  const sendLimitWarning = useCallback(async (categoryName: string, percentage: number) => {
    return send({
      type: 'limitWarning',
      title: `${categoryName} usage at ${percentage}%`,
      body: `You're approaching your daily limit for ${categoryName}.`,
      data: { categoryName, percentage }
    });
  }, [send]);

  const sendLimitExceeded = useCallback(async (categoryName: string) => {
    return send({
      type: 'limitExceeded',
      title: 'Daily limit reached! 🚫',
      body: `You've reached your daily limit for ${categoryName}.`,
      data: { categoryName }
    });
  }, [send]);

  const sendGoalProgress = useCallback(async (goalName: string, percentage: number) => {
    return send({
      type: 'goalProgress',
      title: `Goal Progress: ${percentage}%`,
      body: `${percentage}% of your "${goalName}" goal completed!`,
      data: { goalName, percentage }
    });
  }, [send]);

  const sendGoalAchieved = useCallback(async (goalName: string) => {
    return send({
      type: 'goalAchieved',
      title: '🎉 Daily goal achieved!',
      body: `Congratulations! You've completed your "${goalName}" goal.`,
      data: { goalName }
    });
  }, [send]);

  const sendFocusComplete = useCallback(async (duration: number) => {
    const minutes = Math.round(duration / 60);
    return send({
      type: 'focusComplete',
      title: '🎯 Focus session complete!',
      body: `Great work! You focused for ${minutes} minutes.`,
      data: { duration }
    });
  }, [send]);

  return {
    history,
    loading,
    error,
    send,
    fetchHistory,
    clearHistory,
    resetBreakTimer,
    // Helper methods
    sendBreakReminder,
    sendLimitWarning,
    sendLimitExceeded,
    sendGoalProgress,
    sendGoalAchieved,
    sendFocusComplete
  };
}