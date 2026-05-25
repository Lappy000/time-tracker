import { useMemo } from 'react';
import { Clock, CheckCircle, XCircle, PauseCircle, Coffee, Calendar, TrendingUp, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { FocusSessionWithGoal, FocusStats } from '@/hooks/useFocus';

interface SessionHistoryProps {
  sessions: FocusSessionWithGoal[];
  stats?: FocusStats | null;
  onDelete?: (id: number) => void;
  className?: string;
}

export function SessionHistory({ sessions, stats, onDelete, className }: SessionHistoryProps) {
  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  // Format time (HH:MM)
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Completed' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-500', label: 'Cancelled' };
      case 'paused':
        return { icon: PauseCircle, color: 'text-yellow-500', label: 'Paused' };
      case 'interrupted':
        return { icon: XCircle, color: 'text-orange-500', label: 'Interrupted' };
      default:
        return { icon: Clock, color: 'text-blue-500', label: 'Active' };
    }
  };

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: Record<string, FocusSessionWithGoal[]> = {};
    
    sessions.forEach(session => {
      const dateKey = new Date(session.start_time).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(session);
    });

    return Object.entries(groups).map(([date, sessions]) => ({
      date,
      dateLabel: formatDate(sessions[0].start_time),
      sessions
    }));
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <Card className={cn('bg-card border-border', className)}>
        <CardContent className="py-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No focus sessions yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Start a focus session to see your history here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats summary */}
      {stats && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Focus Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total_sessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{stats.completed_sessions}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatDuration(stats.total_focus_time)}</p>
                <p className="text-xs text-muted-foreground">Total Time</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{Math.round(stats.completion_rate)}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
            {stats.total_sessions > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Completion rate</span>
                  <span>{Math.round(stats.completion_rate)}%</span>
                </div>
                <Progress value={stats.completion_rate} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Session groups */}
      {groupedSessions.map((group) => (
        <Card key={group.date} className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {group.dateLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.sessions.map((session) => {
              const statusInfo = getStatusInfo(session.status);
              const StatusIcon = statusInfo.icon;
              const progress = session.planned_duration > 0
                ? (session.actual_duration / session.planned_duration) * 100
                : 0;

              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  {/* Status icon */}
                  <StatusIcon className={cn('h-5 w-5 flex-shrink-0', statusInfo.color)} />

                  {/* Session info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatTime(session.start_time)}</span>
                      {session.goal_name && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full truncate">
                          {session.goal_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>
                        {formatDuration(session.actual_duration)} / {formatDuration(session.planned_duration)}
                      </span>
                      {session.breaks_taken > 0 && (
                        <span className="flex items-center gap-1">
                          <Coffee className="h-3 w-3" />
                          {session.breaks_taken}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <Progress 
                        value={Math.min(100, progress)} 
                        className="h-1" 
                      />
                    </div>
                  </div>

                  {/* Delete button */}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDelete(session.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Compact session list for sidebar or widget
export function CompactSessionList({
  sessions,
  limit = 5,
  className
}: {
  sessions: FocusSessionWithGoal[];
  limit?: number;
  className?: string;
}) {
  const recentSessions = sessions.slice(0, limit);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  if (recentSessions.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        No recent sessions
      </p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {recentSessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center gap-2 text-sm"
        >
          <div className={cn('w-2 h-2 rounded-full', getStatusColor(session.status))} />
          <span className="flex-1 truncate">
            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-muted-foreground">{formatDuration(session.actual_duration)}</span>
        </div>
      ))}
    </div>
  );
}