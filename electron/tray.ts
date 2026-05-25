// time-tracker/electron/tray.ts
import { Tray, Menu, nativeImage, app, BrowserWindow } from 'electron';
import path from 'path';
import { trackingService } from './services';

let tray: Tray | null = null;

/**
 * Get the correct path to an icon file, handling both development and packaged scenarios.
 * In packaged apps, resources are in process.resourcesPath/icons/
 * In development, they are in the project's resources/icons/ folder
 */
function getIconPath(iconName: string): string {
  if (app.isPackaged) {
    // In packaged app, extraResources are copied to process.resourcesPath
    return path.join(process.resourcesPath, 'icons', iconName);
  } else {
    // In development, relative to project root
    return path.join(__dirname, '..', 'resources', 'icons', iconName);
  }
}

// Create a simple tray icon using nativeImage
function createTrayIcon(): Electron.NativeImage {
  // Create a 16x16 icon programmatically
  // In production, use a real icon file
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  // Fill with a simple colored circle pattern
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 1;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      if (dist <= radius) {
        // Primary color (indigo-ish)
        canvas[idx] = 99;     // R
        canvas[idx + 1] = 102; // G
        canvas[idx + 2] = 241; // B
        canvas[idx + 3] = 255; // A
      } else {
        // Transparent
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function buildContextMenu(mainWindow: BrowserWindow | null): Electron.Menu {
  const trackingState = trackingService.getState();
  const isTracking = trackingState.isTracking;

  return Menu.buildFromTemplate([
    {
      label: 'Time Tracker',
      enabled: false,
      icon: createTrayIcon()
    },
    { type: 'separator' },
    {
      label: isTracking ? '⏹ Stop Tracking' : '▶ Start Tracking',
      click: async () => {
        if (isTracking) {
          await trackingService.stopTracking();
        } else {
          await trackingService.startTracking();
        }
        // Update the menu
        if (tray) {
          tray.setContextMenu(buildContextMenu(mainWindow));
        }
      }
    },
    {
      label: trackingState.currentApp 
        ? `📍 ${trackingState.currentApp.name}` 
        : '📍 No active app',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Hide Window',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          // Emit an event to navigate to settings page
          mainWindow.webContents.send('navigate', '/settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Force quit (bypass minimize to tray)
        app.quit();
      }
    }
  ]);
}

export function createTray(mainWindow: BrowserWindow): Tray {
  // Try to load icon from file, fallback to generated
  let icon: Electron.NativeImage;
  
  try {
    // First try the dedicated tray icon (futuristic clock design)
    const trayIconPath = getIconPath('tray-icon.png');
    console.log('[Tray] Looking for tray icon at:', trayIconPath);
    console.log('[Tray] App is packaged:', app.isPackaged);
    
    icon = nativeImage.createFromPath(trayIconPath);
    
    if (icon.isEmpty()) {
      // Fallback to general icon
      const iconPath = getIconPath('icon.png');
      console.log('[Tray] Tray icon not found, trying fallback at:', iconPath);
      icon = nativeImage.createFromPath(iconPath);
    }
    
    if (icon.isEmpty()) {
      console.log('[Tray] All icon paths failed, using generated icon');
      throw new Error('Icon not found');
    }
    
    console.log('[Tray] Icon loaded successfully');
    const originalSize = icon.getSize();
    console.log('[Tray] Original icon size:', originalSize.width, 'x', originalSize.height);
    
    // Resize for tray (16x16 on Windows, 32x32 for high DPI)
    // Using 'best' quality for crisp downscaling
    const traySize = process.platform === 'win32' ? 16 : 22;
    icon = icon.resize({ width: traySize, height: traySize, quality: 'best' });
    console.log('[Tray] Resized icon to:', traySize, 'x', traySize);
  } catch (error) {
    console.log('[Tray] Error loading icon:', error);
    icon = createTrayIcon();
  }

  tray = new Tray(icon);
  
  tray.setToolTip('Time Tracker');
  tray.setContextMenu(buildContextMenu(mainWindow));

  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });

  // Update menu periodically to reflect tracking status
  setInterval(() => {
    if (tray) {
      tray.setContextMenu(buildContextMenu(mainWindow));
      
      // Update tooltip with current status
      const state = trackingService.getState();
      if (state.isTracking && state.currentApp) {
        tray.setToolTip(`Time Tracker - ${state.currentApp.name}`);
      } else if (state.isTracking) {
        tray.setToolTip('Time Tracker - Tracking...');
      } else {
        tray.setToolTip('Time Tracker - Not tracking');
      }
    }
  }, 5000);

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

export function getTray(): Tray | null {
  return tray;
}