import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MoreVertical, Edit, Archive, Trash2, RotateCcw, Clock, DollarSign, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { ProjectWithStats } from '@/hooks/useProjects';

interface ProjectCardProps {
  project: ProjectWithStats;
  onEdit: (project: ProjectWithStats) => void;
  onArchive: (id: number) => void;
  onRestore: (id: number) => void;
  onDelete: (id: number) => void;
  onViewRules: (project: ProjectWithStats) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onViewRules,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatHours = (seconds: number): string => {
    const hours = seconds / 3600;
    return hours.toFixed(1) + 'h';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isOverBudget = project.budget_used_percent !== null && project.budget_used_percent > 100;
  const isNearBudget = project.budget_used_percent !== null && project.budget_used_percent >= 80 && project.budget_used_percent <= 100;

  return (
    <Card className={`relative ${!project.is_active ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        {/* Header with color indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <div>
              <h3 className="font-medium">{project.name}</h3>
              {project.client && (
                <p className="text-xs text-muted-foreground">{project.client}</p>
              )}
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-1 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[140px]">
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      onEdit(project);
                      setShowMenu(false);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                    onClick={() => {
                      onViewRules(project);
                      setShowMenu(false);
                    }}
                  >
                    <Clock className="h-4 w-4" />
                    Rules
                  </button>
                  {project.is_active ? (
                    <button
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-yellow-500"
                      onClick={() => {
                        onArchive(project.id);
                        setShowMenu(false);
                      }}
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                  ) : (
                    <button
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-green-500"
                      onClick={() => {
                        onRestore(project.id);
                        setShowMenu(false);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                  )}
                  <button
                    className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                    onClick={() => {
                      onDelete(project.id);
                      setShowMenu(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          {/* Time tracked */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time Tracked
            </span>
            <span className="font-medium">{formatHours(project.total_time)}</span>
          </div>

          {/* Billable amount */}
          {project.hourly_rate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Billable
              </span>
              <span className="font-medium text-green-500">
                {formatCurrency(project.billable_amount)}
              </span>
            </div>
          )}

          {/* Budget progress */}
          {project.budget_hours !== null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  {(isOverBudget || isNearBudget) && (
                    <AlertTriangle className={`h-3 w-3 ${isOverBudget ? 'text-destructive' : 'text-yellow-500'}`} />
                  )}
                  Budget
                </span>
                <span className={`font-medium ${isOverBudget ? 'text-destructive' : ''}`}>
                  {formatHours(project.total_time)} / {project.budget_hours}h
                </span>
              </div>
              <Progress
                value={Math.min(project.budget_used_percent || 0, 100)}
                className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : isNearBudget ? '[&>div]:bg-yellow-500' : ''}`}
              />
              {isOverBudget && (
                <p className="text-xs text-destructive">
                  Over budget by {formatHours(project.total_time - (project.budget_hours * 3600))}
                </p>
              )}
            </div>
          )}

          {/* Rules count */}
          <div className="text-xs text-muted-foreground">
            {project.rules.length} auto-assign {project.rules.length === 1 ? 'rule' : 'rules'}
          </div>
        </div>

        {/* Archived badge */}
        {!project.is_active && (
          <div className="absolute top-2 right-12 text-xs px-2 py-0.5 bg-muted rounded">
            Archived
          </div>
        )}
      </CardContent>
    </Card>
  );
}