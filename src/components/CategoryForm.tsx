import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { Category, CategoryInput } from '../hooks/useCategories';

// Predefined color palette
const COLORS = [
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Orange', value: '#f97316' },
];

// Common emoji icons
const EMOJIS = [
  '🎯', '💼', '🌐', '🎮', '📚', '🔧',
  '💻', '📝', '📊', '🎨', '🎵', '📧',
  '💬', '📱', '🎥', '🔍', '⚙️', '🛠️',
  '📁', '🗂️', '📈', '💡', '🔒', '🌟',
];

// Productivity types
const PRODUCTIVITY_TYPES = [
  { label: 'Productive', value: 'productive', score: 100 },
  { label: 'Neutral', value: 'neutral', score: 0 },
  { label: 'Distracting', value: 'distracting', score: -50 },
];

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSave: (data: CategoryInput) => Promise<void>;
  existingNames: string[];
}

export function CategoryForm({
  open,
  onOpenChange,
  category,
  onSave,
  existingNames,
}: CategoryFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0].value);
  const [icon, setIcon] = useState<string>(EMOJIS[0]);
  const [productivityType, setProductivityType] = useState<string>('neutral');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!category;

  // Reset form when opening/closing or when category changes
  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name);
        setColor(category.color);
        setIcon(category.icon || EMOJIS[0]);
        // Determine productivity type from score
        if (category.productivity_score > 0) {
          setProductivityType('productive');
        } else if (category.productivity_score < 0) {
          setProductivityType('distracting');
        } else {
          setProductivityType('neutral');
        }
      } else {
        setName('');
        setColor(COLORS[0].value);
        setIcon(EMOJIS[0]);
        setProductivityType('neutral');
      }
      setError(null);
    }
  }, [open, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    // Check for duplicate names (excluding current category when editing)
    const nameLower = trimmedName.toLowerCase();
    const isDuplicate = existingNames.some(
      (n) => n.toLowerCase() === nameLower && (!category || n !== category.name)
    );
    if (isDuplicate) {
      setError('A category with this name already exists');
      return;
    }

    const productivityConfig = PRODUCTIVITY_TYPES.find(
      (t) => t.value === productivityType
    )!;

    try {
      setSaving(true);
      await onSave({
        name: trimmedName,
        color,
        icon,
        is_productive: productivityType === 'productive',
        productivity_score: productivityConfig.score,
      });
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update category details. Changes will apply immediately.'
                : 'Create a new category to organize your applications.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Name Input */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Development, Communication"
                className="col-span-3"
              />
            </div>

            {/* Color Picker */}
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c.value
                        ? 'border-white scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Emoji Picker */}
            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all hover:bg-muted ${
                      icon === emoji
                        ? 'border-primary bg-muted'
                        : 'border-transparent'
                    }`}
                    onClick={() => setIcon(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Productivity Type */}
            <div className="grid gap-2">
              <Label>Productivity Type</Label>
              <Select value={productivityType} onValueChange={setProductivityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            type.value === 'productive'
                              ? 'bg-productive'
                              : type.value === 'distracting'
                              ? 'bg-distraction'
                              : 'bg-neutral'
                          }`}
                        />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}