import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

// Types matching backend
export interface CalendarEvent {
  id: number;
  external_id: string | null;
  source: 'manual' | 'google' | 'outlook';
  title: string;
  start_time: string;
  end_time: string;
  project_id: number | null;
  notes: string | null;
}

export interface CalendarEventWithProject extends CalendarEvent {
  project_name: string | null;
  project_color: string | null;
}

export interface CreateCalendarEventInput {
  external_id?: string | null;
  source?: 'manual' | 'google' | 'outlook';
  title: string;
  start_time: string;
  end_time: string;
  project_id?: number | null;
  notes?: string | null;
}

export interface UpdateCalendarEventInput {
  external_id?: string | null;
  source?: 'manual' | 'google' | 'outlook';
  title?: string;
  start_time?: string;
  end_time?: string;
  project_id?: number | null;
  notes?: string | null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DayData {
  date: string;
  dayOfWeek: number;
  events: CalendarEventWithProject[];
  timeEntries: { hour: number; duration: number; apps: string[] }[];
}

export interface WeekViewData {
  startDate: string;
  endDate: string;
  days: DayData[];
}

export interface MonthDayData {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  eventCount: number;
  totalTrackedTime: number;
}

export interface MonthViewData {
  year: number;
  month: number;
  weeks: MonthDayData[][];
}

export interface EventAppUsage {
  name: string;
  duration: number;
  percentage: number;
}

// IPC Channels for calendar
const CALENDAR_CHANNELS = {
  GET_ALL: 'calendar:get-all',
  GET_BY_ID: 'calendar:get-by-id',
  GET_BY_DATE_RANGE: 'calendar:get-by-date-range',
  GET_BY_DAY: 'calendar:get-by-day',
  CREATE: 'calendar:create',
  UPDATE: 'calendar:update',
  DELETE: 'calendar:delete',
  GET_WEEK_VIEW: 'calendar:get-week-view',
  GET_MONTH_VIEW: 'calendar:get-month-view',
  GET_EVENT_APP_USAGE: 'calendar:get-event-app-usage',
  FORMAT_EVENT_USAGE: 'calendar:format-event-usage',
};

export type ViewMode = 'week' | 'month';

export function useCalendar() {
  const { invoke } = useIpc();
  const [events, setEvents] = useState<CalendarEventWithProject[]>([]);
  const [weekView, setWeekView] = useState<WeekViewData | null>(null);
  const [monthView, setMonthView] = useState<MonthViewData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch week view data
  const fetchWeekView = useCallback(async (date: Date = new Date()) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<WeekViewData>(CALENDAR_CHANNELS.GET_WEEK_VIEW, date.toISOString());
      if (result.success && result.data) {
        setWeekView(result.data);
        // Collect all events from the week
        const allEvents = result.data.days.flatMap(d => d.events);
        setEvents(allEvents);
      } else {
        setError(result.error || 'Failed to fetch week view');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // Fetch month view data
  const fetchMonthView = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<MonthViewData>(CALENDAR_CHANNELS.GET_MONTH_VIEW, year, month);
      if (result.success && result.data) {
        setMonthView(result.data);
      } else {
        setError(result.error || 'Failed to fetch month view');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // Fetch events by date range
  const fetchEvents = useCallback(async (dateRange: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<CalendarEventWithProject[]>(CALENDAR_CHANNELS.GET_BY_DATE_RANGE, dateRange);
      if (result.success && result.data) {
        setEvents(result.data);
      } else {
        setError(result.error || 'Failed to fetch events');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // Get single event
  const getEvent = useCallback(async (id: number): Promise<CalendarEventWithProject | null> => {
    try {
      const result = await invoke<CalendarEventWithProject>(CALENDAR_CHANNELS.GET_BY_ID, id);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [invoke]);

  // Create event
  const createEvent = useCallback(async (input: CreateCalendarEventInput): Promise<CalendarEvent | null> => {
    try {
      const result = await invoke<CalendarEvent>(CALENDAR_CHANNELS.CREATE, input);
      if (result.success && result.data) {
        // Refresh current view
        if (viewMode === 'week') {
          await fetchWeekView(currentDate);
        } else {
          await fetchMonthView(currentDate.getFullYear(), currentDate.getMonth() + 1);
        }
        return result.data;
      }
      setError(result.error || 'Failed to create event');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, viewMode, currentDate, fetchWeekView, fetchMonthView]);

  // Update event
  const updateEvent = useCallback(async (id: number, updates: UpdateCalendarEventInput): Promise<CalendarEvent | null> => {
    try {
      const result = await invoke<CalendarEvent>(CALENDAR_CHANNELS.UPDATE, id, updates);
      if (result.success && result.data) {
        // Refresh current view
        if (viewMode === 'week') {
          await fetchWeekView(currentDate);
        } else {
          await fetchMonthView(currentDate.getFullYear(), currentDate.getMonth() + 1);
        }
        return result.data;
      }
      setError(result.error || 'Failed to update event');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, viewMode, currentDate, fetchWeekView, fetchMonthView]);

  // Delete event
  const deleteEvent = useCallback(async (id: number): Promise<boolean> => {
    try {
      const result = await invoke<void>(CALENDAR_CHANNELS.DELETE, id);
      if (result.success) {
        // Refresh current view
        if (viewMode === 'week') {
          await fetchWeekView(currentDate);
        } else {
          await fetchMonthView(currentDate.getFullYear(), currentDate.getMonth() + 1);
        }
        return true;
      }
      setError(result.error || 'Failed to delete event');
      return false;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, viewMode, currentDate, fetchWeekView, fetchMonthView]);

  // Get app usage during event
  const getEventAppUsage = useCallback(async (eventId: number): Promise<EventAppUsage[]> => {
    try {
      const result = await invoke<EventAppUsage[]>(CALENDAR_CHANNELS.GET_EVENT_APP_USAGE, eventId);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [invoke]);

  // Get formatted event usage string
  const getFormattedEventUsage = useCallback(async (eventId: number): Promise<string> => {
    try {
      const result = await invoke<string>(CALENDAR_CHANNELS.FORMAT_EVENT_USAGE, eventId);
      if (result.success && result.data) {
        return result.data;
      }
      return '';
    } catch {
      return '';
    }
  }, [invoke]);

  // ========== NAVIGATION ==========

  // Go to previous week/month
  const goToPrevious = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, viewMode]);

  // Go to next week/month
  const goToNext = useCallback(() => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, viewMode]);

  // Go to today
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Go to specific date
  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Switch view mode
  const switchViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // ========== HELPERS ==========

  // Format time (e.g., "09:00" or "9:00 AM")
  const formatTime = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Format date (e.g., "Mon, Jan 15")
  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  // Format duration in minutes
  const formatDuration = useCallback((seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, []);

  // Get week range string (e.g., "Jan 15 - Jan 21, 2024")
  const getWeekRangeString = useCallback((): string => {
    if (!weekView) return '';
    const start = new Date(weekView.startDate);
    const end = new Date(weekView.endDate);
    const startStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }, [weekView]);

  // Get month string (e.g., "January 2024")
  const getMonthString = useCallback((): string => {
    if (!monthView) return '';
    const date = new Date(monthView.year, monthView.month - 1, 1);
    return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
  }, [monthView]);

  // Calculate event duration
  const getEventDuration = useCallback((event: CalendarEvent): number => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return (end.getTime() - start.getTime()) / 1000; // in seconds
  }, []);

  // Check if date is today
  const isToday = useCallback((dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }, []);

  // Effect: Fetch data when view mode or current date changes
  useEffect(() => {
    if (viewMode === 'week') {
      fetchWeekView(currentDate);
    } else {
      fetchMonthView(currentDate.getFullYear(), currentDate.getMonth() + 1);
    }
  }, [viewMode, currentDate, fetchWeekView, fetchMonthView]);

  return {
    // State
    events,
    weekView,
    monthView,
    viewMode,
    currentDate,
    loading,
    error,

    // Actions
    fetchWeekView,
    fetchMonthView,
    fetchEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,

    // Time correlation
    getEventAppUsage,
    getFormattedEventUsage,

    // Navigation
    goToPrevious,
    goToNext,
    goToToday,
    goToDate,
    switchViewMode,

    // Helpers
    formatTime,
    formatDate,
    formatDuration,
    getWeekRangeString,
    getMonthString,
    getEventDuration,
    isToday,
  };
}