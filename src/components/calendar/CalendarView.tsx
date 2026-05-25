import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayCell } from './DayCell';
import type { WeekViewData, MonthViewData, ViewMode, CalendarEventWithProject } from '@/hooks/useCalendar';

interface CalendarViewProps {
  viewMode: ViewMode;
  weekView: WeekViewData | null;
  monthView: MonthViewData | null;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onSwitchView: (mode: ViewMode) => void;
  onDayClick: (date: string) => void;
  onEventClick: (event: CalendarEventWithProject) => void;
  weekRangeString: string;
  monthString: string;
  isToday: (date: string) => boolean;
  formatTime: (date: string) => string;
  formatDuration: (seconds: number) => string;
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

export function CalendarView({
  viewMode,
  weekView,
  monthView,
  onPrevious,
  onNext,
  onToday,
  onSwitchView,
  onDayClick,
  onEventClick,
  weekRangeString,
  monthString,
  isToday,
  formatTime,
  formatDuration,
}: CalendarViewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday}>
            Today
          </Button>
          <h2 className="text-lg font-semibold ml-4">
            {viewMode === 'week' ? weekRangeString : monthString}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-md overflow-hidden">
            <button
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => onSwitchView('week')}
            >
              Week
            </button>
            <button
              className={`px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
              onClick={() => onSwitchView('month')}
            >
              Month
            </button>
          </div>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && weekView && (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-8 border-b border-border bg-muted/50">
            <div className="p-2 text-xs text-muted-foreground text-center border-r border-border">
              Time
            </div>
            {weekView.days.map((day, index) => (
              <div
                key={day.date}
                className={`p-2 text-center ${
                  index < 6 ? 'border-r border-border' : ''
                }`}
              >
                <div className="text-xs text-muted-foreground">
                  {WEEKDAY_NAMES[index]}
                </div>
                <div
                  className={`text-sm font-medium ${
                    isToday(day.date)
                      ? 'w-7 h-7 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center'
                      : ''
                  }`}
                >
                  {new Date(day.date).getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="max-h-[500px] overflow-y-auto">
            {HOUR_LABELS.map((hour, hourIndex) => (
              <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
                <div className="p-1 text-xs text-muted-foreground text-center border-r border-border">
                  {hour}
                </div>
                {weekView.days.map((day, dayIndex) => {
                  const dayEvents = day.events.filter((e) => {
                    const eventHour = new Date(e.start_time).getHours();
                    return eventHour === hourIndex;
                  });
                  const dayTimeEntry = day.timeEntries.find((t) => t.hour === hourIndex);

                  return (
                    <div
                      key={`${day.date}-${hourIndex}`}
                      className={`relative min-h-[40px] p-0.5 ${
                        dayIndex < 6 ? 'border-r border-border' : ''
                      } ${
                        dayTimeEntry && dayTimeEntry.duration > 0
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => onDayClick(day.date)}
                    >
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded mb-0.5 cursor-pointer truncate"
                          style={{
                            backgroundColor: event.project_color || '#6366f1',
                            color: 'white',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayTimeEntry && dayTimeEntry.duration > 0 && (
                        <div className="absolute bottom-0 right-0 text-[10px] text-muted-foreground px-1">
                          {formatDuration(dayTimeEntry.duration)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && monthView && (
        <div className="border border-border rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {WEEKDAY_NAMES.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {monthView.weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="grid grid-cols-7 border-b border-border last:border-b-0"
              >
                {week.map((day, dayIndex) => (
                  <DayCell
                    key={day.date}
                    day={day}
                    isToday={isToday(day.date)}
                    onClick={() => onDayClick(day.date)}
                    formatDuration={formatDuration}
                    isLastInRow={dayIndex === 6}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20" />
          <span>Tracked time</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Calendar event</span>
        </div>
      </div>
    </div>
  );
}