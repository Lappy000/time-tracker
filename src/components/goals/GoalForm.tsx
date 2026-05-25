import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCategories, type CategoryWithAppCount } from '@/hooks/useCategories';
import { type GoalWithProgress, type CreateGoalInput, type UpdateGoalInput } from '@/hooks/useGoals';

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateGoalInput | UpdateGoalInput) => Promise<void>;
  goal?: GoalWithProgress | null;
}

type GoalType = 'time' | 'limit' | 'focus';
type Period = 'daily' | 'weekly' | 'monthly';

const GOAL_TYPES: { value: GoalType; label: string; description: string }[] = [
  { value: 'time', label: '⏱️ Time Goal', description: 'Track time spent' },
  { value: 'limit', label: '🚫 Time Limit', description: 'Set maximum time' },
  { value: 'focus', label: '🎯 Focus Goal', description: 'Focus on category' },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const PRESET_TARGETS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
  { minutes: 240, label: '4 hours' },
  { minutes: 480, label: '8 hours' },
];

export function GoalForm({ isOpen, onClose, onSave, goal }: GoalFormProps) {
  const { categories } = useCategories();
  
  const [name, setName] = useState('');
  const [type, setType] = useState<GoalType>('time');
  const [categoryId, setCategoryId] = useState<string>('');
  const [targetMinutes, setTargetMinutes] = useState(60);
  const [period, setPeriod] = useState<Period>('daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      if (goal) {
        setName(goal.name);
        setType(goal.type);
        setCategoryId(goal.category_id?.toString() || '');
        setTargetMinutes(goal.target_minutes);
        setPeriod(goal.period);
      } else {
        setName('');
        setType('time');
        setCategoryId('');
        setTargetMinutes(60);
        setPeriod('daily');
      }
      setError(null);
    }
  }, [isOpen, goal]);

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (targetMinutes <= 0) {
      setError('Target must be greater than 0');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Ensure all required fields have valid values
      const data: CreateGoalInput | UpdateGoalInput = {
        name: name.trim(),
        type: type || 'time',
        category_id: categoryId ? parseInt(categoryId) : null,
        target_minutes: targetMinutes || 60,
        period: period || 'daily',
        is_limit: type === 'limit',
        // Ensure inputs match the expected types
        application_id: null,
      };

      console.log('Submitting goal data:', data);
      await onSave(data);
      onClose();
    } catch (err) {
      console.error('Goal saving error:', err);
      setError('Failed to save goal: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleTargetInput = (value: string) => {
    const num = parseInt(value) || 0;
    setTargetMinutes(Math.max(0, Math.min(1440, num)));
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {goal ? 'Edit Goal' : 'Create Goal'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-400">
              Goal Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily coding time"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Goal Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {GOAL_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    type === t.value
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="text-lg mb-1">{t.label.split(' ')[0]}</div>
                  <div className="text-xs">{t.label.split(' ').slice(1).join(' ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {/* Category */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Category (Optional)</Label>
            <Select value={categoryId || '__all__'} onValueChange={(val) => setCategoryId(val === '__all__' ? '' : val)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="__all__" className="text-zinc-400">
                  All categories
                </SelectItem>
                {categories.map((cat: CategoryWithAppCount) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span>{cat.icon} {cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label className="text-zinc-400">
              Target Time ({type === 'limit' ? 'Maximum' : 'Goal'})
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={targetMinutes}
                onChange={(e) => handleTargetInput(e.target.value)}
                min={1}
                max={1440}
                className="bg-zinc-800 border-zinc-700 text-white w-24"
              />
              <span className="text-zinc-400 text-sm">minutes</span>
              <span className="text-zinc-500 text-sm">= {formatDuration(targetMinutes)}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_TARGETS.map((preset) => (
                <button
                  type="button"
                  key={preset.minutes}
                  onClick={() => setTargetMinutes(preset.minutes)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    targetMinutes === preset.minutes
                      ? 'border-blue-500 bg-blue-500/20 text-white'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label className="text-zinc-400">Period</Label>
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded">
              {error}
            </div>
          )}

          {/* Summary */}
          <div className="bg-zinc-800 p-3 rounded-lg">
            <div className="text-sm text-zinc-400">Summary</div>
            <div className="text-white mt-1">
              {type === 'limit' ? '🚫 Limit' : type === 'focus' ? '🎯 Focus' : '⏱️ Track'}{' '}
              <strong>{formatDuration(targetMinutes)}</strong>{' '}
              {period}
              {categoryId && categoryId !== '__all__' && categories.find((c: CategoryWithAppCount) => c.id.toString() === categoryId) && (
                <span className="text-zinc-400">
                  {' '}on {categories.find((c: CategoryWithAppCount) => c.id.toString() === categoryId)?.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : goal ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}