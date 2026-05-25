import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

// Types for analytics data
export interface TodayStats {
  total_duration: number;
  productive_duration: number;
  distraction_duration: number;
  neutral_duration: number;
}

export interface TopApp {
  id: number;
  name: string;
  total_duration: number;
  category_name: string | null;
  category_color: string | null;
}

export interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  total_duration: number;
  is_idle: boolean;
}

export interface HourlyBreakdown {
  hour: number;
  duration: number;
  productive_duration: number;
}

export interface HourlyBreakdownByCategory {
  hour: number;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  duration: number;
}

export interface DailyBreakdown {
  date: string;
  duration: number;
  productive_duration: number;
}

export interface DailyBreakdownByCategory {
  date: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  duration: number;
}

export interface CategoryUsage {
  category: {
    id: number;
    name: string;
    color: string;
    icon: string | null;
    is_productive: boolean;
    productivity_score: number;
  };
  total_duration: number;
  app_count: number;
}

export interface TimeEntry {
  id: number;
  session_id: number;
  application_id: number;
  window_title: string | null;
  start_time: string;
  end_time: string | null;
  duration: number;
  is_idle: boolean;
  app_name?: string;
  category_name?: string;
  category_color?: string;
}

export interface TodayData {
  stats: TodayStats;
  topApps: TopApp[];
  sessions: Session[];
  hourlyBreakdown: HourlyBreakdown[];
}

export interface RangeData {
  entries: TimeEntry[];
  sessions: Session[];
  topApps: TopApp[];
}

export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

