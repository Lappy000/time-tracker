import { useState, useEffect, Component, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GoalForm, GoalsList, GoalWarnings, GoalsSummary } from '@/components/goals';
import {
  useGoals,
  type GoalWithProgress,
  type CreateGoalInput,
  type UpdateGoalInput
} from '@/hooks/useGoals';

// Simple Error Boundary Component
class GoalsErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GoalsPage Error Boundary caught an error:", error, errorInfo);
    // Log to verify if it's a data issue
    console.log("Error details:", { error: error.message, stack: error.stack, info: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Something went wrong</h2>
          <p className="text-zinc-400 mb-4">We couldn't load the goals page correctly.</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Application
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GoalsPage() {
  return (
    <GoalsErrorBoundary>
      <GoalsListContent />
    </GoalsErrorBoundary>
  );
}

function GoalsListContent() {
  const {
    goals,
    activeGoals,
    warnings,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleGoalActive,
    syncProgress
  } = useGoals();

  // Debug logging for Goals Page Crash
  useEffect(() => {
    if (activeGoals) {
      console.log('GoalsPage: activeGoals loaded:', activeGoals);
      activeGoals.forEach((g, i) => {
        if (!g) console.error(`GoalsPage: activeGoals[${i}] is undefined/null`);
        else if (typeof g.percentage !== 'number') console.error(`GoalsPage: activeGoals[${i}].percentage is missing`, g);
      });
    }
  }, [activeGoals]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithProgress | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GoalWithProgress | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleCreate = () => {
    setEditingGoal(null);
    setIsFormOpen(true);
  };

  const handleEdit = (goal: GoalWithProgress) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = (goal: GoalWithProgress) => {
    setDeleteConfirm(goal);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteGoal(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (goal: GoalWithProgress) => {
    await toggleGoalActive(goal.id, !goal.is_active);
  };

  const handleSave = async (data: CreateGoalInput | UpdateGoalInput) => {
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
    } else {
      await createGoal(data as CreateGoalInput);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await syncProgress();
    setSyncing(false);
  };

  // Calculate stats - safely handle undefined percentage values
  const completedToday = activeGoals.filter(g => !g.is_limit && (g.percentage ?? 0) >= 100).length;
  const warningCount = warnings.length;
  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + Math.min(g.percentage ?? 0, 100), 0) / activeGoals.length)
    : 0;

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals & Productivity</h1>
          <p className="text-zinc-400">
            Set and track your productivity goals
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="border-zinc-700 text-zinc-400 hover:text-white"
          >
            {syncing ? '↻ Syncing...' : '↻ Sync Progress'}
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            + New Goal
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Warnings */}
      <GoalWarnings warnings={warnings} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{activeGoals.length}</div>
              <div className="text-sm text-zinc-500 mt-1">Active Goals</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{completedToday}</div>
              <div className="text-sm text-zinc-500 mt-1">Completed Today</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{avgProgress}%</div>
              <div className="text-sm text-zinc-500 mt-1">Avg Progress</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${warningCount > 0 ? 'text-orange-400' : 'text-zinc-400'}`}>
                {warningCount}
              </div>
              <div className="text-sm text-zinc-500 mt-1">Limit Warnings</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Goals Summary */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <span>🎯</span>
              Today's Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-zinc-500 text-center py-4">Loading...</div>
            ) : (
              <GoalsSummary goals={activeGoals.filter(g => g.period === 'daily')} maxItems={5} />
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <span>📊</span>
              Goal Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {/* Time Goals */}
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">⏱️</div>
                <div className="text-2xl font-bold text-white">
                  {goals.filter(g => g.type === 'time').length}
                </div>
                <div className="text-sm text-zinc-500">Time Goals</div>
                <div className="text-xs text-zinc-600 mt-1">
                  Track time spent on activities
                </div>
              </div>

              {/* Limit Goals */}
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🚫</div>
                <div className="text-2xl font-bold text-white">
                  {goals.filter(g => g.type === 'limit').length}
                </div>
                <div className="text-sm text-zinc-500">Time Limits</div>
                <div className="text-xs text-zinc-600 mt-1">
                  Set maximum time allowed
                </div>
              </div>

              {/* Focus Goals */}
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-2xl font-bold text-white">
                  {goals.filter(g => g.type === 'focus').length}
                </div>
                <div className="text-sm text-zinc-500">Focus Goals</div>
                <div className="text-xs text-zinc-600 mt-1">
                  Focus on specific categories
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Goals List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">All Goals</h2>
        {loading ? (
          <div className="text-zinc-500 text-center py-8">Loading goals...</div>
        ) : (
          <GoalsList
            goals={goals}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      {/* Goal Form Modal */}
      <GoalForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        goal={editingGoal}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="text-white">Delete Goal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-zinc-400">
                Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setDeleteConfirm(null)}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}