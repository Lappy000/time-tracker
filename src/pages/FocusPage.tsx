import { useState, useEffect } from 'react';
import { Timer, Clock, TrendingUp, Coffee, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFocus } from '@/hooks/useFocus';
import { 
  PomodoroTimer, 
  FocusMode, 
  SessionHistory,
  BreakReminder 
} from '@/components/focus';
import { cn } from '@/lib/utils';

type ViewMode = 'timer' | 'history';

export function FocusPage() {
  const {
    activeSession,
    todaySessions,
    todayStats,
    history,
    timerState,
    loading,
    isActive,
    isPaused,
    hasActiveSession,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    addBreak,
    deleteSession,
    refresh,
    fetchHistory,
    formatDuration
  } = useFocus();

  const [viewMode, setViewMode] = useState<ViewMode>('timer');
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [showCompleteMessage, setShowCompleteMessage] = useState(false);

  // Show break reminder when session completes
  useEffect(() => {
    if (activeSession && timerState.progress >= 100 && activeSession.status === 'active') {
      setShowBreakReminder(true);
    }
  }, [timerState.progress, activeSession]);

  // Handle session completion
  const handleComplete = async () => {
    await completeSession();
    setShowBreakReminder(false);
    setShowCompleteMessage(true);
    setTimeout(() => setShowCompleteMessage(false), 3000);
  };

  // Handle take break
  const handleTakeBreak = async () => {
    await addBreak();
    setShowBreakReminder(false);
    // Could start a break timer here
  };

  // Refresh history when switching to that view
  useEffect(() => {
    if (viewMode === 'history') {
      fetchHistory(20);
    }
  }, [viewMode, fetchHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            Focus Mode
          </h1>
          <p className="text-muted-foreground">
            Stay focused with timed work sessions
          </p>
        </div>
        
        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'timer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timer')}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Timer
          </Button>
          <Button
            variant={viewMode === 'history' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('history')}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            History
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Break reminder */}
      {showBreakReminder && activeSession && (
        <BreakReminder
          breakDuration={activeSession.break_duration}
          onTakeBreak={handleTakeBreak}
          onSkip={handleComplete}
          onDismiss={() => setShowBreakReminder(false)}
        />
      )}

      {/* Complete message */}
      {showCompleteMessage && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <Timer className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-500">Session completed! 🎉</p>
              <p className="text-sm text-muted-foreground">Great work! Time for a break.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content based on view mode */}
      {viewMode === 'timer' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timer / Session setup */}
          <div className="space-y-6">
            {hasActiveSession ? (
              // Active session - show timer
              <PomodoroTimer
                timeRemaining={timerState.timeRemaining}
                totalTime={activeSession?.planned_duration || 0}
                isRunning={isActive}
                isPaused={isPaused}
                breaksTaken={activeSession?.breaks_taken || 0}
                onPause={pauseSession}
                onResume={resumeSession}
                onStop={cancelSession}
                onTakeBreak={() => addBreak()}
              />
            ) : (
              // No session - show setup
              <FocusMode
                onStart={startSession}
                isStarting={loading}
              />
            )}
          </div>

          {/* Stats and today's sessions */}
          <div className="space-y-6">
            {/* Today's stats card */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Today's Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{todayStats.total_sessions}</p>
                        <p className="text-xs text-muted-foreground">Sessions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">
                          {todayStats.completed_sessions}
                        </p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {formatDuration(todayStats.total_focus_time)}
                        </p>
                        <p className="text-xs text-muted-foreground">Focus Time</p>
                      </div>
                    </div>
                    
                    {todayStats.total_sessions > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Completion rate</span>
                          <span className="font-medium">{Math.round(todayStats.completion_rate)}%</span>
                        </div>
                        <Progress value={todayStats.completion_rate} className="h-2" />
                      </div>
                    )}

                    {todayStats.total_breaks > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Coffee className="h-4 w-4" />
                        <span>{todayStats.total_breaks} breaks taken</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">
                      No focus sessions today yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start a session to begin tracking
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's sessions list */}
            {todaySessions.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Today's Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {todaySessions.slice(0, 5).map((session) => {
                    const progress = session.planned_duration > 0
                      ? (session.actual_duration / session.planned_duration) * 100
                      : 0;
                    
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                      >
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          session.status === 'completed' ? 'bg-green-500' :
                          session.status === 'active' ? 'bg-blue-500' :
                          session.status === 'paused' ? 'bg-yellow-500' :
                          'bg-red-500'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {new Date(session.start_time).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            <span className="text-muted-foreground">
                              {formatDuration(session.actual_duration)}
                            </span>
                          </div>
                          <Progress value={Math.min(100, progress)} className="h-1 mt-1" />
                        </div>
                      </div>
                    );
                  })}
                  
                  {todaySessions.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setViewMode('history')}
                    >
                      View all {todaySessions.length} sessions
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tips card */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-2">💡 Focus Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use the Pomodoro technique: 25 min work, 5 min break</li>
                  <li>• Take longer breaks after 4 sessions</li>
                  <li>• Stay hydrated during your breaks</li>
                  <li>• Stretch and move to stay energized</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // History view
        <SessionHistory
          sessions={history}
          stats={todayStats}
          onDelete={deleteSession}
        />
      )}
    </div>
  );
}