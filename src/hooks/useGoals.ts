import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

// Types for goals
export interface Goal {
  id: number;
  name: string;
  type: 'time' | 'limit' | 'focus';
  category_id: number | null;
  application_id: number | null;
  target_minutes: number;
  period: 'daily' | 'weekly' | 'monthly';
  is_limit: boolean;
  is_active: boolean;
  created_at: string;
}

export interface GoalWithProgress extends Goal {
  current_progress: number;
  percentage: number;
  category_name?: string | null;
  category_color?: string | null;
  application_name?: string | null;
}

export interface GoalProgress {
  id: number;
  goal_id: number;
  date: string;
  achieved_minutes: number;
  is_completed: boolean;
  created_at: string;
}

export interface CreateGoalInput {
  name: string;
  type: 'time' | 'limit' | 'focus';
  category_id?: number | null;
  application_id?: number | null;
  target_minutes: number;
  period: 'daily' | 'weekly' | 'monthly';
  is_limit?: boolean;
}

export interface UpdateGoalInput {
  name?: string;
  type?: 'time' | 'limit' | 'focus';
  category_id?: number | null;
  application_id?: number | null;
  target_minutes?: number;
  period?: 'daily' | 'weekly' | 'monthly';
  is_limit?: boolean;
  is_active?: boolean;
}

export function useGoals() {
  const { invoke, channels } = useIpc();
  
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [activeGoals, setActiveGoals] = useState<GoalWithProgress[]>([]);
  const [warnings, setWarnings] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all goals
  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await invoke<GoalWithProgress[]>(channels.GOALS.GET_ALL);
    
    if (result.success && result.data) {
      setGoals(result.data);
    } else {
      setError(result.error || 'Failed to fetch goals');
    }
    
    setLoading(false);
  }, [invoke, channels]);

  // Fetch active goals
  const fetchActiveGoals = useCallback(async () => {
    const result = await invoke<GoalWithProgress[]>(channels.GOALS.GET_ACTIVE);
    
    if (result.success && result.data) {
      setActiveGoals(result.data);
    }
  }, [invoke, channels]);

  // Fetch limit warnings
  const fetchWarnings = useCallback(async () => {
    const result = await invoke<GoalWithProgress[]>(channels.GOALS.GET_WARNINGS);
    
    if (result.success && result.data) {
      setWarnings(result.data);
    }
  }, [invoke, channels]);

  // Get goal by ID
  const getGoalById = useCallback(async (id: number): Promise<GoalWithProgress | null> => {
    const result = await invoke<GoalWithProgress>(channels.GOALS.GET_BY_ID, id);
    
    if (result.success && result.data) {
      return result.data;
    }
    return null;
  }, [invoke, channels]);

  // Create goal
  const createGoal = useCallback(async (input: CreateGoalInput): Promise<GoalWithProgress | null> => {
    setError(null);
    
    const result = await invoke<GoalWithProgress>(channels.GOALS.CREATE, input);
    
    if (result.success && result.data) {
      setGoals(prev => [result.data!, ...prev]);
      if (result.data.is_active) {
        setActiveGoals(prev => [result.data!, ...prev]);
      }
      return result.data;
    } else {
      setError(result.error || 'Failed to create goal');
      return null;
    }
  }, [invoke, channels]);

  // Update goal
  const updateGoal = useCallback(async (id: number, updates: UpdateGoalInput): Promise<GoalWithProgress | null> => {
    setError(null);
    
    const result = await invoke<GoalWithProgress>(channels.GOALS.UPDATE, id, updates);
    
    if (result.success && result.data) {
      setGoals(prev => prev.map(g => g.id === id ? result.data! : g));
      setActiveGoals(prev => {
        if (result.data!.is_active) {
          const exists = prev.find(g => g.id === id);
          if (exists) {
            return prev.map(g => g.id === id ? result.data! : g);
          }
          return [result.data!, ...prev];
        } else {
          return prev.filter(g => g.id !== id);
        }
      });
      return result.data;
    } else {
      setError(result.error || 'Failed to update goal');
      return null;
    }
  }, [invoke, channels]);

  // Delete goal
  const deleteGoal = useCallback(async (id: number): Promise<boolean> => {
    setError(null);
    
    const result = await invoke<void>(channels.GOALS.DELETE, id);
    
    if (result.success) {
      setGoals(prev => prev.filter(g => g.id !== id));
      setActiveGoals(prev => prev.filter(g => g.id !== id));
      setWarnings(prev => prev.filter(g => g.id !== id));
      return true;
    } else {
      setError(result.error || 'Failed to delete goal');
      return false;
    }
  }, [invoke, channels]);

  // Toggle goal active status
  const toggleGoalActive = useCallback(async (id: number, isActive: boolean): Promise<boolean> => {
    const result = await invoke<void>(channels.GOALS.SET_ACTIVE, id, isActive);
    
    if (result.success) {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, is_active: isActive } : g));
      if (isActive) {
        const goal = goals.find(g => g.id === id);
        if (goal) {
          setActiveGoals(prev => [{ ...goal, is_active: true }, ...prev]);
        }
      } else {
        setActiveGoals(prev => prev.filter(g => g.id !== id));
      }
      return true;
    }
    return false;
  }, [invoke, channels, goals]);

  // Update goal progress manually
  const updateProgress = useCallback(async (goalId: number, minutes: number, date?: string): Promise<GoalWithProgress | null> => {
    const result = await invoke<GoalWithProgress>(channels.GOALS.UPDATE_PROGRESS, goalId, minutes, date);
    
    if (result.success && result.data) {
      setGoals(prev => prev.map(g => g.id === goalId ? result.data! : g));
      setActiveGoals(prev => prev.map(g => g.id === goalId ? result.data! : g));
      return result.data;
    }
    return null;
  }, [invoke, channels]);

  // Sync all goals progress with time entries
  const syncProgress = useCallback(async (date?: string): Promise<boolean> => {
    const result = await invoke<GoalWithProgress[]>(channels.GOALS.SYNC_PROGRESS, date);
    
    if (result.success && result.data) {
      setActiveGoals(result.data);
      // Also update the full goals list
      await fetchGoals();
      await fetchWarnings();
      return true;
    }
    return false;
  }, [invoke, channels, fetchGoals, fetchWarnings]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchGoals(),
      fetchActiveGoals(),
      fetchWarnings()
    ]);
  }, [fetchGoals, fetchActiveGoals, fetchWarnings]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, []);

  // Helper function to format target
  const formatTarget = useCallback((minutes: number, period: string): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let timeStr = '';
    if (hours > 0) {
      timeStr = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      timeStr = `${mins}m`;
    }
    
    return `${timeStr} / ${period}`;
  }, []);

  // Helper function to get status
  const getGoalStatus = useCallback((goal: GoalWithProgress): 'completed' | 'warning' | 'in_progress' | 'not_started' => {
    if (goal.percentage >= 100) return 'completed';
    if (goal.is_limit && goal.percentage >= 80) return 'warning';
    if (goal.percentage > 0) return 'in_progress';
    return 'not_started';
  }, []);

  // Helper to format minutes as time
  const formatMinutes = useCallback((minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }, []);

  return {
    // Data
    goals,
    activeGoals,
    warnings,
    
    // State
    loading,
    error,
    
    // Actions
    fetchGoals,
    fetchActiveGoals,
    fetchWarnings,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalActive,
    updateProgress,
    syncProgress,
    refresh,
    
    // Helpers
    formatTarget,
    getGoalStatus,
    formatMinutes
  };
}