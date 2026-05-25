import { useState, useEffect, useCallback, useRef } from 'react';
import { useIpc } from './useIpc';

// Types for focus sessions
export interface FocusSession {
  id: number;
  start_time: string;
  end_time: string | null;
  planned_duration: number;
  actual_duration: number;
  break_duration: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  breaks_taken: number;
  goal_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface FocusSessionWithGoal extends FocusSession {
  goal_name?: string | null;
  goal_target?: number | null;
}

export interface FocusStats {
  total_sessions: number;
  completed_sessions: number;
  total_focus_time: number;
  avg_session_duration: number;
  total_breaks: number;
  completion_rate: number;
}

export interface CreateFocusSessionInput {
  planned_duration?: number;
  break_duration?: number;
  goal_id?: number | null;
  notes?: string | null;
}

// Timer state
export interface TimerState {
  timeRemaining: number; // seconds
  isRunning: boolean;
  isBreak: boolean;
  progress: number; // 0-100
}

export function useFocus() {
  const { invoke, channels } = useIpc();
  
  // State
  const [activeSession, setActiveSession] = useState<FocusSessionWithGoal | null>(null);
  const [todaySessions, setTodaySessions] = useState<FocusSessionWithGoal[]>([]);
  const [todayStats, setTodayStats] = useState<FocusStats | null>(null);
  const [history, setHistory] = useState<FocusSessionWithGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: 0,
    isRunning: false,
    isBreak: false,
    progress: 0
  });
  
  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  // Clear timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sessionStartRef.current = null;
  }, []);

  // Start timer tick
  const startTimer = useCallback((session: FocusSession) => {
    clearTimer();
    
    const plannedDuration = session.planned_duration * 1000; // ms
    const alreadyElapsed = session.actual_duration * 1000; // ms
    
    sessionStartRef.current = Date.now() - alreadyElapsed;
    
    const tick = () => {
      const now = Date.now();
      const elapsed = now - (sessionStartRef.current || now);
      const remaining = Math.max(0, plannedDuration - elapsed);
      const progress = Math.min(100, (elapsed / plannedDuration) * 100);
      
      setTimerState({
        timeRemaining: Math.ceil(remaining / 1000),
        isRunning: session.status === 'active',
        isBreak: false,
        progress
      });
      
      // Auto-complete when timer reaches 0
      if (remaining <= 0 && session.status === 'active') {
        completeSession(session.id);
      }
    };
    
    // Initial tick
    tick();
    
    // Set interval
    timerRef.current = setInterval(tick, 1000);
  }, [clearTimer]);

  // Fetch active session
  const fetchActiveSession = useCallback(async () => {
    const result = await invoke<FocusSessionWithGoal | null>(channels.FOCUS.GET_ACTIVE);
    
    if (result.success) {
      setActiveSession(result.data || null);
      
      if (result.data && result.data.status === 'active') {
        startTimer(result.data);
      } else if (result.data && result.data.status === 'paused') {
        // Show paused state
        const elapsed = result.data.actual_duration;
        const remaining = result.data.planned_duration - elapsed;
        const progress = (elapsed / result.data.planned_duration) * 100;
        
        setTimerState({
          timeRemaining: remaining,
          isRunning: false,
          isBreak: false,
          progress
        });
      } else {
        clearTimer();
        setTimerState({
          timeRemaining: 0,
          isRunning: false,
          isBreak: false,
          progress: 0
        });
      }
    }
    
    return result.data || null;
  }, [invoke, channels, startTimer, clearTimer]);

  // Fetch today's sessions
  const fetchToday = useCallback(async () => {
    const result = await invoke<{ sessions: FocusSessionWithGoal[], stats: FocusStats }>(channels.FOCUS.GET_TODAY);
    
    if (result.success && result.data) {
      setTodaySessions(result.data.sessions);
      setTodayStats(result.data.stats);
    }
  }, [invoke, channels]);

  // Fetch history
  const fetchHistory = useCallback(async (limit: number = 20) => {
    const result = await invoke<FocusSessionWithGoal[]>(channels.FOCUS.GET_HISTORY, limit);
    
    if (result.success && result.data) {
      setHistory(result.data);
    }
  }, [invoke, channels]);

  // Start a new focus session
  const startSession = useCallback(async (input?: CreateFocusSessionInput): Promise<FocusSessionWithGoal | null> => {
    setLoading(true);
    setError(null);
    
    const result = await invoke<FocusSessionWithGoal>(channels.FOCUS.START, input);
    
    if (result.success && result.data) {
      setActiveSession(result.data);
      startTimer(result.data);
      await fetchToday();
      setLoading(false);
      return result.data;
    } else {
      setError(result.error || 'Failed to start focus session');
      setLoading(false);
      return null;
    }
  }, [invoke, channels, startTimer, fetchToday]);

  // Pause active session
  const pauseSession = useCallback(async (id?: number): Promise<boolean> => {
    const sessionId = id || activeSession?.id;
    if (!sessionId) return false;
    
    const result = await invoke<FocusSessionWithGoal>(channels.FOCUS.PAUSE, sessionId);
    
    if (result.success && result.data) {
      setActiveSession(result.data);
      clearTimer();
      
      // Update timer state to paused
      const elapsed = result.data.actual_duration;
      const remaining = result.data.planned_duration - elapsed;
      const progress = (elapsed / result.data.planned_duration) * 100;
      
      setTimerState({
        timeRemaining: remaining,
        isRunning: false,
        isBreak: false,
        progress
      });
      
      return true;
    }
    return false;
  }, [invoke, channels, activeSession, clearTimer]);

  // Resume paused session
  const resumeSession = useCallback(async (id?: number): Promise<boolean> => {
    const sessionId = id || activeSession?.id;
    if (!sessionId) return false;
    
    const result = await invoke<FocusSessionWithGoal>(channels.FOCUS.RESUME, sessionId);
    
    if (result.success && result.data) {
      setActiveSession(result.data);
      startTimer(result.data);
      return true;
    }
    return false;
  }, [invoke, channels, activeSession, startTimer]);

  // Complete session
  const completeSession = useCallback(async (id?: number, notes?: string): Promise<FocusSessionWithGoal | null> => {
    const sessionId = id || activeSession?.id;
    if (!sessionId) return null;
    
    const result = await invoke<FocusSessionWithGoal>(channels.FOCUS.COMPLETE, sessionId, notes);
    
    if (result.success && result.data) {
      setActiveSession(null);
      clearTimer();
      setTimerState({
        timeRemaining: 0,
        isRunning: false,
        isBreak: false,
        progress: 100
      });
      await fetchToday();
      return result.data;
    }
    return null;
  }, [invoke, channels, activeSession, clearTimer, fetchToday]);

  // Cancel session
  const cancelSession = useCallback(async (id?: number): Promise<boolean> => {
    const sessionId = id || activeSession?.id;
    if (!sessionId) return false;
    
    const result = await invoke<void>(channels.FOCUS.CANCEL, sessionId);
    
    if (result.success) {
      setActiveSession(null);
      clearTimer();
      setTimerState({
        timeRemaining: 0,
        isRunning: false,
        isBreak: false,
        progress: 0
      });
      await fetchToday();
      return true;
    }
    return false;
  }, [invoke, channels, activeSession, clearTimer, fetchToday]);

  // Add break
  const addBreak = useCallback(async (id?: number): Promise<boolean> => {
    const sessionId = id || activeSession?.id;
    if (!sessionId) return false;
    
    const result = await invoke<FocusSessionWithGoal>(channels.FOCUS.ADD_BREAK, sessionId);
    
    if (result.success && result.data) {
      setActiveSession(result.data);
      return true;
    }
    return false;
  }, [invoke, channels, activeSession]);

  // Update session notes
  const updateNotes = useCallback(async (notes: string, id?: number): Promise<boolean> => {
    const sessionId = id || activeSession?.id;
    if (!sessionId) return false;
    
    const result = await invoke<FocusSessionWithGoal>(channels.FOCUS.UPDATE_NOTES, sessionId, notes);
    
    if (result.success && result.data) {
      setActiveSession(result.data);
      return true;
    }
    return false;
  }, [invoke, channels, activeSession]);

  // Delete session
  const deleteSession = useCallback(async (id: number): Promise<boolean> => {
    const result = await invoke<void>(channels.FOCUS.DELETE, id);
    
    if (result.success) {
      if (activeSession?.id === id) {
        setActiveSession(null);
        clearTimer();
      }
      setHistory(prev => prev.filter(s => s.id !== id));
      setTodaySessions(prev => prev.filter(s => s.id !== id));
      return true;
    }
    return false;
  }, [invoke, channels, activeSession, clearTimer]);

  // Get formatted time
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get formatted duration
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }, []);

  // Quick start presets (in seconds)
  const presets = {
    pomodoro: { duration: 25 * 60, break: 5 * 60, label: '25 min' },
    short: { duration: 15 * 60, break: 3 * 60, label: '15 min' },
    long: { duration: 50 * 60, break: 10 * 60, label: '50 min' },
    hour: { duration: 60 * 60, break: 15 * 60, label: '1 hour' }
  };

  // Start with preset
  const startWithPreset = useCallback(async (preset: keyof typeof presets, goalId?: number) => {
    const config = presets[preset];
    return startSession({
      planned_duration: config.duration,
      break_duration: config.break,
      goal_id: goalId
    });
  }, [startSession]);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchActiveSession(),
      fetchToday(),
      fetchHistory()
    ]);
    setLoading(false);
  }, [fetchActiveSession, fetchToday, fetchHistory]);

  // Initial fetch
  useEffect(() => {
    refresh();
    
    return () => {
      clearTimer();
    };
  }, []);

  // Status helpers
  const isActive = activeSession?.status === 'active';
  const isPaused = activeSession?.status === 'paused';
  const hasActiveSession = activeSession !== null && ['active', 'paused'].includes(activeSession.status);

  return {
    // State
    activeSession,
    todaySessions,
    todayStats,
    history,
    timerState,
    loading,
    error,
    
    // Status
    isActive,
    isPaused,
    hasActiveSession,
    
    // Actions
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    addBreak,
    updateNotes,
    deleteSession,
    
    // Quick start
    presets,
    startWithPreset,
    
    // Fetch
    fetchActiveSession,
    fetchToday,
    fetchHistory,
    refresh,
    
    // Formatters
    formatTime,
    formatDuration
  };
}