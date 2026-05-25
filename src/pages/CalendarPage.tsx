import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, List } from 'lucide-react';
import { CalendarView, EventForm, CompactTimeBlock } from '@/components/calendar';
import { useCalendar, type CalendarEvent, type CreateCalendarEventInput, type EventAppUsage } from '@/hooks/useCalendar';
import { useProjects, type Project } from '@/hooks/useProjects';

export function CalendarPage() {
  const {
    events,
    weekView,
    monthView,
    viewMode,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventAppUsage,
    goToPrevious,
    goToNext,
    goToToday,
    switchViewMode,
    getWeekRangeString,
    getMonthString,
    formatTime,
    formatDuration,
    isToday,
  } = useCalendar();

  const { projects, fetchProjects } = useProjects();

  // Modal states
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEventUsage, setSelectedEventUsage] = useState<EventAppUsage[]>([]);
  const [showEventDetails, setShowEventDetails] = useState(false);

  // Load projects
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Event handlers
  const handleCreateEvent = async (data: CreateCalendarEventInput) => {
    await createEvent(data);
    setShowEventForm(false);
    setSelectedDate(null);
  };

  const handleUpdateEvent = async (data: CreateCalendarEventInput) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, data);
      setSelectedEvent(null);
      setShowEventForm(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    await deleteEvent(id);
    setSelectedEvent(null);
    setShowEventForm(false);
    setShowEventDetails(false);
  };

  const handleEventClick = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    const usage = await getEventAppUsage(event.id);
    setSelectedEventUsage(usage);
    setShowEventDetails(true);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedEvent(null);
    setShowEventForm(true);
  };

  // Get project details
  const getProjectById = (id: number | null | undefined): Project | undefined => {
    if (!id) return undefined;
    return projects.find(p => p.id === id);
  };

  // Format duration in minutes
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Calendar
          </h1>
          <p className="text-muted-foreground">
            Track time and schedule events
          </p>
        </div>
        <Button onClick={() => { setSelectedEvent(null); setSelectedDate(null); setShowEventForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      <CalendarView
        viewMode={viewMode}
        weekView={weekView}
        monthView={monthView}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onToday={goToToday}
        onSwitchView={switchViewMode}
        onDayClick={handleDayClick}
        onEventClick={handleEventClick}
        weekRangeString={getWeekRangeString()}
        monthString={getMonthString()}
        isToday={isToday}
        formatTime={formatTime}
        formatDuration={formatDuration}
      />

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <EventForm
            event={selectedEvent}
            projects={projects.filter(p => p.is_active)}
            defaultDate={selectedDate || undefined}
            onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
            onDelete={selectedEvent ? handleDeleteEvent : undefined}
            onCancel={() => {
              setShowEventForm(false);
              setSelectedEvent(null);
              setSelectedDate(null);
            }}
          />
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {selectedEvent.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedEvent.start_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowEventDetails(false);
                  setShowEventForm(true);
                }}
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Time */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(selectedEvent.start_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {new Date(selectedEvent.end_time).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Project */}
              {selectedEvent.project_id && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getProjectById(selectedEvent.project_id)?.color }}
                  />
                  <span className="text-sm">
                    {getProjectById(selectedEvent.project_id)?.name || 'Unknown Project'}
                  </span>
                </div>
              )}

              {/* Notes */}
              {selectedEvent.notes && (
                <div className="p-3 bg-muted rounded-md text-sm">
                  {selectedEvent.notes}
                </div>
              )}

              {/* App Usage during Event */}
              {selectedEventUsage.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <List className="h-4 w-4" />
                    During this event, you used:
                  </h4>
                  <div className="space-y-1">
                    {selectedEventUsage.map((usage, idx) => (
                      <CompactTimeBlock
                        key={idx}
                        title={usage.name}
                        duration={usage.duration / 60}
                        color="#6366f1"
                        type="track"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatMinutes(
                      selectedEventUsage.reduce((sum, u) => sum + u.duration / 60, 0)
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEventDetails(false);
                    setSelectedEvent(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-sm text-muted-foreground">
                  Events this {viewMode}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatMinutes(
                    events.reduce((sum, e) => {
                      const start = new Date(e.start_time);
                      const end = new Date(e.end_time);
                      return sum + (end.getTime() - start.getTime()) / (1000 * 60);
                    }, 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Scheduled time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <List className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {events.filter(e => e.project_id).length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Linked to projects
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}