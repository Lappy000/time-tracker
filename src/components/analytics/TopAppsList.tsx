import { useMemo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface TopApp {
  id: number;
  name: string;
  total_duration: number;
  category_name: string | null;
  category_color: string | null;
}

interface TopAppsListProps {
  apps: TopApp[];
  title?: string;
  limit?: number;
  expandable?: boolean;
}

// Tooltip component for better hover experience
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div 
      className="relative inline-flex min-w-0 max-w-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && text && (
        <div className="absolute z-50 bottom-full left-0 mb-1 px-2 py-1 text-xs bg-popover border border-border rounded shadow-lg whitespace-nowrap max-w-[300px] truncate">
          {text}
        </div>
      )}
    </div>
  );
}

export function TopAppsList({ apps, title = "Top Applications", limit = 10, expandable = true }: TopAppsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Sort and limit apps
  const sortedApps = useMemo(() => {
    const result = [...apps]
      .sort((a, b) => b.total_duration - a.total_duration)
      .slice(0, limit);
    
    // Debug logs for Top Apps Missing Names
    if (result.length > 0) {
      console.log('TopAppsList: Rendered apps', result);
      result.forEach((app, i) => {
         if (!app.name) console.error(`TopAppsList: App at index ${i} missing name:`, app);
      });
    }
    return result;
  }, [apps, limit]);

  // Calculate max duration for bar sizing
  const maxDuration = useMemo(() => {
    return sortedApps[0]?.total_duration || 1;
  }, [sortedApps]);

  // Calculate total time
  const totalTime = useMemo(() => {
    return sortedApps.reduce((sum, app) => sum + app.total_duration, 0);
  }, [sortedApps]);

  if (sortedApps.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
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
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <p>No applications tracked yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get display apps - either limited or all based on expansion state
  const displayApps = isExpanded ? sortedApps : sortedApps.slice(0, limit);

  const content = (isModalView: boolean) => {
    // Responsive grid classes that scale properly at all sizes
    // Base: 4 columns (small screens, no category)
    // sm+: 5 columns (with category)
    // lg+: flexible name column with minimum width that expands to fill available space
    // Columns: # | App Name | Time | Category | %
    const gridClasses = isModalView
      ? 'grid-cols-[24px_minmax(120px,1fr)_80px_120px_60px]'
      : 'grid-cols-[20px_minmax(60px,1fr)_50px_50px] sm:grid-cols-[24px_minmax(80px,1fr)_60px_80px_50px] lg:grid-cols-[28px_minmax(100px,1fr)_65px_100px_55px] xl:grid-cols-[30px_minmax(120px,1fr)_70px_110px_60px]';

    return (
      <>
        {/* Header row - responsive layout */}
        <div className={`grid gap-2 mb-2 text-xs text-muted-foreground font-medium min-w-0 ${gridClasses}`}>
          <span>#</span>
          <span className="min-w-0 truncate">Application</span>
          <span className="text-right">Time</span>
          <span className={`text-center ${isModalView ? '' : 'hidden sm:block'}`}>Category</span>
          <span className="text-right">%</span>
        </div>
        
        <div className="space-y-2">
          {displayApps.map((app, index) => {
            const barWidth = (app.total_duration / maxDuration) * 100;
            const percentage = totalTime > 0
              ? ((app.total_duration / totalTime) * 100).toFixed(1)
              : '0';
            const color = app.category_color || '#6366f1';
            // Ensure app name is displayed - use fallback if missing
            const appName = (app.name && app.name.trim()) ? app.name : 'Unknown Application';

            return (
              <div key={app.id} className="group min-w-0">
                {/* Grid row with responsive columns */}
                <div className={`grid gap-2 items-center mb-1 min-w-0 ${gridClasses}`}>
                  {/* Rank */}
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {index + 1}.
                  </span>
                  
                  {/* App name with tooltip - always truncate to prevent layout breaking */}
                  <Tooltip text={appName}>
                    <span
                      className={`font-medium text-foreground min-w-0 block truncate ${
                        isModalView
                          ? 'text-sm'
                          : 'text-xs sm:text-sm'
                      }`}
                      title={appName}
                    >
                      {appName}
                    </span>
                  </Tooltip>
                  
                  {/* Duration - fixed width, right aligned */}
                  <span className={`font-medium text-foreground text-right whitespace-nowrap flex-shrink-0 ${
                    isModalView ? 'text-sm' : 'text-xs sm:text-sm'
                  }`}>
                    {formatDuration(app.total_duration)}
                  </span>
                  
                  {/* Category badge - hidden on very small screens */}
                  <div className={`justify-center flex-shrink-0 overflow-hidden ${isModalView ? 'flex' : 'hidden sm:flex'}`}>
                    {app.category_name ? (
                      <Tooltip text={app.category_name}>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded truncate max-w-full"
                          style={{
                            backgroundColor: `${color}20`,
                            color
                          }}
                        >
                          {app.category_name}
                        </span>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  
                  {/* Percentage - fixed width, right aligned */}
                  <span className={`text-muted-foreground text-right flex-shrink-0 ${
                    isModalView ? 'text-xs' : 'text-[10px] sm:text-xs'
                  }`}>
                    {percentage}%
                  </span>
                </div>
                
                {/* Progress bar - spans full width under the row */}
                <div className={`h-1.5 bg-muted rounded-full overflow-hidden ${
                  isModalView ? 'ml-6' : 'ml-5 sm:ml-6 lg:ml-7 xl:ml-8'
                }`}>
                  <div
                    className="h-full rounded-full transition-all duration-300 group-hover:opacity-80"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Total footer */}
        <div className={`mt-4 pt-3 border-t border-border grid gap-2 items-center min-w-0 ${gridClasses}`}>
          <span></span>
          <span className="text-xs sm:text-sm text-muted-foreground min-w-0">
            Total ({sortedApps.length} apps)
          </span>
          <span className={`font-medium text-foreground text-right ${
            isModalView ? 'text-sm' : 'text-xs sm:text-sm'
          }`}>
            {formatDuration(totalTime)}
          </span>
          <span className={isModalView ? '' : 'hidden sm:block'}></span>
          <span className={`text-muted-foreground text-right ${
            isModalView ? 'text-xs' : 'text-[10px] sm:text-xs'
          }`}>100%</span>
        </div>
      </>
    );
  };

  // Expanded modal view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between flex-shrink-0">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto">
            {content(true)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg truncate">{title}</CardTitle>
        {expandable && sortedApps.length > limit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-8 w-8 p-0 flex-shrink-0"
            title="Expand to see all applications"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {content(false)}
      </CardContent>
    </Card>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}