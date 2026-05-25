import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { AppSettings } from '@/hooks/useSettings';

interface IdleSettingsProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => Promise<boolean>;
  isIdle?: boolean;
  idleTime?: number;
}

export function IdleSettings({ settings, onUpdate, isIdle = false, idleTime = 0 }: IdleSettingsProps) {
  const handleIdleDetectionChange = (checked: boolean) => {
    onUpdate({ idle_detection_enabled: checked });
  };

  const handleIdleThresholdChange = (value: number[]) => {
    // Convert minutes to milliseconds
    onUpdate({ idle_threshold: value[0] * 60 * 1000 });
  };

  const handleIdleActionChange = (value: string) => {
    onUpdate({ idle_action: value as 'pause' | 'mark_idle' | 'ask' });
  };

  // Convert ms to minutes for display
  const idleThresholdMinutes = Math.round(settings.idle_threshold / 60000);
  const currentIdleMinutes = Math.round(idleTime / 60000);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">⏸️</span>
              Idle Detection
            </CardTitle>
            <CardDescription>
              Configure behavior when you're away from the computer
            </CardDescription>
          </div>
          {/* Current idle status indicator */}
          <Badge variant={isIdle ? 'destructive' : 'secondary'} className="h-7">
            {isIdle ? (
              <>🟡 Idle ({currentIdleMinutes}m)</>
            ) : (
              <>🟢 Active</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Idle Detection */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="idle-detection" className="text-sm font-medium">
              Enable idle detection
            </Label>
            <p className="text-xs text-muted-foreground">
              Detect when you're away from the computer
            </p>
          </div>
          <Switch
            id="idle-detection"
            checked={settings.idle_detection_enabled}
            onCheckedChange={handleIdleDetectionChange}
          />
        </div>

        {/* Idle Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="idle-threshold" className="text-sm font-medium">
              Idle threshold
            </Label>
            <span className="text-sm text-muted-foreground">
              {idleThresholdMinutes} minute{idleThresholdMinutes !== 1 ? 's' : ''}
            </span>
          </div>
          <Slider
            id="idle-threshold"
            min={5}
            max={30}
            step={1}
            value={[idleThresholdMinutes]}
            onValueChange={handleIdleThresholdChange}
            disabled={!settings.idle_detection_enabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Time without activity before you're considered idle (5-30 minutes)
          </p>
        </div>

        {/* Idle Action */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="idle-action" className="text-sm font-medium">
              Action when idle
            </Label>
            <p className="text-xs text-muted-foreground">
              What to do when idle time is detected
            </p>
          </div>
          <Select
            value={settings.idle_action}
            onValueChange={handleIdleActionChange}
            disabled={!settings.idle_detection_enabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pause">⏸️ Pause tracking</SelectItem>
              <SelectItem value="mark_idle">🏷️ Mark as idle</SelectItem>
              <SelectItem value="ask">❓ Ask user</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action descriptions */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Action Descriptions:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>
              <strong>Pause tracking:</strong> Stop tracking time until activity resumes
            </li>
            <li>
              <strong>Mark as idle:</strong> Continue tracking but mark time as idle
            </li>
            <li>
              <strong>Ask user:</strong> Show a prompt asking what to do with idle time
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}