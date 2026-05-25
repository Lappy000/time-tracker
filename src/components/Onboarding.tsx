// time-tracker/src/components/Onboarding.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useIpc } from '@/hooks';
import { themes, applyTheme, type Theme } from '@/lib/themes';
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  Shield,
  Palette,
  Target,
  Rocket,
  Check
} from 'lucide-react';

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

export function Onboarding({ open, onComplete }: OnboardingProps) {
  const { invoke, channels } = useIpc();
  const [step, setStep] = useState(0);
  
  // Settings state
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [dailyGoal, setDailyGoal] = useState(8);
  const [enableScreenshots, setEnableScreenshots] = useState(true);
  const [screenshotInterval, setScreenshotInterval] = useState(5);
  const [autoStart, setAutoStart] = useState(true);
  const [excludedApps, setExcludedApps] = useState<string[]>([]);
  const [newExcluded, setNewExcluded] = useState('');

  const steps = [
    { title: 'Welcome', icon: Rocket },
    { title: 'Goals', icon: Target },
    { title: 'Privacy', icon: Shield },
    { title: 'Theme', icon: Palette },
    { title: 'Ready', icon: Check },
  ];

  // Apply theme preview when selecting
  useEffect(() => {
    applyTheme(selectedTheme);
  }, [selectedTheme]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = async () => {
    await invoke(channels.APP.SET_ONBOARDING_COMPLETE, true);
    onComplete();
  };

  const handleComplete = async () => {
    // Save all settings
    try {
      // Save theme
      await invoke(channels.THEMES.SET_THEME, selectedTheme);
      
      // Save goal (create a daily productive hours goal)
      await invoke(channels.GOALS.CREATE, {
        name: 'Daily Productive Time',
        goal_type: 'productive_time',
        target_value: dailyGoal * 60 * 60, // Convert to seconds
        period: 'daily',
        is_active: true
      });
      
      // Save screenshot settings
      await invoke(channels.SETTINGS.UPDATE, {
        screenshots_enabled: enableScreenshots,
        screenshot_interval: screenshotInterval
      } as any);
      
      // Save auto start
      await invoke(channels.SETTINGS.UPDATE, {
        auto_start: autoStart,
        start_tracking_on_launch: autoStart
      } as any);
      
      // Save excluded apps
      for (const app of excludedApps) {
        await invoke(channels.PRIVACY.ADD_EXCLUDED_APP, app);
      }
      
      // Mark onboarding as completed
      await invoke(channels.APP.SET_ONBOARDING_COMPLETE, true);
      
      onComplete();
    } catch (error) {
      console.error('Error saving onboarding settings:', error);
      onComplete();
    }
  };

  const addExcludedApp = () => {
    if (newExcluded.trim() && !excludedApps.includes(newExcluded.trim())) {
      setExcludedApps([...excludedApps, newExcluded.trim()]);
      setNewExcluded('');
    }
  };

  const removeExcludedApp = (app: string) => {
    setExcludedApps(excludedApps.filter(a => a !== app));
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-secondary">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-2 p-4 border-b">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                  i === step
                    ? 'bg-primary text-primary-foreground'
                    : i < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.title}</span>
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome to Time Tracker</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your personal productivity companion. Track your time, set goals, 
                  and understand how you spend your day.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
                <FeatureCard
                  icon={<Clock className="h-6 w-6" />}
                  title="Automatic Tracking"
                  description="Tracks your app usage automatically in the background"
                />
                <FeatureCard
                  icon={<Target className="h-6 w-6" />}
                  title="Set Goals"
                  description="Define productive time goals and track progress"
                />
                <FeatureCard
                  icon={<Shield className="h-6 w-6" />}
                  title="Privacy First"
                  description="Your data stays on your device, always private"
                />
              </div>
            </div>
          )}

          {/* Step 1: Goals */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Set Your Daily Goal</h2>
                <p className="text-muted-foreground">
                  How many productive hours do you want to achieve each day?
                </p>
              </div>
              
              <div className="max-w-sm mx-auto space-y-8">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">
                    {dailyGoal}
                  </div>
                  <div className="text-muted-foreground">hours per day</div>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1h</span>
                    <span>6h</span>
                    <span>12h</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[4, 6, 8].map(hours => (
                    <Button
                      key={hours}
                      variant={dailyGoal === hours ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDailyGoal(hours)}
                    >
                      {hours} hours
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Privacy */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Privacy Settings</h2>
                <p className="text-muted-foreground">
                  Configure what and how we track
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                {/* Screenshots */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Screenshots</Label>
                    <p className="text-sm text-muted-foreground">
                      Periodically capture screen for activity review
                    </p>
                  </div>
                  <Switch
                    checked={enableScreenshots}
                    onCheckedChange={setEnableScreenshots}
                  />
                </div>

                {enableScreenshots && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                    <Label>Screenshot Interval: {screenshotInterval} minutes</Label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={screenshotInterval}
                      onChange={(e) => setScreenshotInterval(parseInt(e.target.value))}
                      className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                )}

                {/* Auto start */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Start on System Boot</Label>
                    <p className="text-sm text-muted-foreground">
                      Launch Time Tracker when you start your computer
                    </p>
                  </div>
                  <Switch
                    checked={autoStart}
                    onCheckedChange={setAutoStart}
                  />
                </div>

                {/* Excluded apps */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-base">Excluded Apps</Label>
                    <p className="text-sm text-muted-foreground">
                      Apps that won't be tracked (e.g., password managers)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter app name..."
                      value={newExcluded}
                      onChange={(e) => setNewExcluded(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addExcludedApp()}
                    />
                    <Button onClick={addExcludedApp} variant="outline">
                      Add
                    </Button>
                  </div>

                  {excludedApps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {excludedApps.map(app => (
                        <span
                          key={app}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded-md text-sm"
                        >
                          {app}
                          <button
                            onClick={() => removeExcludedApp(app)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Theme */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Choose Your Theme</h2>
                <p className="text-muted-foreground">
                  Pick a color scheme that suits your style
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto">
                {themes.map(theme => (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    isSelected={selectedTheme === theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Ready */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Time Tracker is ready to help you be more productive. 
                  Your settings have been saved.
                </p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 max-w-sm mx-auto text-left space-y-2">
                <h3 className="font-medium mb-3">Your Settings Summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Daily Goal:</span>
                  <span>{dailyGoal} productive hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Screenshots:</span>
                  <span>{enableScreenshots ? `Every ${screenshotInterval} min` : 'Disabled'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Auto Start:</span>
                  <span>{autoStart ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Theme:</span>
                  <span>{themes.find(t => t.id === selectedTheme)?.name}</span>
                </div>
                {excludedApps.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Excluded Apps:</span>
                    <span>{excludedApps.length} app(s)</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                You can change these settings anytime from the Settings page.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Setup
          </Button>
          
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            {step < steps.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                Get Started
                <Rocket className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Feature card component
function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-secondary/50 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-3 text-primary">
        {icon}
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// Theme option component
function ThemeOption({ 
  theme, 
  isSelected, 
  onClick 
}: { 
  theme: Theme; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-transparent hover:border-border'
      )}
    >
      <div 
        className="aspect-video rounded-md overflow-hidden"
        style={{ backgroundColor: theme.colors.background }}
      >
        <div className="p-2 h-full flex flex-col">
          <div 
            className="w-full h-2 rounded mb-1"
            style={{ backgroundColor: theme.colors.primary }}
          />
          <div 
            className="flex-1 rounded"
            style={{ backgroundColor: theme.colors.card }}
          >
            <div 
              className="w-1/2 h-1 m-1 rounded"
              style={{ backgroundColor: theme.colors.muted }}
            />
          </div>
        </div>
      </div>
      <div className="mt-1 text-xs font-medium truncate">{theme.name}</div>
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
    </button>
  );
}