import { type GoalWithProgress } from '@/hooks/useGoals';
import { Progress } from '@/components/ui/progress';

interface GoalProgressProps {
  goal: GoalWithProgress;
  compact?: boolean;
}

export function GoalProgress({ goal, compact = false }: GoalProgressProps) {
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const percentage = goal.percentage ?? 0;
  const currentProgress = goal.current_progress ?? 0;

  const getStatusIcon = (): string => {
    if (goal.is_limit) {
      if (percentage >= 100) return '⚠️';
      if (percentage >= 80) return '⏰';
      return '✓';
    } else {
      if (percentage >= 100) return '🎉';
      if (percentage >= 50) return '📈';
      return '🎯';
    }
  };

  const getStatusText = (): string => {
    if (goal.is_limit) {
      if (percentage >= 100) return 'Exceeded!';
      if (percentage >= 80) return 'Warning';
      return 'Within limit';
    } else {
      if (percentage >= 100) return 'Complete!';
      if (percentage >= 50) return 'Making progress';
      return 'In progress';
    }
  };

  const getCategoryIndicator = () => {
    if (goal.category_color && goal.category_name) {
      return (
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: goal.category_color }}
          />
          {goal.category_name}
        </span>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-white truncate">{goal.name}</span>
          <span className={`text-xs ${goal.is_limit && percentage >= 80 ? 'text-orange-400' : 'text-zinc-400'}`}>
            {Math.round(percentage)}%
          </span>
        </div>
        <Progress
          value={Math.min(percentage, 100)}
          className="h-1.5 bg-zinc-800"
        />
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {goal.type === 'limit' ? '🚫' : goal.type === 'focus' ? '🎯' : '⏱️'}
            </span>
            <h3 className="font-medium text-white">{goal.name}</h3>
          </div>
          {getCategoryIndicator()}
        </div>
        <div className={`px-2 py-0.5 rounded text-xs font-medium ${
          goal.is_limit && percentage >= 100
            ? 'bg-red-500/20 text-red-400'
            : goal.is_limit && percentage >= 80
            ? 'bg-orange-500/20 text-orange-400'
            : percentage >= 100
            ? 'bg-green-500/20 text-green-400'
            : 'bg-zinc-700 text-zinc-400'
        }`}>
          {getStatusIcon()} {getStatusText()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="relative">
          <Progress
            value={Math.min(percentage, 100)}
            className="h-3 bg-zinc-700"
          />
          {/* Overflow indicator for limits */}
          {goal.is_limit && percentage > 100 && (
            <div
              className="absolute top-0 right-0 bottom-0 bg-red-500/30 rounded-r"
              style={{
                width: `${Math.min((percentage - 100), 50)}%`,
                left: '100%',
                marginLeft: '-4px'
              }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>
            {formatMinutes(currentProgress)} / {formatMinutes(goal.target_minutes)}
          </span>
          <span className="capitalize">{goal.period}</span>
        </div>
      </div>

      {/* Additional Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">
          {goal.is_limit
            ? `${formatMinutes(Math.max(0, goal.target_minutes - currentProgress))} remaining`
            : `${formatMinutes(Math.max(0, goal.target_minutes - currentProgress))} to go`
          }
        </span>
        <span className={`font-medium ${
          percentage >= 100
            ? goal.is_limit ? 'text-red-400' : 'text-green-400'
            : 'text-blue-400'
        }`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

// Component for showing multiple goals in a summary view
interface GoalsSummaryProps {
  goals: GoalWithProgress[];
  maxItems?: number;
}

export function GoalsSummary({ goals, maxItems = 3 }: GoalsSummaryProps) {
  const displayGoals = goals.slice(0, maxItems);
  const remaining = goals.length - maxItems;

  if (goals.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p className="text-4xl mb-2">🎯</p>
        <p>No active goals</p>
        <p className="text-sm">Create a goal to track your progress</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayGoals.map((goal) => (
        <GoalProgress key={goal.id} goal={goal} compact />
      ))}
      {remaining > 0 && (
        <p className="text-xs text-zinc-500 text-center">
          +{remaining} more goal{remaining > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// Component for warnings about goals approaching limits
interface GoalWarningsProps {
  warnings: GoalWithProgress[];
}

export function GoalWarnings({ warnings }: GoalWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
        <span>⚠️</span>
        <span>Goal Warnings</span>
      </div>
      {warnings.map((goal) => {
        const pct = goal.percentage ?? 0;
        return (
          <div key={goal.id} className="flex items-center justify-between text-sm">
            <span className="text-white">{goal.name}</span>
            <span className={`font-medium ${
              pct >= 100 ? 'text-red-400' : 'text-orange-400'
            }`}>
              {Math.round(pct)}%{pct >= 100 ? ' - Exceeded!' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}