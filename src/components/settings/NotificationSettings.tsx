import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import type { AppSettings } from '@/hooks/useSettings';

interface NotificationSettingsProps {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => Promise<boolean>;
}

export function NotificationSettings({ settings, onUpdate }: NotificationSettingsProps) {
  const handleNotificationsEnabledChange = (checked: boolean) => {
    onUpdate({ notifications_enabled: checked });
  };

  const handleBreakReminderChange = (checked: boolean) => {
    onUpdate({ break_reminder_enabled: checked });
  };

  const handleBreakIntervalChange = (value: number[]) => {
    // Convert minutes to milliseconds
    onUpdate({ break_reminder_interval: value[0] * 60 * 1000 });
  };

  const handleLimitExceededChange = (checked: boolean) => {
    onUpdate({ limit_exceeded_notification: checked });
  };

  const handleDailySummaryChange = (checked: boolean) => {
    onUpdate({ daily_summary_notification: checked });
  };

  const handleSoundChange = (checked: boolean) => {
    onUpdate({ notification_sound: checked });
  };

  // Convert ms to minutes for display
  const breakIntervalMinutes = Math.round(settings.break_reminder_interval / 60000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          Notifications
        </CardTitle>
        <CardDescription>
          Configure alerts and reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master notification toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notifications-enabled" className="text-sm font-medium">
              Enable all notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Master switch for all notification types
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={settings.notifications_enabled}
            onCheckedChange={handleNotificationsEnabledChange}
          />
        </div>

        {/* Break Reminder */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="break-reminder" className="text-sm font-medium">
                Break reminders
              </Label>
              <p className="text-xs text-muted-foreground">
                Get reminded to take regular breaks
              </p>
            </div>
            <Switch
              id="break-reminder"
              checked={settings.break_reminder_enabled}
              onCheckedChange={handleBreakReminderChange}
              disabled={!settings.notifications_enabled}
            />
          </div>

          <div className="space-y-2 pl-0">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-muted-foreground">
                Remind every
              </Label>
              <span className="text-sm text-muted-foreground">
                {breakIntervalMinutes} minutes
              </span>
            </div>
            <Slider
              min={30}
              max={120}
              step={5}
              value={[breakIntervalMinutes]}
              onValueChange={handleBreakIntervalChange}
              disabled={!settings.notifications_enabled || !settings.break_reminder_enabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How often to remind you to take a break (30-120 minutes)
            </p>
          </div>
        </div>

        {/* Limit Exceeded Notification */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="limit-exceeded" className="text-sm font-medium">
              Limit exceeded alerts
            </Label>
            <p className="text-xs text-muted-foreground">
              Notify when category time limits are reached
            </p>
          </div>
          <Switch
            id="limit-exceeded"
            checked={settings.limit_exceeded_notification}
            onCheckedChange={handleLimitExceededChange}
            disabled={!settings.notifications_enabled}
          />
        </div>

        {/* Daily Summary */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="daily-summary" className="text-sm font-medium">
              Daily summary
            </Label>
            <p className="text-xs text-muted-foreground">
              Receive a summary of your daily activity
            </p>
          </div>
          <Switch
            id="daily-summary"
            checked={settings.daily_summary_notification}
            onCheckedChange={handleDailySummaryChange}
            disabled={!settings.notifications_enabled}
          />
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="sound" className="text-sm font-medium">
              Notification sound
            </Label>
            <p className="text-xs text-muted-foreground">
              Play a sound when notifications appear
            </p>
          </div>
          <Switch
            id="sound"
            checked={settings.notification_sound}
            onCheckedChange={handleSoundChange}
            disabled={!settings.notifications_enabled}
          />
        </div>

        {/* Info box */}
        {!settings.notifications_enabled && (
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              All notifications are currently disabled.
              Enable the master switch above to configure individual notifications.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}