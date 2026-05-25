import { LayoutDashboard, FolderKanban, Settings, BarChart3, Target, Timer, Camera, Briefcase, Calendar, Command, AppWindow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export type Page = 'dashboard' | 'categories' | 'analytics' | 'goals' | 'focus' | 'screenshots' | 'projects' | 'calendar' | 'applications' | 'settings';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenCommandPalette?: () => void;
}

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  shortcut?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'D' },
  { id: 'categories', label: 'Categories', icon: FolderKanban, shortcut: 'T' },
  { id: 'projects', label: 'Projects', icon: Briefcase, shortcut: 'J' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, shortcut: 'C' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: 'A' },
  { id: 'applications', label: 'Applications', icon: AppWindow, shortcut: 'L' },
  { id: 'goals', label: 'Goals', icon: Target, shortcut: 'G' },
  { id: 'focus', label: 'Focus', icon: Timer, shortcut: 'F' },
  { id: 'screenshots', label: 'Screenshots', icon: Camera, shortcut: 'P' },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'S' },
];

export function Navigation({ currentPage, onNavigate, onOpenCommandPalette }: NavigationProps) {
  return (
    <nav className="w-56 border-r border-border bg-card/50 flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TT</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm">Time Tracker</h2>
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Command Palette Button */}
      {onOpenCommandPalette && (
        <div className="px-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={onOpenCommandPalette}
          >
            <Command className="h-4 w-4" />
            <span className="flex-1 text-left">Command...</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+K</kbd>
          </Button>
        </div>
      )}
      
      <div className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 group',
                isActive && 'bg-secondary'
              )}
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  Alt+{item.shortcut}
                </kbd>
              )}
            </Button>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-2">
          <p className="font-medium">Global Shortcuts</p>
          <div className="grid grid-cols-2 gap-1">
            <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+Shift+T</kbd></p>
            <p>Toggle tracking</p>
            <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+Shift+P</kbd></p>
            <p>Private mode</p>
            <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+Shift+F</kbd></p>
            <p>Focus session</p>
            <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl+K</kbd></p>
            <p>Commands</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Compact sidebar for smaller screens
export function CompactNavigation({ currentPage, onNavigate, onOpenCommandPalette }: NavigationProps) {
  return (
    <nav className="w-16 border-r border-border bg-card/50 flex flex-col items-center py-4">
      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mb-4">
        <span className="text-primary-foreground font-bold text-sm">TT</span>
      </div>

      {/* Command Palette Button */}
      {onOpenCommandPalette && (
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 mb-4"
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+K)"
        >
          <Command className="h-5 w-5" />
        </Button>
      )}
      
      <div className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                'h-10 w-10',
                isActive && 'bg-secondary'
              )}
              onClick={() => onNavigate(item.id)}
              title={`${item.label} (Alt+${item.shortcut})`}
            >
              <Icon className="h-5 w-5" />
            </Button>
          );
        })}
      </div>
    </nav>
  );
}