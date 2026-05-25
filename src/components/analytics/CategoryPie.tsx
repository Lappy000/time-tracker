import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface CategoryUsage {
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

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  icon: string | null;
  appCount: number;
  isProductive: boolean;
  productivityScore: number;
}

interface CategoryPieProps {
  data: CategoryUsage[];
  title?: string;
}

export function CategoryPie({ data, title = "Time by Category" }: CategoryPieProps) {
  const [activeCategory, setActiveCategory] = useState<ChartDataItem | null>(null);

  // Transform and sort data
  const chartData = useMemo(() => {
    return data
      .filter(item => item.total_duration > 0)
      .sort((a, b) => b.total_duration - a.total_duration)
      .map(item => ({
        name: item.category.name,
        value: Math.round(item.total_duration / 60), // Convert to minutes
        color: item.category.color,
        icon: item.category.icon,
        appCount: item.app_count,
        isProductive: item.category.is_productive,
        productivityScore: item.category.productivity_score
      }));
  }, [data]);

  const totalMinutes = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] text-muted-foreground">
            <svg 
              className="w-12 h-12 mb-3 opacity-50" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
            <p>No activity data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate percentage for active category
  const activePercentage = activeCategory && totalMinutes > 0
    ? ((activeCategory.value / totalMinutes) * 100).toFixed(1)
    : null;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="flex flex-col items-center">
          {/* Chart Container with centered label */}
          <div className="relative w-[160px] h-[160px] sm:w-[200px] sm:h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="85%"
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveCategory(chartData[index])}
                  onMouseLeave={() => setActiveCategory(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      style={{
                        cursor: 'pointer',
                        opacity: activeCategory ? (activeCategory.name === entry.name ? 1 : 0.6) : 1,
                        transition: 'opacity 0.2s ease'
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label - shows total OR hovered category details */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {!activeCategory ? (
                // Default: show total time
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {formatDuration(totalMinutes)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              ) : (
                // On hover: show category details
                <div className="text-center px-1">
                  <p className="text-xs font-medium text-foreground truncate max-w-[100px]" title={activeCategory.name}>
                    {activeCategory.icon && `${activeCategory.icon} `}{activeCategory.name}
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {formatDuration(activeCategory.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{activePercentage}%</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Legend - below chart */}
          <div className="mt-3 sm:mt-4 w-full">
            <div className="flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2">
              {chartData.slice(0, 6).map((entry, index) => {
                const percentage = totalMinutes > 0
                  ? ((entry.value / totalMinutes) * 100).toFixed(0)
                  : 0;
                
                return (
                  <div key={index} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span
                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground truncate max-w-[60px] sm:max-w-[80px]" title={entry.name}>
                      {entry.icon && `${entry.icon} `}
                      {entry.name}
                    </span>
                    <span className="text-foreground font-medium">{percentage}%</span>
                  </div>
                );
              })}
            </div>
            {chartData.length > 6 && (
              <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
                +{chartData.length - 6} more
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}