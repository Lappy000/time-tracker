// time-tracker/src/components/settings/PrivacySettings.tsx
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useIpc } from '@/hooks';
import { Shield, Plus, X, Download, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ExcludedApp {
  id: number;
  app_name: string;
  created_at: string;
}

interface ExcludedPattern {
  id: number;
  pattern: string;
  pattern_type: 'window_title' | 'url';
  is_regex: boolean;
  created_at: string;
}

interface TrackedApp {
  id: number;
  name: string;
}

export function PrivacySettings() {
  const { invoke, on, channels } = useIpc();
  
  // State
  const [privateMode, setPrivateMode] = useState(false);
  const [excludedApps, setExcludedApps] = useState<ExcludedApp[]>([]);
  const [excludedPatterns, setExcludedPatterns] = useState<ExcludedPattern[]>([]);
  const [dataRetentionDays, setDataRetentionDays] = useState(0);
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([]);
  
  // Input states
  const [newAppName, setNewAppName] = useState('');
  const [newPattern, setNewPattern] = useState('');
  const [newPatternType, setNewPatternType] = useState<'window_title' | 'url'>('window_title');
  const [newPatternIsRegex, setNewPatternIsRegex] = useState(false);
  
  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load private mode
      const privateModeResult = await invoke<boolean>(channels.PRIVACY.GET_PRIVATE_MODE);
      if (privateModeResult.success) {
        setPrivateMode(privateModeResult.data || false);
      }

      // Load excluded apps
      const appsResult = await invoke<ExcludedApp[]>(channels.PRIVACY.GET_EXCLUDED_APPS);
      if (appsResult.success) {
        setExcludedApps(appsResult.data || []);
      }

      // Load excluded patterns
      const patternsResult = await invoke<ExcludedPattern[]>(channels.PRIVACY.GET_EXCLUDED_PATTERNS);
      if (patternsResult.success) {
        setExcludedPatterns(patternsResult.data || []);
      }

      // Load data retention days
      const retentionResult = await invoke<number>(channels.PRIVACY.GET_DATA_RETENTION);
      if (retentionResult.success) {
        setDataRetentionDays(retentionResult.data || 0);
      }

      // Load tracked apps for the dropdown
      const trackedResult = await invoke<TrackedApp[]>(channels.APPLICATIONS.GET_ALL);
      if (trackedResult.success) {
        setTrackedApps(trackedResult.data || []);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [invoke, channels]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for private mode changes
  useEffect(() => {
    const unsubscribe = on(channels.PRIVACY.PRIVATE_MODE_CHANGED, (data: unknown) => {
      const { enabled } = data as { enabled: boolean };
      setPrivateMode(enabled);
    });
    return unsubscribe;
  }, [on, channels]);

  // Handlers
  const handlePrivateModeChange = async (enabled: boolean) => {
    const result = await invoke<boolean>(channels.PRIVACY.SET_PRIVATE_MODE, enabled);
    if (result.success) {
      setPrivateMode(enabled);
    }
  };

  const handleAddExcludedApp = async () => {
    if (!newAppName.trim()) return;
    
    const result = await invoke<ExcludedApp>(channels.PRIVACY.ADD_EXCLUDED_APP, { app_name: newAppName.trim() });
    if (result.success && result.data) {
      setExcludedApps(prev => [...prev, result.data!]);
      setNewAppName('');
    }
  };

  const handleRemoveExcludedApp = async (id: number) => {
    const result = await invoke<boolean>(channels.PRIVACY.REMOVE_EXCLUDED_APP, id);
    if (result.success) {
      setExcludedApps(prev => prev.filter(app => app.id !== id));
    }
  };

  const handleAddExcludedPattern = async () => {
    if (!newPattern.trim()) return;
    
    const result = await invoke<ExcludedPattern>(channels.PRIVACY.ADD_EXCLUDED_PATTERN, {
      pattern: newPattern.trim(),
      pattern_type: newPatternType,
      is_regex: newPatternIsRegex
    });
    if (result.success && result.data) {
      setExcludedPatterns(prev => [...prev, result.data!]);
      setNewPattern('');
      setNewPatternIsRegex(false);
    }
  };

  const handleRemoveExcludedPattern = async (id: number) => {
    const result = await invoke<boolean>(channels.PRIVACY.REMOVE_EXCLUDED_PATTERN, id);
    if (result.success) {
      setExcludedPatterns(prev => prev.filter(pattern => pattern.id !== id));
    }
  };

  const handleDataRetentionChange = async (value: string) => {
    const days = parseInt(value, 10);
    const result = await invoke<number>(channels.PRIVACY.SET_DATA_RETENTION, days);
    if (result.success) {
      setDataRetentionDays(days);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const result = await invoke<object>(channels.PRIVACY.EXPORT_ALL_DATA);
      if (result.success && result.data) {
        // Create and download JSON file
        const dataStr = JSON.stringify(result.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `time-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeleting(true);
    try {
      const result = await invoke<object>(channels.PRIVACY.DELETE_ALL_DATA);
      if (result.success) {
        setShowDeleteDialog(false);
        // Optionally show a success notification
      }
    } catch (error) {
      console.error('Failed to delete data:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectTrackedApp = (appName: string) => {
    setNewAppName(appName);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <span className="text-muted-foreground">Loading privacy settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control what data is tracked and how it's stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Private Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="private-mode" className="text-base font-medium">
                🔒 Private Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Temporarily pause all tracking. Quick toggle also available in system tray.
              </p>
            </div>
            <Switch
              id="private-mode"
              checked={privateMode}
              onCheckedChange={handlePrivateModeChange}
            />
          </div>

          {privateMode && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-500">Private mode is active. No activity is being tracked.</span>
            </div>
          )}

          {/* Excluded Apps */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Excluded Applications</Label>
            <p className="text-xs text-muted-foreground">
              These apps will never be tracked even when tracking is enabled.
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Type app name or select from tracked apps"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedApp()}
                className="flex-1"
              />
              <Select onValueChange={handleSelectTrackedApp}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select app" />
                </SelectTrigger>
                <SelectContent>
                  {trackedApps.slice(0, 20).map(app => (
                    <SelectItem key={app.id} value={app.name}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" onClick={handleAddExcludedApp}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-secondary/30 rounded-lg">
              {excludedApps.length === 0 ? (
                <span className="text-xs text-muted-foreground">No excluded apps</span>
              ) : (
                excludedApps.map(app => (
                  <Badge key={app.id} variant="secondary" className="gap-1">
                    {app.app_name}
                    <button
                      onClick={() => handleRemoveExcludedApp(app.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Excluded Patterns */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Excluded Window Title Patterns</Label>
            <p className="text-xs text-muted-foreground">
              Window titles containing these patterns won't be recorded (e.g., "Incognito", "Private", "password").
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Enter pattern (e.g., Incognito)"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedPattern()}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Switch
                  id="is-regex"
                  checked={newPatternIsRegex}
                  onCheckedChange={setNewPatternIsRegex}
                />
                <Label htmlFor="is-regex" className="text-xs">Regex</Label>
              </div>
              <Button size="icon" onClick={handleAddExcludedPattern}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-secondary/30 rounded-lg">
              {excludedPatterns.length === 0 ? (
                <span className="text-xs text-muted-foreground">No excluded patterns</span>
              ) : (
                excludedPatterns.map(pattern => (
                  <Badge key={pattern.id} variant="secondary" className="gap-1">
                    {pattern.is_regex && <span className="text-xs opacity-60">[regex]</span>}
                    {pattern.pattern}
                    <button
                      onClick={() => handleRemoveExcludedPattern(pattern.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Data Retention</Label>
            <p className="text-xs text-muted-foreground">
              Automatically delete tracking data older than the specified period.
            </p>
            
            <Select value={dataRetentionDays.toString()} onValueChange={handleDataRetentionChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Never delete</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Management */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Data Management</Label>
            
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleExportData}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export All Data'}
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Export downloads all your tracking data as JSON. Delete permanently removes all tracking history.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete All Data
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all tracking data? This action cannot be undone.
              This will delete all sessions, time entries, and application history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAllData}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Everything'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}