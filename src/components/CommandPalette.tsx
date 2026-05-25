// time-tracker/src/components/CommandPalette.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useIpc } from '@/hooks';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Target,
  Timer,
  Camera,
  Briefcase,
  Calendar,
  Settings,
  Play,
  Pause,
  Shield,
  Moon,
  Sun,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Page } from './Navigation';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (page: Page) => void;
  isTracking: boolean;
  onToggleTracking: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'settings';
  action: () => void;
  keywords?: string[];
}

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  isTracking,
  onToggleTracking
}: CommandPaletteProps) {
  const { invoke, channels } = useIpc();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [privateMode, setPrivateMode] = useState(false);

  // Load private mode status
  useEffect(() => {
    if (open) {
      invoke<boolean>(channels.PRIVACY.GET_PRIVATE_MODE).then(result => {
        if (result.success) {
          setPrivateMode(result.data || false);
        }
      });
    }
  }, [open, invoke, channels]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Toggle private mode
  const handleTogglePrivateMode = useCallback(async () => {
    const result = await invoke<boolean>(channels.PRIVACY.SET_PRIVATE_MODE, !privateMode);
    if (result.success) {
      setPrivateMode(!privateMode);
    }
    onOpenChange(false);
  }, [invoke, channels, privateMode, onOpenChange]);

  // Take screenshot
  const handleTakeScreenshot = useCallback(async () => {
    await invoke(channels.SCREENSHOTS.TAKE_MANUAL);
    onOpenChange(false);
  }, [invoke, channels, onOpenChange]);

  // Navigate to page
  const navigateTo = useCallback((page: Page) => {
    onNavigate(page);
    onOpenChange(false);
  }, [onNavigate, onOpenChange]);

  // Define commands
  const commands = useMemo<CommandItem[]>(() => [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'View your daily activity overview',
      icon: <LayoutDashboard className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('dashboard'),
      keywords: ['home', 'main', 'overview']
    },
    {
      id: 'nav-categories',
      title: 'Go to Categories',
      description: 'Manage app categories and productivity scores',
      icon: <FolderKanban className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('categories'),
      keywords: ['apps', 'organize']
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      description: 'Manage projects and billing',
      icon: <Briefcase className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('projects'),
      keywords: ['work', 'clients', 'billing']
    },
    {
      id: 'nav-calendar',
      title: 'Go to Calendar',
      description: 'View calendar and events',
      icon: <Calendar className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('calendar'),
      keywords: ['schedule', 'events']
    },
    {
      id: 'nav-analytics',
      title: 'Go to Analytics',
      description: 'View detailed statistics and trends',
      icon: <BarChart3 className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('analytics'),
      keywords: ['stats', 'charts', 'reports']
    },
    {
      id: 'nav-goals',
      title: 'Go to Goals',
      description: 'Set and track productivity goals',
      icon: <Target className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('goals'),
      keywords: ['targets', 'limits']
    },
    {
      id: 'nav-focus',
      title: 'Go to Focus Mode',
      description: 'Pomodoro timer and focus sessions',
      icon: <Timer className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('focus'),
      keywords: ['pomodoro', 'timer', 'concentration']
    },
    {
      id: 'nav-screenshots',
      title: 'Go to Screenshots',
      description: 'View captured screenshots',
      icon: <Camera className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('screenshots'),
      keywords: ['photos', 'captures']
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Configure app preferences',
      icon: <Settings className="h-4 w-4" />,
      category: 'navigation',
      action: () => navigateTo('settings'),
      keywords: ['preferences', 'config']
    },
    
    // Actions
    {
      id: 'action-toggle-tracking',
      title: isTracking ? 'Stop Tracking' : 'Start Tracking',
      description: isTracking ? 'Pause time tracking' : 'Begin time tracking',
      icon: isTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />,
      category: 'action',
      action: () => {
        onToggleTracking();
        onOpenChange(false);
      },
      keywords: ['record', 'timer']
    },
    {
      id: 'action-private-mode',
      title: privateMode ? 'Disable Private Mode' : 'Enable Private Mode',
      description: privateMode ? 'Resume tracking' : 'Temporarily stop all tracking',
      icon: <Shield className="h-4 w-4" />,
      category: 'action',
      action: handleTogglePrivateMode,
      keywords: ['privacy', 'pause', 'hide']
    },
    {
      id: 'action-screenshot',
      title: 'Take Screenshot',
      description: 'Capture a screenshot now',
      icon: <Camera className="h-4 w-4" />,
      category: 'action',
      action: handleTakeScreenshot,
      keywords: ['capture', 'photo']
    }
  ], [navigateTo, isTracking, onToggleTracking, onOpenChange, privateMode, handleTogglePrivateMode, handleTakeScreenshot]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    
    const searchLower = search.toLowerCase();
    return commands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some(k => k.includes(searchLower));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      action: [],
      settings: []
    };
    
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });
    
    return groups;
  }, [filteredCommands]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredCommands, selectedIndex]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Get flat list index for grouped display
  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            esc
          </kbd>
        </div>

        {/* Commands list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            <>
              {/* Navigation commands */}
              {groupedCommands.navigation.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Navigation
                  </div>
                  {groupedCommands.navigation.map((cmd) => {
                    const currentIndex = flatIndex++;
                    return (
                      <CommandButton
                        key={cmd.id}
                        command={cmd}
                        isSelected={currentIndex === selectedIndex}
                        onClick={cmd.action}
                      />
                    );
                  })}
                </div>
              )}

              {/* Action commands */}
              {groupedCommands.action.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Actions
                  </div>
                  {groupedCommands.action.map((cmd) => {
                    const currentIndex = flatIndex++;
                    return (
                      <CommandButton
                        key={cmd.id}
                        command={cmd}
                        isSelected={currentIndex === selectedIndex}
                        onClick={cmd.action}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Command className="h-3 w-3" />
            <span>Command Palette</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-2">↵</kbd>
            <span>select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Command button component
interface CommandButtonProps {
  command: CommandItem;
  isSelected: boolean;
  onClick: () => void;
}

function CommandButton({ command, isSelected, onClick }: CommandButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full px-2 py-2 rounded-md text-left transition-colors',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-secondary'
      )}
    >
      <span className={cn(
        'shrink-0',
        isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
      )}>
        {command.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{command.title}</div>
        {command.description && (
          <div className={cn(
            'text-xs truncate',
            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}>
            {command.description}
          </div>
        )}
      </div>
    </button>
  );
}