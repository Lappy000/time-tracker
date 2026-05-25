import { useCallback, useMemo } from 'react';
import { Play, Pause, Square, RotateCcw, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
  timeRemaining: number; // seconds
  totalTime: number; // seconds
  isRunning: boolean;
  isPaused: boolean;
  breaksTaken: number;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onTakeBreak?: () => void;
  className?: string;
}

export function PomodoroTimer({
  timeRemaining,
  totalTime,
  isRunning,
  isPaused,
  breaksTaken,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  onTakeBreak,
  className
}: PomodoroTimerProps) {
  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (totalTime === 0) return 0;
    return ((totalTime - timeRemaining) / totalTime) * 100;
  }, [timeRemaining, totalTime]);

  // Calculate SVG circle properties
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Get timer status text
  const statusText = useMemo(() => {
    if (!isRunning && !isPaused) return 'Ready to focus';
    if (isPaused) return 'Paused';
    if (timeRemaining === 0) return 'Complete!';
    return 'Focusing...';
  }, [isRunning, isPaused, timeRemaining]);

  // Get color based on progress
  const timerColor = useMemo(() => {
    if (!isRunning && !isPaused) return 'stroke-muted-foreground/30';
    if (isPaused) return 'stroke-yellow-500';
    if (progress >= 100) return 'stroke-green-500';
    if (progress >= 75) return 'stroke-primary';
    return 'stroke-primary';
  }, [isRunning, isPaused, progress]);

  const hasSession = isRunning || isPaused;

  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardContent className="p-8 flex flex-col items-center">
        {/* Timer Circle */}
        <div className="relative w-72 h-72 mb-6">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="144"
              cy="144"
              r={radius}
              strokeWidth="8"
              fill="none"
              className="stroke-muted/30"
            />
            {/* Progress circle */}
            <circle
              cx="144"
              cy="144"
              r={radius}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={cn('transition-all duration-300', timerColor)}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: hasSession ? strokeDashoffset : circumference
              }}
            />
          </svg>
          
          {/* Timer display in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold tracking-wider">
              {formatTime(timeRemaining)}
            </span>
            <span className={cn(
              'text-sm mt-2',
              isPaused ? 'text-yellow-500' : 'text-muted-foreground'
            )}>
              {statusText}
            </span>
            {breaksTaken > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Coffee className="h-3 w-3" />
                <span>{breaksTaken} break{breaksTaken !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-3">
          {!hasSession ? (
            // Start button when no session
            <Button
              size="lg"
              onClick={onStart}
              className="gap-2 px-8"
            >
              <Play className="h-5 w-5" />
              Start Focus
            </Button>
          ) : (
            // Session control buttons
            <>
              {/* Play/Pause toggle */}
              {isRunning && !isPaused ? (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={onPause}
                  className="gap-2"
                >
                  <Pause className="h-5 w-5" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={onResume}
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  Resume
                </Button>
              )}

              {/* Take break button */}
              <Button
                size="lg"
                variant="outline"
                onClick={onTakeBreak}
                className="gap-2"
                title="Take a break"
              >
                <Coffee className="h-5 w-5" />
              </Button>

              {/* Stop button */}
              <Button
                size="lg"
                variant="destructive"
                onClick={onStop}
                className="gap-2"
                title="Stop session"
              >
                <Square className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Reset button - only show when not in session */}
          {!hasSession && timeRemaining > 0 && onReset && (
            <Button
              size="lg"
              variant="ghost"
              onClick={onReset}
              className="gap-2"
              title="Reset timer"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact timer for use in other places
export function CompactTimer({
  timeRemaining,
  totalTime,
  isRunning,
  isPaused,
  className
}: {
  timeRemaining: number;
  totalTime: number;
  isRunning: boolean;
  isPaused: boolean;
  className?: string;
}) {
  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Mini circular progress */}
      <div className="relative w-10 h-10">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r="16"
            strokeWidth="3"
            fill="none"
            className="stroke-muted/30"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            className={cn(
              'transition-all duration-300',
              isPaused ? 'stroke-yellow-500' : 'stroke-primary'
            )}
            style={{
              strokeDasharray: 2 * Math.PI * 16,
              strokeDashoffset: 2 * Math.PI * 16 - (progress / 100) * 2 * Math.PI * 16
            }}
          />
        </svg>
        {isRunning && !isPaused && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}
      </div>
      
      {/* Time display */}
      <div className="flex flex-col">
        <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
        <span className="text-xs text-muted-foreground">
          {isPaused ? 'Paused' : isRunning ? 'Focusing' : 'Ready'}
        </span>
      </div>
    </div>
  );
}