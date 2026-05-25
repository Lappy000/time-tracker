import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ProductivityScoreProps {
  score: number; // 0-100
  productiveTime: number; // seconds
  distractionTime: number; // seconds
  neutralTime: number; // seconds
  totalTime: number; // seconds
  title?: string;
}

export function ProductivityScore({
  score,
  productiveTime,
  distractionTime,
  neutralTime,
  totalTime,
  title = "Productivity Score"
}: ProductivityScoreProps) {
  // Calculate percentages for the breakdown
  const percentages = useMemo(() => {
    if (totalTime === 0) {
      return { productive: 0, distraction: 0, neutral: 0 };
    }
    return {
      productive: Math.round((productiveTime / totalTime) * 100),
      distraction: Math.round((distractionTime / totalTime) * 100),
      neutral: Math.round((neutralTime / totalTime) * 100)
    };
  }, [productiveTime, distractionTime, neutralTime, totalTime]);

  // Determine score color and label
  const { color, label, bgColor } = useMemo(() => {
    if (score >= 80) {
      return { color: '#22c55e', label: 'Excellent', bgColor: 'bg-green-500/10' };
    } else if (score >= 60) {
      return { color: '#84cc16', label: 'Good', bgColor: 'bg-lime-500/10' };
    } else if (score >= 40) {
      return { color: '#eab308', label: 'Fair', bgColor: 'bg-yellow-500/10' };
    } else if (score >= 20) {
      return { color: '#f97316', label: 'Needs Work', bgColor: 'bg-orange-500/10' };
    } else {
      return { color: '#ef4444', label: 'Poor', bgColor: 'bg-red-500/10' };
    }
  }, [score]);

  // SVG circle parameters
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Circular Progress */}
          <div className="relative">
            <svg
              width={size}
              height={size}
              className="transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                className="stroke-muted"
                strokeWidth={strokeWidth}
              />
              {/* Progress circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span 
                className="text-4xl font-bold"
                style={{ color }}
              >
                {score}
              </span>
              <span className="text-sm text-muted-foreground">out of 100</span>
            </div>
          </div>

          {/* Label */}
          <div className={`mt-4 px-4 py-1.5 rounded-full ${bgColor}`}>
            <span className="text-sm font-medium" style={{ color }}>
              {label}
            </span>
          </div>

          {/* Time breakdown */}
          <div className="w-full mt-6 space-y-3">
            <TimeBreakdownRow
              label="Productive"
              time={productiveTime}
              percentage={percentages.productive}
              color="#22c55e"
            />
            <TimeBreakdownRow
              label="Neutral"
              time={neutralTime}
              percentage={percentages.neutral}
              color="#6366f1"
            />
            <TimeBreakdownRow
              label="Distracting"
              time={distractionTime}
              percentage={percentages.distraction}
              color="#ef4444"
            />
          </div>

          {/* Total time footer */}
          <div className="w-full mt-4 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Total tracked: <span className="font-medium text-foreground">{formatDuration(totalTime)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TimeBreakdownRowProps {
  label: string;
  time: number; // seconds
  percentage: number;
  color: string;
}

function TimeBreakdownRow({ label, time, percentage, color }: TimeBreakdownRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {formatDuration(time)} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color 
          }}
        />
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