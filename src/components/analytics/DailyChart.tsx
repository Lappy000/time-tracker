import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface HourlyData {
  hour: number;
  duration: number;
  productive_duration: number;
}

interface HourlyDataByCategory {
  hour: number;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  duration: number;
}

interface DailyData {
  date: string;
  duration: number;
  productive_duration: number;
}

interface DailyDataByCategory {
  date: string;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  duration: number;
}

interface CategoryInfo {
  id: number | null;
  name: string;
  color: string;
}

interface DailyChartProps {
  data: HourlyData[];
  categoryData?: HourlyDataByCategory[];
  dailyData?: DailyData[];
  dailyCategoryData?: DailyDataByCategory[];
  isMultiDay?: boolean;
  title?: string;
}

export function DailyChart({
  data,
  categoryData,
  dailyData,
  dailyCategoryData,
  isMultiDay = false,
  title = "Activity by Hour"
}: DailyChartProps) {
  // Track which categories are visible (all visible by default)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(new Set());

  // Determine which data source to use
  const useDaily = isMultiDay && dailyData && dailyData.length > 0;

  // Extract unique categories from category data
  const categories = useMemo((): CategoryInfo[] => {
    const catData = useDaily ? dailyCategoryData : categoryData;
    
    if (!catData || catData.length === 0) {
      // Fallback to productive/other if no category data
      return [
        { id: -1, name: 'Productive', color: '#22c55e' },
        { id: -2, name: 'Other', color: '#6366f1' }
      ];
    }

    const categoryMap = new Map<string, CategoryInfo>();
    catData.forEach(item => {
      const key = item.category_name || 'Uncategorized';
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: item.category_id,
          name: key,
          color: item.category_color || '#6b7280'
        });
      }
    });

    return Array.from(categoryMap.values());
  }, [categoryData, dailyCategoryData, useDaily]);

  // Transform data for chart - supports both hourly and daily modes
  const chartData = useMemo(() => {
    const fullData = [];
    
    if (useDaily && dailyData) {
      // Daily mode for multi-day ranges
      // Get all unique dates from daily data
      const dates = [...new Set(dailyData.map(d => d.date))].sort();
      
      for (const date of dates) {
        const dateData: Record<string, unknown> = {
          date,
          label: formatDate(date)
        };

        if (dailyCategoryData && dailyCategoryData.length > 0) {
          // Use category-specific data
          let totalMinutes = 0;
          categories.forEach(cat => {
            const categoryDateData = dailyCategoryData.find(
              d => d.date === date && (d.category_name || 'Uncategorized') === cat.name
            );
            const minutes = categoryDateData ? Math.round(categoryDateData.duration / 60) : 0;
            dateData[cat.name] = minutes;
            totalMinutes += minutes;
          });
          dateData.total = totalMinutes;
        } else {
          // Fall back to productive/other
          const existing = dailyData.find(d => d.date === date);
          const totalMinutes = existing ? Math.round(existing.duration / 60) : 0;
          const productiveMinutes = existing ? Math.round(existing.productive_duration / 60) : 0;
          const otherMinutes = totalMinutes - productiveMinutes;
          
          dateData.Productive = productiveMinutes;
          dateData.Other = otherMinutes;
          dateData.total = totalMinutes;
        }
        
        fullData.push(dateData);
      }
    } else {
      // Hourly mode for single-day views
      for (let hour = 0; hour < 24; hour++) {
        const hourData: Record<string, unknown> = {
          hour,
          label: formatHour(hour)
        };

        if (categoryData && categoryData.length > 0) {
          // Use category-specific data
          let totalMinutes = 0;
          categories.forEach(cat => {
            const categoryHourData = categoryData.find(
              d => d.hour === hour && (d.category_name || 'Uncategorized') === cat.name
            );
            const minutes = categoryHourData ? Math.round(categoryHourData.duration / 60) : 0;
            hourData[cat.name] = minutes;
            totalMinutes += minutes;
          });
          hourData.total = totalMinutes;
        } else {
          // Fall back to productive/other
          const existing = data.find(d => d.hour === hour);
          const totalMinutes = existing ? Math.round(existing.duration / 60) : 0;
          const productiveMinutes = existing ? Math.round(existing.productive_duration / 60) : 0;
          const otherMinutes = totalMinutes - productiveMinutes;
          
          hourData.Productive = productiveMinutes;
          hourData.Other = otherMinutes;
          hourData.total = totalMinutes;
        }
        
        fullData.push(hourData);
      }
    }
    
    return fullData;
  }, [data, categoryData, dailyData, dailyCategoryData, categories, useDaily]);

  // Handle legend click to toggle category visibility
  const handleLegendClick = useCallback((dataKey: string) => {
    setHiddenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  }, []);

  // Custom legend with clickable items
  const renderLegend = useCallback((props: unknown) => {
    const legendProps = props as { payload?: Array<{ value: string; color?: string }> };
    const { payload } = legendProps;
    if (!payload) return null;

    return (
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {payload.map((entry, index) => {
          const isHidden = hiddenCategories.has(entry.value);
          const color = entry.color || '#6b7280';
          return (
            <button
              key={`legend-${index}`}
              onClick={() => handleLegendClick(entry.value)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all hover:bg-muted ${
                isHidden ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className={isHidden ? 'line-through' : ''}>{entry.value}</span>
            </button>
          );
        })}
      </div>
    );
  }, [hiddenCategories, handleLegendClick]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload || payload.length === 0) return null;
    
    // Filter out hidden categories and zero values
    const visiblePayload = payload.filter(
      p => !hiddenCategories.has(p.name) && p.value > 0
    );
    
    if (visiblePayload.length === 0) return null;
    
    const total = visiblePayload.reduce((sum, p) => sum + (p.value || 0), 0);
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {visiblePayload.map((p, i) => (
          <p key={i} className="text-sm truncate" style={{ color: p.color }}>
            {p.name}: {p.value}m
          </p>
        ))}
        <p className="text-sm text-muted-foreground mt-1 pt-1 border-t border-border">
          Total: {total}m
        </p>
      </div>
    );
  };

  // Calculate summary stats (respecting hidden categories)
  const summaryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    let total = 0;

    categories.forEach(cat => {
      if (!hiddenCategories.has(cat.name)) {
        const catTotal = chartData.reduce((sum, d) => sum + ((d[cat.name] as number) || 0), 0);
        stats[cat.name] = catTotal;
        total += catTotal;
      }
    });

    return { categoryStats: stats, total };
  }, [chartData, categories, hiddenCategories]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="stroke-border"
                vertical={false}
              />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={{ className: 'stroke-border' }}
                interval={2}
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={{ className: 'stroke-border' }}
                tickFormatter={(value) => `${value}m`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                content={renderLegend}
                wrapperStyle={{ fontSize: '12px' }}
              />
              {categories.map((cat, index) => (
                <Bar 
                  key={cat.name}
                  dataKey={cat.name}
                  name={cat.name}
                  stackId="a"
                  fill={cat.color}
                  hide={hiddenCategories.has(cat.name)}
                  radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats below chart */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center px-3">
            <p className="text-2xl font-bold text-foreground">
              {summaryStats.total}m
            </p>
            <p className="text-xs text-muted-foreground">Total Time</p>
          </div>
          {categories.slice(0, 4).map(cat => {
            const isHidden = hiddenCategories.has(cat.name);
            const value = summaryStats.categoryStats[cat.name] || 0;
            return (
              <div 
                key={cat.name} 
                className={`text-center px-3 ${isHidden ? 'opacity-40' : ''}`}
              >
                <p className="text-2xl font-bold" style={{ color: cat.color }}>
                  {value}m
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[80px]" title={cat.name}>
                  {cat.name}
                </p>
              </div>
            );
          })}
          {categories.length > 4 && (
            <div className="text-center px-3">
              <p className="text-2xl font-bold text-muted-foreground">
                +{categories.length - 4}
              </p>
              <p className="text-xs text-muted-foreground">more</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${month} ${day}`;
}