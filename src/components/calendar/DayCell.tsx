import type { MonthDayData } from '@/hooks/useCalendar';

interface DayCellProps {
  day: MonthDayData;
  isToday: boolean;
  onClick: () => void;
  formatDuration: (seconds: number) => string;
  isLastInRow: boolean;
}

export function DayCell({
  day,
  isToday,
  onClick,
  formatDuration,
  isLastInRow,
}: DayCellProps) {
  return (
    <div
      className={`min-h-[80px] p-2 cursor-pointer transition-colors hover:bg-muted/50 ${
        !isLastInRow ? 'border-r border-border' : ''
      } ${!day.isCurrentMonth ? 'opacity-40' : ''} ${
        day.totalTrackedTime > 0 ? 'bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      {/* Day number */}
      <div
        className={`text-sm font-medium mb-1 ${
          isToday
            ? 'w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center'
            : ''
        }`}
      >
        {day.dayOfMonth}
      </div>

      {/* Event count */}
      {day.eventCount > 0 && (
        <div className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded mb-1 inline-block">
          {day.eventCount} event{day.eventCount !== 1 ? 's' : ''}
        </div>
      )}

      {/* Tracked time */}
      {day.totalTrackedTime > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatDuration(day.totalTrackedTime)}
        </div>
      )}
    </div>
  );
}