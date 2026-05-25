import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoalProgress } from './GoalProgress';
import { type GoalWithProgress } from '@/hooks/useGoals';

interface GoalsListProps {
  goals: GoalWithProgress[];
  onEdit: (goal: GoalWithProgress) => void;
  onDelete: (goal: GoalWithProgress) => void;
  onToggleActive: (goal: GoalWithProgress) => void;
}

type FilterType = 'all' | 'active' | 'time' | 'limit' | 'focus';
type SortType = 'name' | 'progress' | 'created';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'time', label: '⏱️ Time' },
  { value: 'limit', label: '🚫 Limit' },
  { value: 'focus', label: '🎯 Focus' },
];

export function GoalsList({ goals, onEdit, onDelete, onToggleActive }: GoalsListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('progress');
  const [showInactive, setShowInactive] = useState(false);

  const filteredGoals = goals.filter((goal) => {
    if (!showInactive && !goal.is_active) return false;
    
    switch (filter) {
      case 'active':
        return goal.is_active;
      case 'time':
        return goal.type === 'time';
      case 'limit':
        return goal.type === 'limit';
      case 'focus':
        return goal.type === 'focus';
      default:
        return true;
    }
  });

  const sortedGoals = [...filteredGoals].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'progress':
        return (b.percentage ?? 0) - (a.percentage ?? 0);
      case 'created':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getGoalTypeEmoji = (type: string) => {
    switch (type) {
      case 'limit':
        return '🚫';
      case 'focus':
        return '🎯';
      default:
        return '⏱️';
    }
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (goals.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <span className="text-6xl mb-4">🎯</span>
          <h3 className="text-xl font-semibold text-white mb-2">No Goals Yet</h3>
          <p className="text-zinc-400 text-center max-w-sm">
            Create your first goal to start tracking your productivity and time management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700"
            />
            Show inactive
          </label>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="bg-zinc-800 border-zinc-700 text-zinc-400 text-sm rounded px-2 py-1"
          >
            <option value="progress">Sort by Progress</option>
            <option value="name">Sort by Name</option>
            <option value="created">Sort by Created</option>
          </select>
        </div>
      </div>

      {/* Goals Grid */}
      {sortedGoals.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No goals match the current filter
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedGoals.map((goal) => (
            <Card 
              key={goal.id} 
              className={`bg-zinc-900 border-zinc-800 ${!goal.is_active ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getGoalTypeEmoji(goal.type)}</span>
                    <CardTitle className="text-base font-medium text-white">
                      {goal.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        goal.is_active 
                          ? 'border-green-500/50 text-green-400' 
                          : 'border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {goal.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="text-xs border-zinc-700 text-zinc-400 capitalize"
                    >
                      {goal.period}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Category Info */}
                {goal.category_name && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: goal.category_color || '#666' }}
                    />
                    {goal.category_name}
                  </div>
                )}

                {/* Progress */}
                <GoalProgress goal={goal} />

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-zinc-500">Current</div>
                    <div className="text-white font-medium">
                      {formatMinutes(goal.current_progress)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Target</div>
                    <div className="text-white font-medium">
                      {formatMinutes(goal.target_minutes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">
                      {goal.is_limit ? 'Remaining' : 'To Go'}
                    </div>
                    <div className={`font-medium ${
                      (goal.percentage ?? 0) >= 100
                        ? goal.is_limit ? 'text-red-400' : 'text-green-400'
                        : 'text-white'
                    }`}>
                      {(goal.percentage ?? 0) >= 100
                        ? goal.is_limit ? 'Exceeded' : 'Done!'
                        : formatMinutes(Math.max(0, goal.target_minutes - (goal.current_progress ?? 0)))
                      }
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleActive(goal)}
                    className="text-zinc-400 hover:text-white text-xs"
                  >
                    {goal.is_active ? '⏸️ Pause' : '▶️ Resume'}
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(goal)}
                      className="text-zinc-400 hover:text-white text-xs"
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(goal)}
                      className="text-zinc-400 hover:text-red-400 text-xs"
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{goals.length}</div>
              <div className="text-xs text-zinc-500">Total Goals</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {goals.filter(g => g.is_active).length}
              </div>
              <div className="text-xs text-zinc-500">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {goals.filter(g => (g.percentage ?? 0) >= 100 && !g.is_limit).length}
              </div>
              <div className="text-xs text-zinc-500">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {goals.filter(g => g.is_limit && (g.percentage ?? 0) >= 80).length}
              </div>
              <div className="text-xs text-zinc-500">Warnings</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}