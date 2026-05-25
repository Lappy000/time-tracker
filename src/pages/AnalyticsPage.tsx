import { useEffect, useMemo } from 'react';
import { RefreshCw, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DailyChart,
  CategoryPie,
  ProductivityScore,
  DateRangePicker,
  Timeline,
  TopAppsList
} from '../components/analytics';
import { useAnalytics } from '../hooks/useAnalytics';

export function AnalyticsPage() {
  const {
    todayData,
    rangeData,
    categoryUsage,
    hourlyData,
    hourlyDataByCategory,
    dailyData,
    dailyDataByCategory,
    topApps,
    selectedRange,
    customStartDate,
    customEndDate,
    loading,
    error,
    refresh,
    changeRange,
    setCustomRange,
    calculateProductivityScore,
    formatDuration,
    isMultiDayRange
  } = useAnalytics();

  // Get stats based on selected range
  // For "today", use todayData.stats directly
  // For other ranges, calculate from categoryUsage which has is_productive and productivity_score
  const stats = useMemo(() => {
    if (selectedRange === 'today' && todayData?.stats) {
      return todayData.stats;
    }
    
    // Calculate stats from categoryUsage for non-today ranges
    // Categories with is_productive=true OR productivity_score > 50 are productive
    // Categories with productivity_score < 50 (and is_productive=false) are distracting
    // Categories with productivity_score = 50 are neutral
    let total = 0;
    let productive = 0;
    let distracting = 0;
    let neutral = 0;
    
    categoryUsage.forEach(item => {
      const duration = item.total_duration;
      total += duration;
      
      const score = item.category.productivity_score;
      const isProductive = item.category.is_productive;
      
      if (isProductive || score > 50) {
        productive += duration;
      } else if (score < 50) {
        distracting += duration;
      } else {
        neutral += duration;
      }
    });
    
    return {
      total_duration: total,
      productive_duration: productive,
      distraction_duration: distracting,
      neutral_duration: neutral
    };
  }, [selectedRange, todayData, categoryUsage]);

  // Pass the current range's stats to calculate accurate productivity score
  const productivityScore = calculateProductivityScore(stats);

  // Refresh on mount
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed productivity insights and reports
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <DateRangePicker
          selectedRange={selectedRange}
          onRangeChange={changeRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {/* Summary cards - responsive grid that fills available space */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <SummaryCard
          title="Total Time"
          value={formatDuration(stats.total_duration)}
          icon={<Clock className="h-4 w-4" />}
          color="text-blue-500"
        />
        <SummaryCard
          title="Productive"
          value={formatDuration(stats.productive_duration)}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-green-500"
        />
        <SummaryCard
          title="Distracting"
          value={formatDuration(stats.distraction_duration)}
          icon={<BarChart3 className="h-4 w-4" />}
          color="text-red-500"
        />
        <SummaryCard
          title="Score"
          value={`${productivityScore}`}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-purple-500"
          subtitle="/ 100"
        />
      </div>

      {/* Main content grid - responsive layout that expands with window */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_420px] gap-4 sm:gap-6">
        {/* Left column - Charts (expands to fill available space) */}
        <div className="min-w-0 space-y-4 sm:space-y-6 relative z-0">
          {/* Activity chart - hourly for single day, daily for multi-day ranges */}
          <DailyChart
            data={hourlyData}
            categoryData={hourlyDataByCategory}
            dailyData={dailyData}
            dailyCategoryData={dailyDataByCategory}
            isMultiDay={isMultiDayRange()}
            title={isMultiDayRange() ? "Activity by Day" : "Activity by Hour"}
          />

          {/* Category distribution and Top Apps - responsive grid with more space for apps list */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4 sm:gap-6">
            <div className="min-w-0 overflow-hidden">
              <CategoryPie
                data={categoryUsage}
                title="Time by Category"
              />
            </div>
            <div className="min-w-0 overflow-hidden">
              <TopAppsList
                apps={topApps}
                title="Top Applications"
                limit={10}
              />
            </div>
          </div>
        </div>

        {/* Right column - Score & Timeline (fixed width on large screens) */}
        <div className="min-w-0 space-y-4 sm:space-y-6 relative z-0">
          {/* Productivity score */}
          <ProductivityScore
            score={productivityScore}
            productiveTime={stats.productive_duration}
            distractionTime={stats.distraction_duration}
            neutralTime={stats.neutral_duration}
            totalTime={stats.total_duration}
            title="Productivity Score"
          />

          {/* Activity timeline */}
          {rangeData?.entries && (
            <div className="overflow-hidden">
              <Timeline
                entries={rangeData.entries}
                title="Recent Activity"
                maxEntries={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Summary card component
interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function SummaryCard({ title, value, icon, color, subtitle }: SummaryCardProps) {
  return (
    <div className="p-3 sm:p-4 bg-card border border-border rounded-lg min-w-0">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
        <span className={`${color} flex-shrink-0`}>{icon}</span>
        <span className="text-xs sm:text-sm text-muted-foreground truncate">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 min-w-0">
        <span className="text-lg sm:text-2xl font-bold text-foreground truncate">{value}</span>
        {subtitle && (
          <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">{subtitle}</span>
        )}
      </div>
    </div>
  );
}