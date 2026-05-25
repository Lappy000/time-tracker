import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/hooks/useProjects';

interface ProjectFormProps {
  project?: Project | null;
  onSave: (data: CreateProjectInput | UpdateProjectInput) => void;
  onCancel: () => void;
}

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6b7280',
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(project?.name || '');
  const [color, setColor] = useState(project?.color || '#6366f1');
  const [client, setClient] = useState(project?.client || '');
  const [hourlyRate, setHourlyRate] = useState<string>(
    project?.hourly_rate?.toString() || ''
  );
  const [budgetHours, setBudgetHours] = useState<string>(
    project?.budget_hours?.toString() || ''
  );

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color);
      setClient(project.client || '');
      setHourlyRate(project.hourly_rate?.toString() || '');
      setBudgetHours(project.budget_hours?.toString() || '');
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: CreateProjectInput = {
      name: name.trim(),
      color,
      client: client.trim() || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      budget_hours: budgetHours ? parseFloat(budgetHours) : null,
    };

    onSave(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{project ? 'Edit Project' : 'New Project'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="My Project"
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Client (Optional)</label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Client name"
            />
          </div>

          {/* Hourly Rate */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hourly Rate (Optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Budget Hours */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Budget Hours (Optional)</label>
            <input
              type="number"
              value={budgetHours}
              onChange={(e) => setBudgetHours(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
              min="0"
              step="0.5"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim()}>
              {project ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}