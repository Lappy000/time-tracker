import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GeneralSettings,
  IdleSettings,
  LimitSettings,
  NotificationSettings,
  ScreenshotSettings,
  PrivacySettings,
  ShortcutsSettings,
  ThemesSettings
} from '@/components/settings';
import { useSettings, useCategories, useLimits, useIpc } from '@/hooks';
import {
  Info,
  ExternalLink,
  Github,
  Heart,
  RefreshCw
} from 'lucide-react';

interface IdleState {
  isIdle: boolean;
  idleTime: number;
}

export function SettingsPage() {
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const { categories, loading: categoriesLoading } = useCategories();
  const { limits, upsertLimit, deleteLimit, loading: limitsLoading } = useLimits();
  const { on, channels, invoke } = useIpc();
  
  const [idleState, setIdleState] = useState<IdleState>({
    isIdle: false,
    idleTime: 0
  });
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  // Get app version
  useEffect(() => {
    invoke<string>(channels.APP.GET_VERSION).then(result => {
      if (result.success && result.data) {
        setAppVersion(result.data);
      }
    });
  }, [invoke, channels]);

  // Listen for idle state changes
  useEffect(() => {
    const unsubscribe = on(channels.TRACKING.IDLE_CHANGED, (data: unknown) => {
      const idleData = data as { isIdle: boolean; idleTime: number };
      setIdleState({
        isIdle: idleData.isIdle,
        idleTime: idleData.idleTime
      });
    });
    return unsubscribe;
  }, [on, channels]);

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    // Simulate update check (in real app, this would check with server)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCheckingUpdates(false);
    // Show notification that app is up to date
  };

  const isLoading = settingsLoading || categoriesLoading || limitsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure application preferences
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure application preferences and behavior
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Section A: General */}
        <section>
          <GeneralSettings
            settings={settings}
            onUpdate={updateSettings}
          />
        </section>

        <Separator />

        {/* Section B: Idle Detection */}
        <section>
          <IdleSettings
            settings={settings}
            onUpdate={updateSettings}
            isIdle={idleState.isIdle}
            idleTime={idleState.idleTime}
          />
        </section>

        <Separator />

        {/* Section C: Category Limits */}
        <section>
          <LimitSettings
            categories={categories}
            limits={limits}
            onUpsertLimit={upsertLimit}
            onDeleteLimit={deleteLimit}
          />
        </section>

        <Separator />

        {/* Section D: Notifications */}
        <section>
          <NotificationSettings
            settings={settings}
            onUpdate={updateSettings}
          />
        </section>

        <Separator />

        {/* Section E: Screenshots */}
        <section>
          <ScreenshotSettings />
        </section>

        <Separator />

        {/* Section F: Privacy */}
        <section>
          <PrivacySettings />
        </section>

        <Separator />

        {/* Section G: Keyboard Shortcuts */}
        <section>
          <ShortcutsSettings />
        </section>

        <Separator />

        {/* Section H: Themes */}
        <section>
          <ThemesSettings />
        </section>

        <Separator />

        {/* Section I: About */}
        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                <CardTitle>About Time Tracker</CardTitle>
              </div>
              <CardDescription>
                Application information and credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Version info */}
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <div className="font-medium">Time Tracker</div>
                  <div className="text-sm text-muted-foreground">Version {appVersion}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdates}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
                  {checkingUpdates ? 'Checking...' : 'Check for Updates'}
                </Button>
              </div>

              {/* Description */}
              <div>
                <p className="text-sm text-muted-foreground">
                  Time Tracker is a comprehensive productivity application designed to help you
                  understand and optimize how you spend your time. Track your app usage, set goals,
                  and gain insights into your work patterns.
                </p>
              </div>

              {/* Features */}
              <div>
                <h4 className="text-sm font-medium mb-2">Key Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automatic window and application tracking</li>
                  <li>• Customizable categories and productivity scoring</li>
                  <li>• Goals with daily, weekly, and monthly tracking</li>
                  <li>• Focus mode with Pomodoro timer</li>
                  <li>• Project time tracking and billing</li>
                  <li>• Privacy-first design with local data storage</li>
                </ul>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/time-tracker/time-tracker" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://time-tracker.app/docs" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentation
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://time-tracker.app/privacy" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Privacy Policy
                  </a>
                </Button>
              </div>

              {/* Credits */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Made with <Heart className="h-3 w-3 text-red-500" /> by the Time Tracker Team
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  © 2024 Time Tracker. All rights reserved.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer info */}
      <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
        <p>Settings are saved automatically when changed.</p>
        <p className="mt-1">
          Keyboard shortcut: <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Alt+S</kbd> to navigate to settings
        </p>
      </div>
    </div>
  );
}