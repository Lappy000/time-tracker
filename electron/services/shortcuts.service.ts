// time-tracker/electron/services/shortcuts.service.ts
import { globalShortcut, BrowserWindow } from 'electron';
import { getDatabase } from '../database';
import { IPC_CHANNELS } from '../ipc/channels';
import type { KeyboardShortcut, ShortcutId } from '../database/schema';
import { DEFAULT_SHORTCUTS } from '../database/schema';

export interface ShortcutConfig {
  id: ShortcutId;
  accelerator: string;
  is_enabled: boolean;
}

class ShortcutsService {
  private mainWindow: BrowserWindow | null = null;
  private registeredShortcuts: Set<string> = new Set();

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Initialize and register all shortcuts
   */
  initialize(): void {
    this.registerAllShortcuts();
  }

  /**
   * Get all shortcuts from database
   */
  getAllShortcuts(): KeyboardShortcut[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM keyboard_shortcuts ORDER BY id');
    const rows = stmt.all() as Array<{
      id: string;
      accelerator: string;
      is_enabled: number;
      updated_at: string;
    }>;

    return rows.map(row => ({
      ...row,
      is_enabled: Boolean(row.is_enabled)
    }));
  }

  /**
   * Get shortcut by ID
   */
  getShortcutById(id: ShortcutId): KeyboardShortcut | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM keyboard_shortcuts WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      accelerator: string;
      is_enabled: number;
      updated_at: string;
    } | undefined;

    if (!row) return undefined;

    return {
      ...row,
      is_enabled: Boolean(row.is_enabled)
    };
  }

  /**
   * Update a shortcut's accelerator
   */
  updateShortcut(id: ShortcutId, accelerator: string): KeyboardShortcut | undefined {
    const db = getDatabase();
    
    // Unregister old shortcut
    const oldShortcut = this.getShortcutById(id);
    if (oldShortcut) {
      this.unregisterShortcut(oldShortcut.accelerator);
    }

    // Update in database
    const stmt = db.prepare(`
      UPDATE keyboard_shortcuts
      SET accelerator = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(accelerator, id);

    // Register new shortcut if enabled
    const updatedShortcut = this.getShortcutById(id);
    if (updatedShortcut?.is_enabled) {
      this.registerShortcut(id, accelerator);
    }

    return updatedShortcut;
  }

  /**
   * Enable or disable a shortcut
   */
  setShortcutEnabled(id: ShortcutId, enabled: boolean): KeyboardShortcut | undefined {
    const db = getDatabase();
    
    const stmt = db.prepare(`
      UPDATE keyboard_shortcuts
      SET is_enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(enabled ? 1 : 0, id);

    const shortcut = this.getShortcutById(id);
    if (shortcut) {
      if (enabled) {
        this.registerShortcut(id, shortcut.accelerator);
      } else {
        this.unregisterShortcut(shortcut.accelerator);
      }
    }

    return shortcut;
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetAllShortcuts(): KeyboardShortcut[] {
    const db = getDatabase();
    
    // Unregister all current shortcuts
    this.unregisterAllShortcuts();

    // Reset to defaults
    for (const [id, accelerator] of Object.entries(DEFAULT_SHORTCUTS)) {
      const stmt = db.prepare(`
        UPDATE keyboard_shortcuts
        SET accelerator = ?, is_enabled = 1, updated_at = datetime('now')
        WHERE id = ?
      `);
      stmt.run(accelerator, id);
    }

    // Re-register all shortcuts
    this.registerAllShortcuts();

    return this.getAllShortcuts();
  }

  /**
   * Register all enabled shortcuts
   */
  private registerAllShortcuts(): void {
    const shortcuts = this.getAllShortcuts();
    
    for (const shortcut of shortcuts) {
      if (shortcut.is_enabled) {
        this.registerShortcut(shortcut.id as ShortcutId, shortcut.accelerator);
      }
    }
  }

  /**
   * Register a single keyboard shortcut
   */
  private registerShortcut(id: ShortcutId, accelerator: string): boolean {
    try {
      // Check if already registered
      if (this.registeredShortcuts.has(accelerator)) {
        return true;
      }

      const success = globalShortcut.register(accelerator, () => {
        this.handleShortcut(id);
      });

      if (success) {
        this.registeredShortcuts.add(accelerator);
        console.log(`Registered shortcut: ${id} -> ${accelerator}`);
      } else {
        console.warn(`Failed to register shortcut: ${id} -> ${accelerator}`);
      }

      return success;
    } catch (error) {
      console.error(`Error registering shortcut ${id}:`, error);
      return false;
    }
  }

  /**
   * Unregister a single keyboard shortcut
   */
  private unregisterShortcut(accelerator: string): void {
    try {
      if (globalShortcut.isRegistered(accelerator)) {
        globalShortcut.unregister(accelerator);
        this.registeredShortcuts.delete(accelerator);
        console.log(`Unregistered shortcut: ${accelerator}`);
      }
    } catch (error) {
      console.error(`Error unregistering shortcut ${accelerator}:`, error);
    }
  }

  /**
   * Unregister all shortcuts
   */
  unregisterAllShortcuts(): void {
    globalShortcut.unregisterAll();
    this.registeredShortcuts.clear();
    console.log('Unregistered all shortcuts');
  }

  /**
   * Handle shortcut trigger
   */
  private handleShortcut(id: ShortcutId): void {
    console.log(`Shortcut triggered: ${id}`);

    // Send event to renderer
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.SHORTCUTS.TRIGGERED, { id });
    }

    // Handle specific shortcuts
    switch (id) {
      case 'toggle_tracking':
        this.mainWindow?.webContents.send(IPC_CHANNELS.SHORTCUTS.TRIGGERED, { 
          id, 
          action: 'toggle_tracking' 
        });
        break;

      case 'toggle_private_mode':
        this.mainWindow?.webContents.send(IPC_CHANNELS.SHORTCUTS.TRIGGERED, { 
          id, 
          action: 'toggle_private_mode' 
        });
        break;

      case 'start_focus':
        this.mainWindow?.webContents.send(IPC_CHANNELS.SHORTCUTS.TRIGGERED, { 
          id, 
          action: 'start_focus' 
        });
        break;

      case 'take_screenshot':
        this.mainWindow?.webContents.send(IPC_CHANNELS.SHORTCUTS.TRIGGERED, { 
          id, 
          action: 'take_screenshot' 
        });
        break;

      case 'open_dashboard':
        // Show window and navigate to dashboard
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.webContents.send(IPC_CHANNELS.APP.NAVIGATE, 'dashboard');
        }
        break;

      case 'open_command_palette':
        // Show window and trigger command palette
        if (this.mainWindow) {
          this.mainWindow.show();
          this.mainWindow.focus();
          this.mainWindow.webContents.send(IPC_CHANNELS.SHORTCUTS.TRIGGERED, { 
            id, 
            action: 'open_command_palette' 
          });
        }
        break;
    }
  }

  /**
   * Check if current shortcut is valid and not conflicting
   */
  isAcceleratorValid(accelerator: string, excludeId?: ShortcutId): { valid: boolean; error?: string } {
    // Check for basic validity
    if (!accelerator || accelerator.trim() === '') {
      return { valid: false, error: 'Shortcut cannot be empty' };
    }

    // Check for conflicts with other registered shortcuts
    const shortcuts = this.getAllShortcuts();
    for (const shortcut of shortcuts) {
      if (shortcut.id !== excludeId && shortcut.accelerator === accelerator) {
        return { valid: false, error: `Shortcut already used by "${shortcut.id}"` };
      }
    }

    // Try to register temporarily to validate
    try {
      const testAccelerator = accelerator;
      if (globalShortcut.isRegistered(testAccelerator)) {
        return { valid: false, error: 'Shortcut is already registered by another application' };
      }
    } catch {
      return { valid: false, error: 'Invalid shortcut format' };
    }

    return { valid: true };
  }
}

// Singleton instance
export const shortcutsService = new ShortcutsService();