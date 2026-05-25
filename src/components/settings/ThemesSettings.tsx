// time-tracker/src/components/settings/ThemesSettings.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/lib/ThemeProvider';
import { Palette, Check, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemesSettings() {
  const { theme, setTheme, themes, isLoading } = useTheme();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Themes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Loading themes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Themes
        </CardTitle>
        <CardDescription>
          Choose your preferred color scheme
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System preference option */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">System Preference</h4>
          <button
            onClick={() => setTheme('system')}
            className={cn(
              'flex items-center gap-3 w-full p-4 rounded-lg border-2 transition-all',
              theme === 'system'
                ? 'border-primary bg-primary/10'
                : 'border-transparent bg-secondary/50 hover:bg-secondary/80'
            )}
          >
            <div className="p-2 rounded-full bg-muted">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-medium">Follow System</p>
              <p className="text-xs text-muted-foreground">
                Automatically switch between light and dark themes
              </p>
            </div>
            {theme === 'system' && (
              <Check className="h-5 w-5 text-primary ml-auto" />
            )}
          </button>
        </div>

        {/* Theme gallery */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Theme Gallery</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={cn(
                  'relative group overflow-hidden rounded-lg border-2 transition-all',
                  theme === t.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-muted-foreground/20'
                )}
              >
                {/* Theme preview */}
                <ThemePreview
                  colors={t.colors}
                  isDark={t.isDark}
                />
                
                {/* Theme name */}
                <div className="p-2 bg-card border-t">
                  <div className="flex items-center gap-2">
                    {t.isDark ? (
                      <Moon className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Sun className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-xs font-medium truncate">{t.name}</span>
                    {theme === t.id && (
                      <Check className="h-3 w-3 text-primary ml-auto" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground pt-4 border-t">
          Themes customize the app's color scheme. All themes include productivity colors 
          for distinguishing productive vs distracting activities.
        </p>
      </CardContent>
    </Card>
  );
}

// Theme preview component
interface ThemePreviewProps {
  colors: {
    background: string;
    card: string;
    primary: string;
    secondary: string;
    muted: string;
    productive?: string;
    distraction?: string;
  };
  isDark: boolean;
}

function ThemePreview({ colors, isDark }: ThemePreviewProps) {
  // Convert HSL string to CSS value
  const hsl = (color: string) => `hsl(${color})`;

  return (
    <div
      className="h-24 w-full p-2"
      style={{ backgroundColor: hsl(colors.background) }}
    >
      {/* Mini app preview */}
      <div className="h-full flex gap-1">
        {/* Sidebar */}
        <div
          className="w-6 rounded-sm"
          style={{ backgroundColor: hsl(colors.card) }}
        >
          <div
            className="w-3 h-3 mx-auto mt-1 rounded-sm"
            style={{ backgroundColor: hsl(colors.primary) }}
          />
          <div
            className="w-3 h-1 mx-auto mt-1 rounded-sm opacity-50"
            style={{ backgroundColor: hsl(colors.muted) }}
          />
          <div
            className="w-3 h-1 mx-auto mt-1 rounded-sm opacity-50"
            style={{ backgroundColor: hsl(colors.muted) }}
          />
        </div>
        
        {/* Content area */}
        <div className="flex-1 space-y-1">
          {/* Top bar */}
          <div
            className="h-3 rounded-sm"
            style={{ backgroundColor: hsl(colors.secondary) }}
          />
          
          {/* Cards */}
          <div className="flex gap-1">
            <div
              className="flex-1 h-8 rounded-sm"
              style={{ backgroundColor: hsl(colors.card) }}
            >
              <div
                className="w-8 h-1.5 m-1 rounded-sm"
                style={{ backgroundColor: hsl(colors.productive || '142.1 76.2% 36.3%') }}
              />
            </div>
            <div
              className="flex-1 h-8 rounded-sm"
              style={{ backgroundColor: hsl(colors.card) }}
            >
              <div
                className="w-6 h-1.5 m-1 rounded-sm"
                style={{ backgroundColor: hsl(colors.distraction || '0 72.2% 50.6%') }}
              />
            </div>
          </div>
          
          {/* Stats */}
          <div
            className="h-5 rounded-sm"
            style={{ backgroundColor: hsl(colors.card) }}
          >
            <div className="flex gap-1 p-1">
              <div
                className="flex-1 h-2 rounded-sm"
                style={{ backgroundColor: hsl(colors.primary) }}
              />
              <div
                className="w-4 h-2 rounded-sm opacity-50"
                style={{ backgroundColor: hsl(colors.muted) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}