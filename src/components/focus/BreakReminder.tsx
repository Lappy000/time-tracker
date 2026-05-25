import { Coffee, Play, SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BreakReminderProps {
  breakDuration: number; // seconds
  onTakeBreak: () => void;
  onSkip: () => void;
  onDismiss: () => void;
  className?: string;
}

export function BreakReminder({
  breakDuration,
  onTakeBreak,
  onSkip,
  onDismiss,
  className
}: BreakReminderProps) {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  return (
    <Card className={cn(
      'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-primary/20',
      'animate-in fade-in slide-in-from-top-4 duration-300',
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-3 bg-primary/10 rounded-full flex-shrink-0">
            <Coffee className="h-6 w-6 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Time for a break! 🎉</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Great focus session! Take a {formatDuration(breakDuration)} break to recharge.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onTakeBreak} className="gap-2">
                <Coffee className="h-4 w-4" />
                Take Break
              </Button>
              <Button variant="secondary" onClick={onSkip} className="gap-2">
                <Play className="h-4 w-4" />
                Skip & Continue
              </Button>
              <Button variant="ghost" size="icon" onClick={onDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Toast-style break reminder (smaller)
export function BreakReminderToast({
  onTakeBreak,
  onDismiss,
  className
}: {
  onTakeBreak: () => void;
  onDismiss: () => void;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-lg',
      'animate-in fade-in slide-in-from-right-4 duration-300',
      className
    )}>
      <div className="p-2 bg-primary/10 rounded-full">
        <Coffee className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Break time!</p>
        <p className="text-xs text-muted-foreground">You've earned it</p>
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={onTakeBreak}>
          Take Break
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// In-progress break indicator
export function BreakInProgress({
  timeRemaining,
  breakNumber,
  onEndBreak,
  className
}: {
  timeRemaining: number;
  breakNumber: number;
  onEndBreak: () => void;
  className?: string;
}) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
            <Coffee className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg">Break #{breakNumber}</h3>
          <p className="text-muted-foreground text-sm">
            Relax and recharge
          </p>
        </div>

        <div className="text-4xl font-mono font-bold mb-6">
          {formatTime(timeRemaining)}
        </div>

        <div className="space-y-2">
          <Button variant="outline" onClick={onEndBreak} className="gap-2">
            <SkipForward className="h-4 w-4" />
            End Break Early
          </Button>
          
          <div className="text-xs text-muted-foreground">
            <p>Suggestions:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Stretch your body</li>
              <li>Get some water</li>
              <li>Look away from the screen</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Break stats display
export function BreakStats({
  totalBreaks,
  totalBreakTime,
  className
}: {
  totalBreaks: number;
  totalBreakTime: number;
  className?: string;
}) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Coffee className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">
        {totalBreaks} break{totalBreaks !== 1 ? 's' : ''}
        {totalBreakTime > 0 && ` · ${formatDuration(totalBreakTime)}`}
      </span>
    </div>
  );
}