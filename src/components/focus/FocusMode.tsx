import { useState } from 'react';
import { Clock, Target, Zap, Timer, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CreateFocusSessionInput, FocusSessionWithGoal } from '@/hooks/useFocus';

interface FocusModeProps {
  onStart: (input: CreateFocusSessionInput) => Promise<FocusSessionWithGoal | null>;
  isStarting?: boolean;
  className?: string;
}

// Duration preset type
interface DurationPreset {
  id: string;
  label: string;
  duration: number; // seconds
  breakDuration: number; // seconds
  icon: typeof Clock;
  description: string;
}

// Preset durations
const durationPresets: DurationPreset[] = [
  {
    id: 'short',
    label: '15 min',
    duration: 15 * 60,
    breakDuration: 3 * 60,
    icon: Zap,
    description: 'Quick focus sprint'
  },
  {
    id: 'pomodoro',
    label: '25 min',
    duration: 25 * 60,
    breakDuration: 5 * 60,
    icon: Timer,
    description: 'Classic Pomodoro'
  },
  {
    id: 'long',
    label: '50 min',
    duration: 50 * 60,
    breakDuration: 10 * 60,
    icon: Target,
    description: 'Deep work session'
  },
  {
    id: 'hour',
    label: '60 min',
    duration: 60 * 60,
    breakDuration: 15 * 60,
    icon: Clock,
    description: 'Full hour focus'
  }
];

export function FocusMode({ onStart, isStarting, className }: FocusModeProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('pomodoro');
  const [customDuration, setCustomDuration] = useState<number>(25);
  const [customBreak, setCustomBreak] = useState<number>(5);
  const [showCustom, setShowCustom] = useState(false);

  const handleStart = async () => {
    let duration: number;
    let breakDuration: number;

    if (showCustom) {
      duration = customDuration * 60;
      breakDuration = customBreak * 60;
    } else {
      const preset = durationPresets.find(p => p.id === selectedPreset);
      if (!preset) return;
      duration = preset.duration;
      breakDuration = preset.breakDuration;
    }

    await onStart({
      planned_duration: duration,
      break_duration: breakDuration
    });
  };

  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Start Focus Session
        </CardTitle>
        <CardDescription>
          Choose your focus duration and eliminate distractions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Duration presets */}
        <div className="grid grid-cols-2 gap-3">
          {durationPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = !showCustom && selectedPreset === preset.id;
            
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset.id);
                  setShowCustom(false);
                }}
                className={cn(
                  'flex flex-col items-center p-4 rounded-lg border-2 transition-all',
                  'hover:border-primary/50 hover:bg-primary/5',
                  isSelected 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-background'
                )}
              >
                <Icon className={cn(
                  'h-6 w-6 mb-2',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'font-semibold',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  {preset.label}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  {preset.description}
                </span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Coffee className="h-3 w-3" />
                  <span>{preset.breakDuration / 60}m break</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom duration toggle */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            {showCustom ? 'Use preset durations' : 'Set custom duration'}
          </button>
        </div>

        {/* Custom duration inputs */}
        {showCustom && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Focus duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Math.max(1, Math.min(180, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-center font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Break duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={customBreak}
                  onChange={(e) => setCustomBreak(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-center font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Start button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handleStart}
          disabled={isStarting}
        >
          <Target className="h-5 w-5" />
          {isStarting ? 'Starting...' : 'Start Focus Session'}
        </Button>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Tips for effective focus:</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li>Close unnecessary tabs and apps</li>
            <li>Put your phone on silent</li>
            <li>Take breaks when the timer suggests</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick start buttons for dashboard or compact views
export function QuickFocusStart({
  onStart,
  className
}: {
  onStart: (input: CreateFocusSessionInput) => Promise<FocusSessionWithGoal | null>;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {durationPresets.map((preset) => (
        <Button
          key={preset.id}
          variant="outline"
          size="sm"
          onClick={() => onStart({
            planned_duration: preset.duration,
            break_duration: preset.breakDuration
          })}
          className="gap-1"
        >
          <preset.icon className="h-3 w-3" />
          {preset.label}
        </Button>
      ))}
    </div>
  );
}