export function useAnalytics() {
  const { invoke, channels } = useIpc();
  
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [rangeData, setRangeData] = useState<RangeData | null>(null);
  const [categoryUsage, setCategoryUsage] = useState<CategoryUsage[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyBreakdown[]>([]);
  const [hourlyDataByCategory, setHourlyDataByCategory] = useState<HourlyBreakdownByCategory[]>([]);
  const [dailyData, setDailyData] = useState<DailyBreakdown[]>([]);
  const [dailyDataByCategory, setDailyDataByCategory] = useState<DailyBreakdownByCategory[]>([]);
  const [topApps, setTopApps] = useState<TopApp[]>([]);
  
  const [selectedRange, setSelectedRange] = useState<DateRange>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range based on selection
  const getDateRange = useCallback((range: DateRange): { startDate: string; endDate: string } => {
    const today = new Date();
    
    switch (range) {
      case 'today':
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        };
      case 'yesterday':
        const yesterday = subDays(today, 1);
        return {
          startDate: format(yesterday, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd')
        };
      case 'week':
        return {
          startDate: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          endDate: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        };
      case 'month':
        return {
          startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
          endDate: format(endOfMonth(today), 'yyyy-MM-dd')
        };
      case 'all':
        // Use a very early date to capture all data
        return {
          startDate: '2000-01-01',
          endDate: format(today, 'yyyy-MM-dd')
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate
        };
      default:
        return {
          startDate: format(today, 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd')
        };
    }
  }, [customStartDate, customEndDate]);

  // Fetch today's analytics
  const fetchTodayAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await invoke<TodayData>(channels.ANALYTICS.GET_TODAY);
    
    if (result.success && result.data) {
      console.log('useAnalytics: GET_TODAY data:', result.data);
      setTodayData(result.data);
      setHourlyData(result.data.hourlyBreakdown || []);
      setTopApps(result.data.topApps || []);
    } else {
      setError(result.error || 'Failed to fetch today analytics');
    }
    
    setLoading(false);
  }, [invoke, channels]);

  // Fetch analytics by date range
  const fetchRangeAnalytics = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    setError(null);
    
    const result = await invoke<RangeData>(channels.ANALYTICS.GET_RANGE, startDate, endDate);
    
    if (result.success && result.data) {
      setRangeData(result.data);
      setTopApps(result.data.topApps || []);
    } else {
      setError(result.error || 'Failed to fetch range analytics');
    }
    
    setLoading(false);
  }, [invoke, channels]);

  // Fetch category usage stats
  const fetchCategoryUsage = useCallback(async () => {
    const result = await invoke<CategoryUsage[]>(channels.ANALYTICS.GET_CATEGORIES);
    
    if (result.success && result.data) {
      setCategoryUsage(result.data);
    }
  }, [invoke, channels]);

  // Fetch hourly breakdown for a specific date
  const fetchHourlyBreakdown = useCallback(async (date: string) => {
    const result = await invoke<HourlyBreakdown[]>(channels.ANALYTICS.GET_HOURLY, date);
    
    if (result.success && result.data) {
      setHourlyData(result.data);
    }
  }, [invoke, channels]);

  // Fetch hourly breakdown by category for a specific date
  const fetchHourlyBreakdownByCategory = useCallback(async (date: string) => {
    const result = await invoke<HourlyBreakdownByCategory[]>(channels.ANALYTICS.GET_HOURLY_BY_CATEGORY, date);
    
    if (result.success && result.data) {
      setHourlyDataByCategory(result.data);
    }
  }, [invoke, channels]);

  // Fetch top apps with optional limit
  const fetchTopApps = useCallback(async (limit: number = 10) => {
    const result = await invoke<TopApp[]>(channels.ANALYTICS.GET_TOP_APPS, limit);
    
    if (result.success && result.data) {
      setTopApps(result.data);
    }
  }, [invoke, channels]);

  // Fetch daily breakdown for date range (for week/month/all-time views)
  const fetchDailyBreakdown = useCallback(async (startDate: string, endDate: string) => {
    const result = await invoke<DailyBreakdown[]>(channels.ANALYTICS.GET_DAILY, startDate, endDate);
    
    if (result.success && result.data) {
      setDailyData(result.data);
    }
  }, [invoke, channels]);

  // Fetch daily breakdown by category for date range
  const fetchDailyBreakdownByCategory = useCallback(async (startDate: string, endDate: string) => {
    const result = await invoke<DailyBreakdownByCategory[]>(channels.ANALYTICS.GET_DAILY_BY_CATEGORY, startDate, endDate);
    
    if (result.success && result.data) {
      setDailyDataByCategory(result.data);
    }
  }, [invoke, channels]);

  // Refresh all data based on current selection
  const refresh = useCallback(async () => {
    const { startDate, endDate } = getDateRange(selectedRange);
    
    if (selectedRange === 'today') {
      await fetchTodayAnalytics();
      // Fetch today's hourly breakdown by category
      const today = new Date().toISOString().split('T')[0];
      await fetchHourlyBreakdownByCategory(today);
    } else if (selectedRange === 'yesterday') {
      // Single day - use hourly breakdown
      await fetchRangeAnalytics(startDate, endDate);
      await fetchHourlyBreakdown(startDate);
      await fetchHourlyBreakdownByCategory(startDate);
    } else {
      // Multi-day ranges (week, month, all) - use daily breakdown
      await fetchRangeAnalytics(startDate, endDate);
      await fetchDailyBreakdown(startDate, endDate);
      await fetchDailyBreakdownByCategory(startDate, endDate);
    }
    
    await fetchCategoryUsage();
  }, [selectedRange, getDateRange, fetchTodayAnalytics, fetchRangeAnalytics, fetchHourlyBreakdown, fetchHourlyBreakdownByCategory, fetchDailyBreakdown, fetchDailyBreakdownByCategory, fetchCategoryUsage]);

  // Change date range selection and trigger immediate refresh
  const changeRange = useCallback(async (range: DateRange) => {
    setSelectedRange(range);
    
    // Immediately fetch new data for the selected range
    const today = new Date();
    let startDate: string;
    let endDate: string;
    
    switch (range) {
      case 'today':
        startDate = format(today, 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        startDate = format(yesterday, 'yyyy-MM-dd');
        endDate = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(startOfMonth(today), 'yyyy-MM-dd');
        endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'all':
        // Use a very early date to capture all data
        startDate = '2000-01-01';
        endDate = format(today, 'yyyy-MM-dd');
        break;
      case 'custom':
        return; // Don't auto-refresh for custom, wait for user to set dates
      default:
        startDate = format(today, 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
    }
    
    // Fetch data immediately
    if (range === 'today') {
      await fetchTodayAnalytics();
      const today = new Date().toISOString().split('T')[0];
      await fetchHourlyBreakdownByCategory(today);
    } else if (range === 'yesterday') {
      // Single day - use hourly breakdown
      await fetchRangeAnalytics(startDate, endDate);
      await fetchHourlyBreakdown(startDate);
      await fetchHourlyBreakdownByCategory(startDate);
    } else {
      // Multi-day ranges (week, month, all) - use daily breakdown
      await fetchRangeAnalytics(startDate, endDate);
      await fetchDailyBreakdown(startDate, endDate);
      await fetchDailyBreakdownByCategory(startDate, endDate);
    }
    await fetchCategoryUsage();
  }, [fetchTodayAnalytics, fetchRangeAnalytics, fetchHourlyBreakdown, fetchHourlyBreakdownByCategory, fetchDailyBreakdown, fetchDailyBreakdownByCategory, fetchCategoryUsage]);

  // Set custom date range
  const setCustomRange = useCallback((startDate: string, endDate: string) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    setSelectedRange('custom');
  }, []);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Calculate productivity score (0-100)
  // Accepts optional stats parameter for different date ranges
  // Formula: Higher productive % = higher score, Higher distracting % = lower score
  const calculateProductivityScore = useCallback((customStats?: {
    total_duration: number;
    productive_duration: number;
    distraction_duration: number;
    neutral_duration: number;
  }): number => {
    const stats = customStats || todayData?.stats;
    if (!stats || stats.total_duration === 0) return 0;
    
    // Calculate ratios
    const productiveRatio = stats.productive_duration / stats.total_duration; // 0.0 to 1.0
    const distractingRatio = stats.distraction_duration / stats.total_duration; // 0.0 to 1.0
    const neutralRatio = stats.neutral_duration / stats.total_duration; // 0.0 to 1.0
    
    // Score formula:
    // - Productive time adds to score (full weight: 0-100 points)
    // - Distracting time subtracts from score (penalty: -50 points at 100% distracting)
    // - Neutral time adds slightly (half weight: 0-25 points)
    // Base score starts at 50 for all-neutral time
    const productivePoints = productiveRatio * 100; // 0 to 100
    const distractingPenalty = distractingRatio * 50; // 0 to 50 penalty
    const neutralPoints = neutralRatio * 25; // 0 to 25
    
    // Calculate final score
    // If all productive: 100 points
    // If all distracting: 50 - 50 = 0 points
    // If all neutral: 25 + some base = ~50 points
    const score = productivePoints - distractingPenalty + neutralPoints;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [todayData]);

  // Format duration for display
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }, []);

  // Get full hourly data (0-23 hours)
  const getFullHourlyData = useCallback((): HourlyBreakdown[] => {
    const fullData: HourlyBreakdown[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const existing = hourlyData.find(h => h.hour === hour);
      fullData.push(existing || { hour, duration: 0, productive_duration: 0 });
    }
    
    return fullData;
  }, [hourlyData]);

  // Check if current range is multi-day
  const isMultiDayRange = useCallback((range: DateRange = selectedRange): boolean => {
    return range !== 'today' && range !== 'yesterday';
  }, [selectedRange]);

  return {
    // Data
    todayData,
    rangeData,
    categoryUsage,
    hourlyData,
    hourlyDataByCategory,
    dailyData,
    dailyDataByCategory,
    topApps,
    
    // State
    selectedRange,
    customStartDate,
    customEndDate,
    loading,
    error,
    
    // Actions
    refresh,
    changeRange,
    setCustomRange,
    fetchTodayAnalytics,
    fetchRangeAnalytics,
    fetchCategoryUsage,
    fetchHourlyBreakdown,
    fetchHourlyBreakdownByCategory,
    fetchDailyBreakdown,
    fetchDailyBreakdownByCategory,
    fetchTopApps,
    
    // Helpers
    calculateProductivityScore,
    formatDuration,
    getFullHourlyData,
    getDateRange,
    isMultiDayRange
  };
}