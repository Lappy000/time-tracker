// time-tracker/electron/main.ts
import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { registerIpcHandlers, cleanupIpcHandlers } from './ipc/handlers';
import { trackingService, screenshotService, notificationsService, setNotificationsServiceRef, shortcutsService } from './services';
import { createTray, destroyTray } from './tray';
import { SettingsRepository } from './database/repositories';
import { syncAutoLaunch, wasLaunchedAtLogin } from './auto-launch';

// Wire up the notifications service reference to tracking service
setNotificationsServiceRef(notificationsService);

// Extend Electron's App interface with custom quit flag
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Required for native modules like active-win
    },
    backgroundColor: '#0f172a',
    show: false
  });

  // Set main window for tracking service
  trackingService.setMainWindow(mainWindow);
  
  // Set main window for screenshot service
  screenshotService.setMainWindow(mainWindow);
  
  // Set main window for notifications service
  notificationsService.setMainWindow(mainWindow);

  // Create system tray
  createTray(mainWindow);

  mainWindow.once('ready-to-show', () => {
    const settings = SettingsRepository.getAppSettings();
    // Check if app was launched at login (with --hidden flag)
    const launchedAtLogin = wasLaunchedAtLogin();
    
    // Show window unless:
    // - App was launched at login (auto-start), OR
    // - User has "start minimized" setting enabled
    if (!launchedAtLogin && !settings.start_minimized) {
      mainWindow?.show();
    } else {
      console.log(`[Main] Starting minimized (launchedAtLogin: ${launchedAtLogin}, start_minimized: ${settings.start_minimized})`);
    }
  });

  // Handle minimize to tray
  mainWindow.on('close', (event) => {
    const settings = SettingsRepository.getAppSettings();
    if (settings.minimize_to_tray && !app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools can be opened manually with F12 or Ctrl+Shift+I
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window if a second instance is attempted
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Register custom protocol for screenshots before app is ready
  protocol.registerSchemesAsPrivileged([
    { scheme: 'local-file', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
  ]);

  app.whenReady().then(() => {
    // Register file protocol handler for local files (screenshots)
    protocol.handle('local-file', async (request) => {
      try {
        const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
        // A file-style Windows URL may include /C:/; POSIX needs its leading /.
        const normalizedPath = process.platform === 'win32' && /^\/[a-z]:[/\\]/i.test(filePath)
          ? filePath.slice(1)
          : filePath;
        if (!path.isAbsolute(normalizedPath)) {
          return new Response('Bad Request', { status: 400 });
        }
        // This protocol is for images, not the database or other userData files.
        const screenshotsPath = path.resolve(app.getPath('userData'), 'screenshots');
        const resolvedPath = path.resolve(normalizedPath);
        const isWithin = (directory: string, file: string): boolean => {
          const relativePath = path.relative(directory, file);
          return Boolean(relativePath) && relativePath !== '..' &&
            !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
        };
        if (!isWithin(screenshotsPath, resolvedPath)) {
          return new Response('Forbidden: path traversal blocked', { status: 403 });
        }

        // Resolve symlinks/junctions before authorizing the actual file target.
        const realRoot = await fs.promises.realpath(screenshotsPath);
        const realFile = await fs.promises.realpath(resolvedPath);
        if (!isWithin(realRoot, realFile)) {
          return new Response('Forbidden: path traversal blocked', { status: 403 });
        }
        return await net.fetch(pathToFileURL(realFile).href);
      } catch (error) {
        if (error instanceof URIError) {
          return new Response('Bad Request', { status: 400 });
        }
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
          return new Response('Not Found', { status: 404 });
        }
        console.error('Error loading local file:', error);
        return new Response('Error', { status: 500 });
      }
    });

    registerIpcHandlers();
    createWindow();
    
    // Start notification service (for break reminders, etc.)
    notificationsService.start();
    notificationsService.scheduleDailySummary();
    
    // Get settings for auto-start and screenshots
    const settings = SettingsRepository.getAppSettings();
    
    // Sync auto-launch setting with OS on startup
    // This ensures the Windows registry entry matches our stored setting
    syncAutoLaunch(settings.auto_start);
    
    // Start screenshot service if enabled
    if (settings.screenshots_enabled) {
      screenshotService.start();
    }
    
    // Auto-start tracking if enabled
    if (settings.auto_start) {
      trackingService.startTracking();
    }
    
    // Initialize shortcuts service
    if (mainWindow) {
      shortcutsService.setMainWindow(mainWindow);
    }
    shortcutsService.initialize();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

// Handle before-quit to allow actual quitting
app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', async () => {
  await trackingService.stopTracking();
  screenshotService.stop();
  notificationsService.stop();
  shortcutsService.unregisterAllShortcuts();
  destroyTray();
  cleanupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit on window close if minimize_to_tray is enabled
    const settings = SettingsRepository.getAppSettings();
    if (!settings.minimize_to_tray) {
      app.quit();
    }
  }
});