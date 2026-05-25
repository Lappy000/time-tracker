import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { useIpc } from '../hooks';
import { formatDuration, cn } from '../lib/utils';
import { AppWindow, Monitor } from 'lucide-react';

interface TopApp {
  id: number;
  name: string;
  total_duration: number;
  category_name: string | null;
  category_color: string | null;
  category_productivity_score?: number;
}

export function TopApps() {
  const { invoke, channels } = useIpc();
  const [topApps, setTopApps] = useState<TopApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const fetchTopApps = async () => {
    // Fetch more apps to support "Show All" feature
    const result = await invoke<TopApp[]>(channels.ANALYTICS.GET_TOP_APPS, 15);
    if (result.success && result.data) {
      setTopApps(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTopApps();
    const interval = setInterval(fetchTopApps, 10000);
    return () => clearInterval(interval);
  }, []);

  // Display apps based on showAll state
  const displayedApps = showAll ? topApps : topApps.slice(0, 5);
  const maxDuration = topApps.length > 0 ? topApps[0].total_duration : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AppWindow className="w-5 h-5" />
            Top Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AppWindow className="w-5 h-5" />
          Top Applications Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Monitor className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No applications tracked yet</p>
            <p className="text-xs">Start tracking to see your usage</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedApps.map((item, index) => {
              // Defensive null check - skip items with missing data
              if (!item) {
                return null;
              }
              
              // Handle missing or empty names with fallback
              const appName = (item.name && item.name.trim()) ? item.name : 'Unknown Application';
              const progress = maxDuration > 0 ? (item.total_duration / maxDuration) * 100 : 0;
              const productivityScore = item.category_productivity_score ?? 0;
              
              return (
                <div key={item.id || index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-medium text-muted-foreground w-5 flex-shrink-0">
                        #{index + 1}
                      </span>
                      <span className="font-medium truncate min-w-0" title={appName}>
                        {appName}
                      </span>
                      {item.category_name && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: `${item.category_color}20`,
                            color: item.category_color || undefined
                          }}
                        >
                          {item.category_name}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                      {formatDuration(item.total_duration)}
                    </span>
                  </div>
                  <Progress
                    value={progress}
                    className={cn(
                      "h-2",
                      productivityScore > 0 && "[&>div]:bg-productive",
                      productivityScore < 0 && "[&>div]:bg-distraction",
                      productivityScore === 0 && "[&>div]:bg-neutral"
                    )}
                  />
                </div>
              );
            })}
            
            {/* Show All / Show Less button */}
            {topApps.length > 5 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 border-t border-border mt-2 transition-colors"
              >
                {showAll ? `Show Less` : `Show All (${topApps.length})`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}