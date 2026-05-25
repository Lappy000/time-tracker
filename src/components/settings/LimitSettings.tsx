import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Clock, AlertTriangle } from 'lucide-react';
import type { Category } from '@/hooks/useCategories';
import type { CategoryLimitWithUsage, CategoryLimitInput } from '@/hooks/useLimits';

interface LimitSettingsProps {
  categories: Category[];
  limits: CategoryLimitWithUsage[];
  onUpsertLimit: (limit: CategoryLimitInput) => Promise<unknown>;
  onDeleteLimit: (categoryId: number) => Promise<boolean>;
}

interface EditingLimit {
  category_id: number;
  hours: number;
  minutes: number;
  warning_threshold_percent: number;
  action: 'notify' | 'block' | 'log';
  is_enabled: boolean;
}

export function LimitSettings({ categories, limits, onUpsertLimit, onDeleteLimit }: LimitSettingsProps) {
  const [editingLimit, setEditingLimit] = useState<EditingLimit | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Categories that don't have limits yet
  const categoriesWithoutLimits = categories.filter(
    cat => !limits.find(l => l.category_id === cat.id)
  );

  const handleStartEditing = (limit: CategoryLimitWithUsage) => {
    const hours = Math.floor(limit.daily_limit_minutes / 60);
    const minutes = limit.daily_limit_minutes % 60;
    setEditingLimit({
      category_id: limit.category_id,
      hours,
      minutes,
      warning_threshold_percent: limit.warning_threshold_percent,
      action: limit.action,
      is_enabled: Boolean(limit.is_enabled)
    });
    setAddingNew(false);
  };

  const handleStartAddNew = () => {
    if (categoriesWithoutLimits.length === 0) return;
    setEditingLimit({
      category_id: categoriesWithoutLimits[0].id,
      hours: 2,
      minutes: 0,
      warning_threshold_percent: 80,
      action: 'notify',
      is_enabled: true
    });
    setAddingNew(true);
  };

  const handleSaveLimit = async () => {
    if (!editingLimit) return;
    
    const totalMinutes = editingLimit.hours * 60 + editingLimit.minutes;
    await onUpsertLimit({
      category_id: editingLimit.category_id,
      daily_limit_minutes: totalMinutes,
      warning_threshold_percent: editingLimit.warning_threshold_percent,
      action: editingLimit.action,
      is_enabled: editingLimit.is_enabled
    });
    setEditingLimit(null);
    setAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingLimit(null);
    setAddingNew(false);
  };

  const handleDeleteLimit = async (categoryId: number) => {
    await onDeleteLimit(categoryId);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const getCategoryName = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId: number) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.color || '#6366f1';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              Category Time Limits
            </CardTitle>
            <CardDescription>
              Set daily time limits for specific categories
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartAddNew}
            disabled={categoriesWithoutLimits.length === 0 || editingLimit !== null}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Limit
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing limits list */}
        {limits.length === 0 && !addingNew && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No category limits configured</p>
            <p className="text-xs mt-1">Add limits to control time spent on specific categories</p>
          </div>
        )}

        {limits.map(limit => (
          <div
            key={limit.category_id}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            {editingLimit?.category_id === limit.category_id && !addingNew ? (
              // Edit mode
              <LimitEditForm
                editingLimit={editingLimit}
                setEditingLimit={setEditingLimit}
                categories={categories}
                onSave={handleSaveLimit}
                onCancel={handleCancelEdit}
                isNew={false}
              />
            ) : (
              // Display mode
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: limit.category_color || getCategoryColor(limit.category_id) }}
                    />
                    <span className="font-medium">
                      {limit.category_name || getCategoryName(limit.category_id)}
                    </span>
                    {!limit.is_enabled && (
                      <Badge variant="secondary" className="text-xs">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatTime(limit.used_minutes || 0)} / {formatTime(limit.daily_limit_minutes)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEditing(limit)}
                      disabled={editingLimit !== null}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLimit(limit.category_id)}
                      disabled={editingLimit !== null}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="space-y-1">
                  <Progress
                    value={Math.min(limit.percent_used || 0, 100)}
                    className={`h-2 ${(limit.percent_used || 0) >= 100 ? 'bg-destructive/20' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {(limit.percent_used || 0) >= limit.warning_threshold_percent && (limit.percent_used || 0) < 100 && (
                        <span className="text-yellow-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Warning threshold reached
                        </span>
                      )}
                      {(limit.percent_used || 0) >= 100 && (
                        <span className="text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Limit exceeded!
                        </span>
                      )}
                    </span>
                    <span>{limit.percent_used || 0}%</span>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Warning at: {limit.warning_threshold_percent}%</span>
                  <span>Action: {limit.action}</span>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add new limit form */}
        {addingNew && editingLimit && (
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <LimitEditForm
              editingLimit={editingLimit}
              setEditingLimit={setEditingLimit}
              categories={categoriesWithoutLimits}
              onSave={handleSaveLimit}
              onCancel={handleCancelEdit}
              isNew={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface LimitEditFormProps {
  editingLimit: EditingLimit;
  setEditingLimit: (limit: EditingLimit) => void;
  categories: Category[];
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}

function LimitEditForm({ editingLimit, setEditingLimit, categories, onSave, onCancel, isNew }: LimitEditFormProps) {
  return (
    <div className="space-y-4">
      {isNew && (
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={String(editingLimit.category_id)}
            onValueChange={(value) => setEditingLimit({ ...editingLimit, category_id: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Daily Time Limit</Label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={23}
              value={editingLimit.hours}
              onChange={(e) => setEditingLimit({ ...editingLimit, hours: parseInt(e.target.value) || 0 })}
              className="w-16"
            />
            <span className="text-sm text-muted-foreground">h</span>
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={59}
              value={editingLimit.minutes}
              onChange={(e) => setEditingLimit({ ...editingLimit, minutes: parseInt(e.target.value) || 0 })}
              className="w-16"
            />
            <span className="text-sm text-muted-foreground">m</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Warning at</Label>
          <span className="text-sm text-muted-foreground">{editingLimit.warning_threshold_percent}%</span>
        </div>
        <Slider
          min={50}
          max={95}
          step={5}
          value={[editingLimit.warning_threshold_percent]}
          onValueChange={(value) => setEditingLimit({ ...editingLimit, warning_threshold_percent: value[0] })}
        />
      </div>

      <div className="space-y-2">
        <Label>Action when limit reached</Label>
        <Select
          value={editingLimit.action}
          onValueChange={(value) => setEditingLimit({ ...editingLimit, action: value as 'notify' | 'block' | 'log' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="notify">🔔 Notify only</SelectItem>
            <SelectItem value="block">🚫 Block app</SelectItem>
            <SelectItem value="log">📝 Just log</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label>Enabled</Label>
        <Switch
          checked={editingLimit.is_enabled}
          onCheckedChange={(checked) => setEditingLimit({ ...editingLimit, is_enabled: checked })}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          {isNew ? 'Add Limit' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}