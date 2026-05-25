import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppSettings } from '@/hooks/useSettings';

interface GeneralSettingsProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => Promise<boolean>;
}

export function GeneralSettings({ settings, onUpdate }: GeneralSettingsProps) {
  const handleTrackingIntervalChange = (value: number[]) => {
    onUpdate({ tracking_interval: value[0] * 1000 }); // Convert seconds to ms
  };

  const handleAutoStartChange = (checked: boolean) => {
    onUpdate({ auto_start: checked });
  };

  const handleStartMinimizedChange = (checked: boolean) => {
    onUpdate({ start_minimized: checked });
  };

  const handleMinimizeToTrayChange = (checked: boolean) => {
    onUpdate({ minimize_to_tray: checked });
  };

  const handleThemeChange = (value: string) => {
    onUpdate({ theme: value as 'dark' | 'light' | 'system' });
  };

  const handleTrackWindowTitlesChange = (checked: boolean) => {
    onUpdate({ track_window_titles: checked });
  };

  // Convert ms to seconds for display
  const trackingIntervalSeconds = Math.round(settings.tracking_interval / 1000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          General Settings
        </CardTitle>
        <CardDescription>
          Configure basic application behavior
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tracking Interval */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="tracking-interval" className="text-sm font-medium">
              Tracking Interval
            </Label>
            <span className="text-sm text-muted-foreground">
              {trackingIntervalSeconds} second{trackingIntervalSeconds !== 1 ? 's' : ''}
            </span>
          </div>
          <Slider
            id="tracking-interval"
            min={1}
            max={10}
            step={1}
            value={[trackingIntervalSeconds]}
            onValueChange={handleTrackingIntervalChange}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            How often to check which application is active. Lower values are more accurate but use more resources.
          </p>
        </div>

        {/* Auto Start */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-start" className="text-sm font-medium">
              Auto-start with system
            </Label>
            <p className="text-xs text-muted-foreground">
              Launch Time Tracker when you log in
            </p>
          </div>
          <Switch
            id="auto-start"
            checked={settings.auto_start}
            onCheckedChange={handleAutoStartChange}
          />
        </div>

        {/* Start Minimized */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="start-minimized" className="text-sm font-medium">
              Start minimized to tray
            </Label>
            <p className="text-xs text-muted-foreground">
              Hide window on startup, show only in system tray
            </p>
          </div>
          <Switch
            id="start-minimized"
            checked={settings.start_minimized}
            onCheckedChange={handleStartMinimizedChange}
          />
        </div>

        {/* Minimize to Tray */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="minimize-to-tray" className="text-sm font-medium">
              Minimize to tray on close
            </Label>
            <p className="text-xs text-muted-foreground">
              Keep running in background when window is closed
            </p>
          </div>
          <Switch
            id="minimize-to-tray"
            checked={settings.minimize_to_tray}
            onCheckedChange={handleMinimizeToTrayChange}
          />
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="theme" className="text-sm font-medium">
              Theme
            </Label>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>
          <Select value={settings.theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">🌙 Dark</SelectItem>
              <SelectItem value="light">☀️ Light</SelectItem>
              <SelectItem value="system">💻 System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Track Window Titles */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="track-titles" className="text-sm font-medium">
              Track window titles
            </Label>
            <p className="text-xs text-muted-foreground">
              Record window titles for more detailed activity tracking
            </p>
          </div>
          <Switch
            id="track-titles"
            checked={settings.track_window_titles}
            onCheckedChange={handleTrackWindowTitlesChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}