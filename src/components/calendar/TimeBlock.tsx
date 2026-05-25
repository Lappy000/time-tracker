import { cn } from '@/lib/utils';

interface TimeBlockProps {
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
  type: 'event' | 'track';
  onClick?: () => void;
  className?: string;
}

export function TimeBlock({
  title,
  startTime,
  endTime,
  color = '#6366f1',
  type,
  onClick,
  className,
}: TimeBlockProps) {
  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getDuration = (): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const isEvent = type === 'event';
  const bgOpacity = isEvent ? 0.2 : 0.1;
  const borderWidth = isEvent ? '3px' : '2px';

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 cursor-pointer transition-all hover:scale-[1.02]',
        'border-l-[3px]',
        onClick && 'hover:shadow-md',
        className
      )}
      style={{
        backgroundColor: `${color}${Math.round(bgOpacity * 255).toString(16).padStart(2, '0')}`,
        borderLeftColor: color,
        borderLeftWidth: borderWidth,
      }}
    >
      {/* Title */}
      <div
        className="text-sm font-medium truncate"
        style={{ color: isEvent ? color : undefined }}
      >
        {isEvent && '📅 '}{title}
      </div>

      {/* Time range */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
        <span>{formatTime(startTime)} - {formatTime(endTime)}</span>
        <span className="text-xs opacity-70">({getDuration()})</span>
      </div>
    </div>
  );
}

// Compact version for small spaces
interface CompactTimeBlockProps {
  title: string;
  duration: number; // in minutes
  color?: string;
  type: 'event' | 'track';
  onClick?: () => void;
}

export function CompactTimeBlock({
  title,
  duration,
  color = '#6366f1',
  type,
  onClick,
}: CompactTimeBlockProps) {
  const formatDuration = (minutes: number): string => {
    const roundedMinutes = Math.round(minutes);
    if (roundedMinutes < 60) return `${roundedMinutes}m`;
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const isEvent = type === 'event';

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded px-1.5 py-0.5 text-xs flex items-center gap-1 truncate',
        onClick && 'cursor-pointer hover:opacity-80'
      )}
      style={{
        backgroundColor: `${color}20`,
        color: isEvent ? color : undefined,
      }}
      title={`${title} (${formatDuration(duration)})`}
    >
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{title}</span>
      <span className="text-muted-foreground ml-auto flex-shrink-0">
        {formatDuration(duration)}
      </span>
    </div>
  );
}

// Time bar for visual hour representation
interface TimeBarProps {
  events: Array<{
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    color?: string;
    type: 'event' | 'track';
  }>;
  dayStart?: number; // Hour (0-23)
  dayEnd?: number; // Hour (0-23)
  onEventClick?: (event: TimeBarProps['events'][0]) => void;
}

export function TimeBar({
  events,
  dayStart = 8,
  dayEnd = 20,
  onEventClick,
}: TimeBarProps) {
  const totalHours = dayEnd - dayStart;
  const hourWidth = 100 / totalHours;

  const getEventPosition = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    
    const left = Math.max(0, (startHour - dayStart) / totalHours * 100);
    const right = Math.min(100, (endHour - dayStart) / totalHours * 100);
    const width = right - left;
    
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` };
  };

  return (
    <div className="relative h-8 bg-muted/30 rounded overflow-hidden">
      {/* Hour markers */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: totalHours + 1 }).map((_, i) => (
          <div
            key={i}
            className="border-l border-border/30 h-full"
            style={{ marginLeft: i === 0 ? 0 : `${hourWidth}%` }}
          />
        ))}
      </div>

      {/* Events */}
      {events.map((event) => {
        const pos = getEventPosition(event.start_time, event.end_time);
        return (
          <div
            key={`${event.type}-${event.id}`}
            className={cn(
              'absolute top-1 bottom-1 rounded text-xs flex items-center px-1 overflow-hidden',
              onEventClick && 'cursor-pointer hover:opacity-80'
            )}
            style={{
              left: pos.left,
              width: pos.width,
              backgroundColor: event.color || '#6366f1',
              opacity: event.type === 'event' ? 0.9 : 0.6,
            }}
            onClick={() => onEventClick?.(event)}
            title={event.title}
          >
            <span className="truncate text-white text-[10px]">{event.title}</span>
          </div>
        );
      })}

      {/* Hour labels */}
      <div className="absolute -bottom-4 left-0 right-0 flex text-[9px] text-muted-foreground">
        {Array.from({ length: Math.ceil(totalHours / 2) + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: `${(i * 2) * hourWidth}%`, transform: 'translateX(-50%)' }}
          >
            {dayStart + i * 2}:00
          </div>
        ))}
      </div>
    </div>
  );
}