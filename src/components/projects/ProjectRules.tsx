import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Trash2, AppWindow, FolderOpen, Type } from 'lucide-react';
import type { ProjectRule, ProjectWithStats, CreateProjectRuleInput } from '@/hooks/useProjects';

interface ProjectRulesProps {
  project: ProjectWithStats;
  rules: ProjectRule[];
  onCreateRule: (input: CreateProjectRuleInput) => Promise<ProjectRule | null>;
  onDeleteRule: (id: number) => Promise<boolean>;
  onClose: () => void;
}

type RuleType = 'app' | 'path' | 'window_title';

const RULE_TYPE_OPTIONS: { value: RuleType; label: string; icon: typeof AppWindow; description: string }[] = [
  {
    value: 'app',
    label: 'App Name',
    icon: AppWindow,
    description: 'Match by application name (e.g., "VS Code", "Chrome")',
  },
  {
    value: 'window_title',
    label: 'Window Title',
    icon: Type,
    description: 'Match by window title text (e.g., "project-name")',
  },
  {
    value: 'path',
    label: 'File Path',
    icon: FolderOpen,
    description: 'Match by executable path (e.g., "/projects/myapp")',
  },
];

export function ProjectRules({
  project,
  rules,
  onCreateRule,
  onDeleteRule,
  onClose,
}: ProjectRulesProps) {
  const [localRules, setLocalRules] = useState<ProjectRule[]>(rules);
  const [newRuleType, setNewRuleType] = useState<RuleType>('app');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLocalRules(rules);
  }, [rules]);

  const handleAddRule = async () => {
    if (!newRulePattern.trim()) return;

    setLoading(true);
    const result = await onCreateRule({
      project_id: project.id,
      rule_type: newRuleType,
      pattern: newRulePattern.trim(),
    });

    if (result) {
      setLocalRules([...localRules, result]);
      setNewRulePattern('');
      setIsAdding(false);
    }
    setLoading(false);
  };

  const handleDeleteRule = async (ruleId: number) => {
    setLoading(true);
    const success = await onDeleteRule(ruleId);
    if (success) {
      setLocalRules(localRules.filter((r) => r.id !== ruleId));
    }
    setLoading(false);
  };

  const getRuleIcon = (type: RuleType) => {
    const option = RULE_TYPE_OPTIONS.find((o) => o.value === type);
    return option?.icon || AppWindow;
  };

  const getRuleTypeLabel = (type: RuleType) => {
    const option = RULE_TYPE_OPTIONS.find((o) => o.value === type);
    return option?.label || type;
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <CardTitle className="text-lg">Auto-Assign Rules</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Rules automatically assign time entries to{' '}
          <span className="font-medium text-foreground">{project.name}</span>{' '}
          based on matching patterns.
        </p>

        {/* Existing rules */}
        <div className="space-y-2">
          {localRules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No rules defined. Add a rule to auto-assign time entries.
            </p>
          ) : (
            localRules.map((rule) => {
              const Icon = getRuleIcon(rule.rule_type);
              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{rule.pattern}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRuleTypeLabel(rule.rule_type)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Add new rule */}
        {isAdding ? (
          <div className="space-y-3 p-3 border border-border rounded-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rule Type</label>
              <div className="grid grid-cols-3 gap-2">
                {RULE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setNewRuleType(option.value)}
                    className={`p-2 rounded-md border text-center transition-colors ${
                      newRuleType === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <option.icon className="h-4 w-4 mx-auto mb-1" />
                    <span className="text-xs">{option.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {RULE_TYPE_OPTIONS.find((o) => o.value === newRuleType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pattern</label>
              <input
                type="text"
                value={newRulePattern}
                onChange={(e) => setNewRulePattern(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter pattern to match..."
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Case-insensitive partial match (e.g., "code" matches "VS Code")
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewRulePattern('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddRule}
                disabled={!newRulePattern.trim() || loading}
              >
                Add Rule
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        )}

        {/* Close button */}
        <div className="pt-2">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}