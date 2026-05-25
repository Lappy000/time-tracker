import { Clock, Target, TrendingUp, Coffee, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { useTracking, useSettings } from '../hooks';
import { formatDuration } from '../lib/utils';
import { useState } from 'react';

export function TodayStats() {
  const { todayStats } = useTracking();
  const { settings } = useSettings();

  const totalSeconds = todayStats?.total_duration || 0;
  const productiveSeconds = todayStats?.productive_duration || 0;
  const distractionSeconds = todayStats?.distraction_duration || 0;

  const goalSeconds = settings.daily_goal_hours * 3600;
  const goalProgress = goalSeconds > 0 ? Math.min((productiveSeconds / goalSeconds) * 100, 100) : 0;

  const productivityScore = totalSeconds > 0 
    ? Math.round((productiveSeconds / totalSeconds) * 100) 
    : 0;

  const stats = [
    {
      title: 'Total Time',
      value: formatDuration(totalSeconds),
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Productive',
      value: formatDuration(productiveSeconds),
      icon: TrendingUp,
      color: 'text-productive',
      bgColor: 'bg-productive/10'
    },
    {
      title: 'Distractions',
      value: formatDuration(distractionSeconds),
      icon: Coffee,
      color: 'text-distraction',
      bgColor: 'bg-distraction/10'
    },
    {
      title: 'Productivity',
      value: `${productivityScore}%`,
      icon: Target,
      color: productivityScore >= 70 ? 'text-productive' : productivityScore >= 40 ? 'text-warning' : 'text-distraction',
      bgColor: productivityScore >= 70 ? 'bg-productive/10' : productivityScore >= 40 ? 'bg-warning/10' : 'bg-distraction/10'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-lg font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Goal Progress */}
      <DailyGoalCard
        productiveSeconds={productiveSeconds}
        goalSeconds={goalSeconds}
        goalHours={settings.daily_goal_hours}
        goalProgress={goalProgress}
      />
    </div>
  );
}

// Separate component for daily goal with tooltip
interface DailyGoalCardProps {
  productiveSeconds: number;
  goalSeconds: number;
  goalHours: number;
  goalProgress: number;
}

function DailyGoalCard({ productiveSeconds, goalSeconds, goalHours, goalProgress }: DailyGoalCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Daily Goal Progress</span>
            <div className="relative">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="What is this?"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg text-xs">
                  <p className="font-medium text-foreground mb-1">Daily Productivity Goal</p>
                  <p className="text-muted-foreground">
                    This tracks your <span className="text-productive font-medium">productive time</span> (time spent in apps categorized as productive) against your daily goal of <span className="font-medium text-foreground">{goalHours} hours</span>.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    You can change your daily goal in <span className="font-medium">Settings → Productivity</span>.
                  </p>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="mt-2 text-primary hover:underline"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
          </div>
          <span className="text-muted-foreground">
            {formatDuration(productiveSeconds)} / {goalHours}h
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <Progress value={goalProgress} className="h-3" />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            {goalProgress >= 100
              ? '🎉 Goal achieved!'
              : `${Math.round(goalProgress)}% complete — ${formatDuration(Math.max(0, goalSeconds - productiveSeconds))} remaining`}
          </p>
          <p className="text-xs text-muted-foreground">
            Goal: {goalHours}h productive time
          </p>
        </div>
      </CardContent>
    </Card>
  );
}