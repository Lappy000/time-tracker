import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { format, parseISO } from 'date-fns';

interface TimeEntry {
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

interface TimelineProps {
  entries: TimeEntry[];
  title?: string;
  maxEntries?: number;
}

export function Timeline({ entries, title = "Activity Timeline", maxEntries = 20 }: TimelineProps) {
  // Group entries by app and aggregate short durations
  const processedEntries = useMemo(() => {
    const sorted = [...entries]
      .filter(e => !e.is_idle && e.duration > 0)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    
    return sorted.slice(0, maxEntries);
  }, [entries, maxEntries]);

  // Calculate the max duration for relative bar sizing
  const maxDuration = useMemo(() => {
    return Math.max(...processedEntries.map(e => e.duration), 60);
  }, [processedEntries]);

  if (processedEntries.length === 0) {
    return (
      <Card>
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>No activity recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg truncate">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden pr-2">
          {processedEntries.map((entry, index) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              maxDuration={maxDuration}
              isFirst={index === 0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TimelineEntryProps {
  entry: TimeEntry;
  maxDuration: number;
  isFirst: boolean;
}

function TimelineEntry({ entry, maxDuration, isFirst }: TimelineEntryProps) {
  const barWidth = Math.max((entry.duration / maxDuration) * 100, 5);
  const color = entry.category_color || '#6366f1';
  
  // Format time
  const startTime = parseISO(entry.start_time);
  const timeLabel = format(startTime, 'HH:mm');
  
  // Format duration
  const durationLabel = formatDuration(entry.duration);
  
  // Truncate window title
  const windowTitle = entry.window_title 
    ? truncateText(entry.window_title, 40)
    : 'Unknown';

  return (
    <div
      className={`flex items-start gap-3 py-2 overflow-hidden ${
        !isFirst ? 'border-t border-border' : ''
      }`}
    >
      {/* Time column */}
      <div className="w-12 flex-shrink-0 text-right">
        <span className="text-xs text-muted-foreground font-mono">
          {timeLabel}
        </span>
      </div>
      
      {/* Timeline dot */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {!isFirst && (
          <div
            className="absolute -top-2 w-0.5 h-2"
            style={{ backgroundColor: color, opacity: 0.3 }}
          />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="font-medium text-foreground truncate max-w-[120px]">
              {entry.app_name || 'Unknown App'}
            </span>
            {entry.category_name && (
              <span
                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 truncate max-w-[80px]"
                style={{
                  backgroundColor: `${color}20`,
                  color
                }}
              >
                {entry.category_name}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
            {durationLabel}
          </span>
        </div>
        
        {/* Window title */}
        <p className="text-xs text-muted-foreground truncate mb-1.5">
          {windowTitle}
        </p>
        
        {/* Duration bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${barWidth}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
    </div>
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}