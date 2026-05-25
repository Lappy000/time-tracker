// time-tracker/src/components/settings/ShortcutsSettings.tsx
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIpc } from '@/hooks';
import { Keyboard, RotateCcw, Edit2, Check, X } from 'lucide-react';

interface KeyboardShortcut {
  id: string;
  accelerator: string;
  is_enabled: boolean;
  updated_at: string;
}

const SHORTCUT_LABELS: Record<string, { label: string; description: string }> = {
  toggle_tracking: {
    label: 'Toggle Tracking',
    description: 'Start or stop time tracking'
  },
  toggle_private_mode: {
    label: 'Toggle Private Mode',
    description: 'Enable or disable private mode'
  },
  start_focus: {
    label: 'Start Focus Session',
    description: 'Start a new focus/pomodoro session'
  },
  take_screenshot: {
    label: 'Take Screenshot',
    description: 'Capture a screenshot now'
  },
  open_dashboard: {
    label: 'Open Dashboard',
    description: 'Show the app window and navigate to dashboard'
  },
  open_command_palette: {
    label: 'Command Palette',
    description: 'Open the command palette for quick actions'
  }
};

export function ShortcutsSettings() {
  const { invoke, channels } = useIpc();
  
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAccelerator, setEditingAccelerator] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  // Load shortcuts
  const loadShortcuts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<KeyboardShortcut[]>(channels.SHORTCUTS.GET_ALL);
      if (result.success && result.data) {
        setShortcuts(result.data);
        // Check if any shortcuts are enabled
        setGlobalEnabled(result.data.some(s => s.is_enabled));
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [invoke, channels]);

  useEffect(() => {
    loadShortcuts();
  }, [loadShortcuts]);

  // Record key combination
  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const parts: string[] = [];
      
      // Add modifiers
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Meta');
      
      // Add the key itself (if it's not just a modifier)
      const key = e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        // Convert key to readable format
        let displayKey = key.toUpperCase();
        if (key === ' ') displayKey = 'Space';
        else if (key === 'ArrowUp') displayKey = 'Up';
        else if (key === 'ArrowDown') displayKey = 'Down';
        else if (key === 'ArrowLeft') displayKey = 'Left';
        else if (key === 'ArrowRight') displayKey = 'Right';
        else if (key.length === 1) displayKey = key.toUpperCase();
        
        parts.push(displayKey);
        
        // We have a complete shortcut
        const accelerator = parts.join('+');
        setEditingAccelerator(accelerator);
        setIsRecording(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isRecording]);

  // Handlers
  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    const result = await invoke<KeyboardShortcut>(channels.SHORTCUTS.SET_ENABLED, id, enabled);
    if (result.success && result.data) {
      setShortcuts(prev => prev.map(s => s.id === id ? result.data! : s));
    }
  };

  const handleToggleAllEnabled = async () => {
    const newEnabled = !globalEnabled;
    setGlobalEnabled(newEnabled);
    
    // Toggle all shortcuts
    for (const shortcut of shortcuts) {
      await invoke<KeyboardShortcut>(channels.SHORTCUTS.SET_ENABLED, shortcut.id, newEnabled);
    }
    
    // Reload to get updated state
    await loadShortcuts();
  };

  const handleStartEditing = (shortcut: KeyboardShortcut) => {
    setEditingId(shortcut.id);
    setEditingAccelerator(shortcut.accelerator);
    setIsRecording(false);
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditingAccelerator('');
    setIsRecording(false);
  };

  const handleSaveShortcut = async () => {
    if (!editingId || !editingAccelerator) return;
    
    const result = await invoke<KeyboardShortcut>(channels.SHORTCUTS.UPDATE, editingId, editingAccelerator);
    if (result.success && result.data) {
      setShortcuts(prev => prev.map(s => s.id === editingId ? result.data! : s));
      setEditingId(null);
      setEditingAccelerator('');
    }
  };

  const handleResetAll = async () => {
    const result = await invoke<KeyboardShortcut[]>(channels.SHORTCUTS.RESET_ALL);
    if (result.success && result.data) {
      setShortcuts(result.data);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Loading shortcuts...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </CardTitle>
        <CardDescription>
          Customize global keyboard shortcuts for quick actions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div className="space-y-0.5">
            <Label htmlFor="global-shortcuts" className="text-base font-medium">
              Enable Global Shortcuts
            </Label>
            <p className="text-sm text-muted-foreground">
              Global shortcuts work even when the app is in background
            </p>
          </div>
          <Switch
            id="global-shortcuts"
            checked={globalEnabled}
            onCheckedChange={handleToggleAllEnabled}
          />
        </div>

        {/* Shortcuts list */}
        <div className="space-y-3">
          {shortcuts.map(shortcut => {
            const info = SHORTCUT_LABELS[shortcut.id] || { label: shortcut.id, description: '' };
            const isEditing = editingId === shortcut.id;
            
            return (
              <div
                key={shortcut.id}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">{info.label}</Label>
                    <Switch
                      checked={shortcut.is_enabled}
                      onCheckedChange={(enabled) => handleToggleEnabled(shortcut.id, enabled)}
                      className="scale-75"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <div className="relative">
                        <Input
                          value={editingAccelerator}
                          onChange={(e) => setEditingAccelerator(e.target.value)}
                          className="w-36 text-center font-mono text-sm"
                          placeholder="Press keys..."
                          readOnly={isRecording}
                        />
                        {isRecording && (
                          <span className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded border-2 border-primary animate-pulse">
                            Recording...
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsRecording(true)}
                        disabled={isRecording}
                      >
                        <Keyboard className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleSaveShortcut}>
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEditing}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono min-w-[100px] text-center">
                        {shortcut.accelerator}
                      </kbd>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEditing(shortcut)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset button */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={handleResetAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          Click the keyboard icon to record a new shortcut. Use combinations like Ctrl+Shift+T.
          Some shortcuts may conflict with other applications.
        </p>
      </CardContent>
    </Card>
  );
}