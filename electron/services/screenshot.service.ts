// time-tracker/electron/services/screenshot.service.ts
import { app, desktopCapturer, screen, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { ScreenshotsRepository, SettingsRepository, SessionRepository, ApplicationRepository } from '../database/repositories';
import { windowTracker } from './window-tracker.service';

export interface ScreenshotSettings {
  screenshots_enabled: boolean;
  screenshots_interval: number; // in milliseconds
  screenshots_quality: number; // 1-100
  screenshots_retention_days: number;
  screenshots_private_apps: string[];
}

export interface ScreenshotServiceState {
  isRunning: boolean;
  lastScreenshotTime: Date | null;
  screenshotCount: number;
}

class ScreenshotService {
  private intervalId: NodeJS.Timeout | null = null;
  private mainWindow: BrowserWindow | null = null;
  private state: ScreenshotServiceState = {
    isRunning: false,
    lastScreenshotTime: null,
    screenshotCount: 0
  };
  private screenshotsDir: string;

  constructor() {
    // Initialize screenshots directory path
    this.screenshotsDir = '';
  }

  private initScreenshotsDir(): void {
    if (!this.screenshotsDir) {
      const userDataPath = app.getPath('userData');
      this.screenshotsDir = path.join(userDataPath, 'screenshots');
      
      // Ensure base directory exists
      if (!fs.existsSync(this.screenshotsDir)) {
        fs.mkdirSync(this.screenshotsDir, { recursive: true });
      }
    }
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  getState(): ScreenshotServiceState {
    return { ...this.state };
  }

  getSettings(): ScreenshotSettings {
    const rawSettings = SettingsRepository.getAll();
    return {
      screenshots_enabled: rawSettings.screenshots_enabled === 'true',
      screenshots_interval: parseInt(rawSettings.screenshots_interval || '300000', 10),
      screenshots_quality: parseInt(rawSettings.screenshots_quality || '70', 10),
      screenshots_retention_days: parseInt(rawSettings.screenshots_retention_days || '7', 10),
      screenshots_private_apps: JSON.parse(rawSettings.screenshots_private_apps || '[]')
    };
  }

  updateSettings(updates: Partial<ScreenshotSettings>): void {
    if (updates.screenshots_enabled !== undefined) {
      SettingsRepository.set('screenshots_enabled', String(updates.screenshots_enabled));
    }
    if (updates.screenshots_interval !== undefined) {
      SettingsRepository.set('screenshots_interval', String(updates.screenshots_interval));
    }
    if (updates.screenshots_quality !== undefined) {
      SettingsRepository.set('screenshots_quality', String(updates.screenshots_quality));
    }
    if (updates.screenshots_retention_days !== undefined) {
      SettingsRepository.set('screenshots_retention_days', String(updates.screenshots_retention_days));
    }
    if (updates.screenshots_private_apps !== undefined) {
      SettingsRepository.set('screenshots_private_apps', JSON.stringify(updates.screenshots_private_apps));
    }

    // Restart if running to apply new interval
    if (this.state.isRunning && updates.screenshots_interval !== undefined) {
      this.stop();
      this.start();
    }
  }

  start(): void {
    const settings = this.getSettings();
    
    if (!settings.screenshots_enabled) {
      console.log('Screenshots disabled in settings');
      return;
    }

    if (this.state.isRunning) {
      console.log('Screenshot service already running');
      return;
    }

    this.initScreenshotsDir();
    this.state.isRunning = true;
    
    console.log(`Screenshot service started with interval: ${settings.screenshots_interval}ms`);

    // Take initial screenshot
    this.takeScreenshot();

    // Set up periodic screenshots
    this.intervalId = setInterval(() => {
      this.takeScreenshot();
    }, settings.screenshots_interval);

    // Clean up old screenshots on start
    this.cleanupOldScreenshots();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.isRunning = false;
    console.log('Screenshot service stopped');
  }

  private async takeScreenshot(): Promise<void> {
    try {
      const settings = this.getSettings();
      const windowState = windowTracker.getState();
      
      // Check if tracking is active
      if (!windowState.isTracking) {
        return;
      }

      // Get current app info
      const currentApp = windowState.currentApp;
      if (!currentApp) {
        return;
      }

      // Check if app is in private list
      if (this.isPrivateApp(currentApp.name, settings.screenshots_private_apps)) {
        console.log(`Skipping screenshot for private app: ${currentApp.name}`);
        return;
      }

      // Get all available sources (windows)
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1920, height: 1080 },
        fetchWindowIcons: false
      });

      // Try to find the active window
      let targetSource = sources.find(source => 
        source.name.toLowerCase().includes(currentApp.name.toLowerCase()) ||
        currentApp.title.toLowerCase().includes(source.name.toLowerCase())
      );

      // If not found, get primary screen
      if (!targetSource) {
        const screenSources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1920, height: 1080 }
        });
        targetSource = screenSources[0];
      }

      if (!targetSource || !targetSource.thumbnail) {
        console.log('No source found for screenshot');
        return;
      }

      // Get the thumbnail (already captured)
      const thumbnail = targetSource.thumbnail;
      
      // Create date-based directory
      const now = new Date();
      const dateDir = this.getDateDirectory(now);
      
      // Generate filename
      const sanitizedAppName = this.sanitizeFilename(currentApp.name);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      const filename = `${timeStr}_${sanitizedAppName}.png`;
      const thumbnailFilename = `${timeStr}_${sanitizedAppName}_thumb.png`;
      
      const filePath = path.join(dateDir, filename);
      const thumbnailPath = path.join(dateDir, thumbnailFilename);

      // Resize and compress main image
      const quality = settings.screenshots_quality;
      const resized = this.resizeImage(thumbnail, 1280, quality);
      
      // Create thumbnail (200px width)
      const thumbImage = this.resizeImage(thumbnail, 200, 60);

      // Save files
      fs.writeFileSync(filePath, resized);
      fs.writeFileSync(thumbnailPath, thumbImage);

      // Get session and application IDs
      const currentSession = SessionRepository.getCurrent();
      const application = currentApp.name ? 
        ApplicationRepository.findByName(currentApp.name) : null;

      // Save to database
      ScreenshotsRepository.create({
        session_id: currentSession?.id || null,
        application_id: application?.id || null,
        file_path: filePath,
        thumbnail_path: thumbnailPath,
        timestamp: now.toISOString(),
        window_title: currentApp.title || null
      });

      this.state.lastScreenshotTime = now;
      this.state.screenshotCount++;

      console.log(`Screenshot saved: ${filename}`);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  }

  private getDateDirectory(date: Date): string {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const dir = path.join(this.screenshotsDir, dateStr);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    return dir;
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 50);
  }

  private isPrivateApp(appName: string, privateApps: string[]): boolean {
    const lowerAppName = appName.toLowerCase();
    return privateApps.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      return lowerAppName.includes(lowerPattern) || lowerPattern.includes(lowerAppName);
    });
  }

  private resizeImage(image: Electron.NativeImage, maxWidth: number, quality: number): Buffer {
    const size = image.getSize();
    
    if (size.width <= maxWidth) {
      return image.toPNG();
    }
    
    const aspectRatio = size.height / size.width;
    const newWidth = maxWidth;
    const newHeight = Math.round(maxWidth * aspectRatio);
    
    const resized = image.resize({ width: newWidth, height: newHeight, quality: 'good' });
    
    // Convert to JPEG for better compression if quality is specified
    if (quality < 100) {
      return resized.toJPEG(quality);
    }
    
    return resized.toPNG();
  }

  async takeManualScreenshot(): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const settings = this.getSettings();
      const windowState = windowTracker.getState();
      
      const currentApp = windowState.currentApp || { name: 'manual', title: 'Manual screenshot' };

      // Get screen sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (!sources[0] || !sources[0].thumbnail) {
        return { success: false, error: 'No screen source available' };
      }

      const thumbnail = sources[0].thumbnail;
      const now = new Date();
      const dateDir = this.getDateDirectory(now);
      
      const sanitizedAppName = this.sanitizeFilename(currentApp.name);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      const filename = `${timeStr}_${sanitizedAppName}_manual.png`;
      
      const filePath = path.join(dateDir, filename);

      // Save full quality for manual screenshots
      const imageBuffer = thumbnail.toPNG();
      fs.writeFileSync(filePath, imageBuffer);

      // Save to database
      const currentSession = SessionRepository.getCurrent();
      const application = currentApp.name ? 
        ApplicationRepository.findByName(currentApp.name) : null;

      ScreenshotsRepository.create({
        session_id: currentSession?.id || null,
        application_id: application?.id || null,
        file_path: filePath,
        thumbnail_path: null,
        timestamp: now.toISOString(),
        window_title: currentApp.title || null
      });

      return { success: true, path: filePath };
    } catch (error) {
      console.error('Failed to take manual screenshot:', error);
      return { success: false, error: String(error) };
    }
  }

  private cleanupOldScreenshots(): void {
    const settings = this.getSettings();
    const deleted = ScreenshotsRepository.deleteOld(settings.screenshots_retention_days);
    
    if (deleted > 0) {
      console.log(`Cleaned up ${deleted} old screenshots`);
    }

    // Also clean up empty date directories
    this.cleanupEmptyDirectories();
  }

  private cleanupEmptyDirectories(): void {
    this.initScreenshotsDir();
    
    try {
      const dirs = fs.readdirSync(this.screenshotsDir);
      
      for (const dir of dirs) {
        const dirPath = path.join(this.screenshotsDir, dir);
        const stat = fs.statSync(dirPath);
        
        if (stat.isDirectory()) {
          const files = fs.readdirSync(dirPath);
          if (files.length === 0) {
            fs.rmdirSync(dirPath);
            console.log(`Removed empty directory: ${dir}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean up empty directories:', error);
    }
  }

  getScreenshotsDir(): string {
    this.initScreenshotsDir();
    return this.screenshotsDir;
  }
}

// Singleton instance
export const screenshotService = new ScreenshotService();