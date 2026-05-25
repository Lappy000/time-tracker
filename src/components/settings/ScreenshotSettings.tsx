import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Camera, Shield, Trash2 } from 'lucide-react';
import { useScreenshots, type ScreenshotSettings as ScreenshotSettingsType } from '@/hooks';

export function ScreenshotSettings() {
  const { settings, updateSettings, deleteOld, stats, fetchStats } = useScreenshots();
  const [newPrivateApp, setNewPrivateApp] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleEnabledChange = async (enabled: boolean) => {
    await updateSettings({ screenshots_enabled: enabled });
  };

  const handleIntervalChange = async (value: number[]) => {
    // Convert minutes to milliseconds
    await updateSettings({ screenshots_interval: value[0] * 60 * 1000 });
  };

  const handleQualityChange = async (value: number[]) => {
    await updateSettings({ screenshots_quality: value[0] });
  };

  const handleRetentionChange = async (value: number[]) => {
    await updateSettings({ screenshots_retention_days: value[0] });
  };

  const handleAddPrivateApp = async () => {
    if (!newPrivateApp.trim()) return;
    
    const updatedList = [...settings.screenshots_private_apps, newPrivateApp.trim()];
    await updateSettings({ screenshots_private_apps: updatedList });
    setNewPrivateApp('');
  };

  const handleRemovePrivateApp = async (appToRemove: string) => {
    const updatedList = settings.screenshots_private_apps.filter(app => app !== appToRemove);
    await updateSettings({ screenshots_private_apps: updatedList });
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    const deleted = await deleteOld(settings.screenshots_retention_days);
    setIsCleaningUp(false);
    fetchStats();
  };

  // Convert ms to minutes for display
  const intervalMinutes = Math.round(settings.screenshots_interval / 60000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Screenshots
        </CardTitle>
        <CardDescription>
          Configure automatic screenshot capture (opt-in for privacy)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="screenshots-enabled" className="text-sm font-medium">
              Enable screenshots
            </Label>
            <p className="text-xs text-muted-foreground">
              Capture periodic screenshots of your active window
            </p>
          </div>
          <Switch
            id="screenshots-enabled"
            checked={settings.screenshots_enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {/* Interval Setting */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Capture interval</Label>
            <span className="text-sm text-muted-foreground">
              {intervalMinutes} minute{intervalMinutes !== 1 ? 's' : ''}
            </span>
          </div>
          <Slider
            min={1}
            max={30}
            step={1}
            value={[intervalMinutes]}
            onValueChange={handleIntervalChange}
            disabled={!settings.screenshots_enabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            How often to capture screenshots (1-30 minutes)
          </p>
        </div>

        {/* Quality Setting */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Image quality</Label>
            <span className="text-sm text-muted-foreground">
              {settings.screenshots_quality}%
            </span>
          </div>
          <Slider
            min={30}
            max={100}
            step={5}
            value={[settings.screenshots_quality]}
            onValueChange={handleQualityChange}
            disabled={!settings.screenshots_enabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Lower quality = smaller file sizes (30-100%)
          </p>
        </div>

        {/* Retention Setting */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Keep screenshots for</Label>
            <span className="text-sm text-muted-foreground">
              {settings.screenshots_retention_days} day{settings.screenshots_retention_days !== 1 ? 's' : ''}
            </span>
          </div>
          <Slider
            min={1}
            max={30}
            step={1}
            value={[settings.screenshots_retention_days]}
            onValueChange={handleRetentionChange}
            disabled={!settings.screenshots_enabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Older screenshots will be automatically deleted (1-30 days)
          </p>
        </div>

        {/* Private Apps List */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Private applications</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Screenshots will never be taken for these applications
          </p>
          
          {/* Current private apps */}
          <div className="flex flex-wrap gap-2">
            {settings.screenshots_private_apps.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No private apps configured</span>
            ) : (
              settings.screenshots_private_apps.map((app, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {app}
                  <button
                    onClick={() => handleRemovePrivateApp(app)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          
          {/* Add new private app */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Application name (e.g., 1Password)"
              value={newPrivateApp}
              onChange={(e) => setNewPrivateApp(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPrivateApp()}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleAddPrivateApp}
              disabled={!newPrivateApp.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Storage Info & Cleanup */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Storage</Label>
              <p className="text-xs text-muted-foreground">
                {stats?.total || 0} screenshots stored
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanup}
              disabled={isCleaningUp}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isCleaningUp ? 'Cleaning...' : 'Clean up old'}
            </Button>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="rounded-lg bg-muted/50 p-4 mt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Privacy Notice</p>
              <p className="text-xs text-muted-foreground">
                Screenshots are stored locally on your computer and are never uploaded anywhere.
                You have full control over which applications are excluded and how long screenshots are kept.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}