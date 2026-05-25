// time-tracker/electron/database/repositories/privacy.repository.ts
import { getDatabase } from '../index';
import type { ExcludedApp, ExcludedPattern, TimeEntry, Application, Session } from '../schema';

// Types for creating privacy entities
export interface CreateExcludedAppInput {
  app_name: string;
}

export interface CreateExcludedPatternInput {
  pattern: string;
  pattern_type: 'window_title' | 'url';
  is_regex?: boolean;
}

// Export data structure
export interface ExportedData {
  exportDate: string;
  version: string;
  sessions: Session[];
  applications: Application[];
  timeEntries: TimeEntry[];
  excludedApps: ExcludedApp[];
  excludedPatterns: ExcludedPattern[];
  settings: Record<string, string>;
}

export const PrivacyRepository = {
  // ==================== EXCLUDED APPS ====================
  
  /**
   * Get all excluded apps
   */
  getAllExcludedApps(): ExcludedApp[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM excluded_apps ORDER BY app_name ASC');
    return stmt.all() as ExcludedApp[];
  },

  /**
   * Get excluded app by ID
   */
  getExcludedAppById(id: number): ExcludedApp | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM excluded_apps WHERE id = ?');
    return stmt.get(id) as ExcludedApp | undefined;
  },

  /**
   * Get excluded app by name
   */
  getExcludedAppByName(appName: string): ExcludedApp | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM excluded_apps WHERE app_name = ?');
    return stmt.get(appName) as ExcludedApp | undefined;
  },

  /**
   * Check if an app is excluded
   */
  isAppExcluded(appName: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM excluded_apps WHERE LOWER(app_name) = LOWER(?)');
    const result = stmt.get(appName) as { count: number };
    return result.count > 0;
  },

  /**
   * Add an excluded app
   */
  addExcludedApp(input: CreateExcludedAppInput): ExcludedApp {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO excluded_apps (app_name, created_at)
      VALUES (?, datetime('now'))
    `);
    
    const result = stmt.run(input.app_name);
    return this.getExcludedAppById(result.lastInsertRowid as number)!;
  },

  /**
   * Remove an excluded app
   */
  removeExcludedApp(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM excluded_apps WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Remove excluded app by name
   */
  removeExcludedAppByName(appName: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM excluded_apps WHERE app_name = ?');
    const result = stmt.run(appName);
    return result.changes > 0;
  },

  // ==================== EXCLUDED PATTERNS ====================

  /**
   * Get all excluded patterns
   */
  getAllExcludedPatterns(): ExcludedPattern[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM excluded_patterns ORDER BY created_at DESC');
    const rows = stmt.all() as Array<{
      id: number;
      pattern: string;
      pattern_type: 'window_title' | 'url';
      is_regex: number;
      created_at: string;
    }>;
    
    return rows.map(row => ({
      ...row,
      is_regex: Boolean(row.is_regex)
    }));
  },

  /**
   * Get excluded pattern by ID
   */
  getExcludedPatternById(id: number): ExcludedPattern | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM excluded_patterns WHERE id = ?');
    const row = stmt.get(id) as {
      id: number;
      pattern: string;
      pattern_type: 'window_title' | 'url';
      is_regex: number;
      created_at: string;
    } | undefined;
    
    if (!row) return undefined;
    
    return {
      ...row,
      is_regex: Boolean(row.is_regex)
    };
  },

  /**
   * Check if a window title matches any excluded pattern
   */
  isWindowTitleExcluded(windowTitle: string): boolean {
    const patterns = this.getAllExcludedPatterns().filter(p => p.pattern_type === 'window_title');
    const lowerTitle = windowTitle.toLowerCase();
    
    for (const pattern of patterns) {
      if (pattern.is_regex) {
        try {
          const regex = new RegExp(pattern.pattern, 'i');
          if (regex.test(windowTitle)) return true;
        } catch {
          // Invalid regex, skip
        }
      } else {
        // Simple contains match (case insensitive)
        if (lowerTitle.includes(pattern.pattern.toLowerCase())) return true;
      }
    }
    
    return false;
  },

  /**
   * Add an excluded pattern
   */
  addExcludedPattern(input: CreateExcludedPatternInput): ExcludedPattern {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO excluded_patterns (pattern, pattern_type, is_regex, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      input.pattern,
      input.pattern_type,
      input.is_regex ? 1 : 0
    );
    
    return this.getExcludedPatternById(result.lastInsertRowid as number)!;
  },

  /**
   * Remove an excluded pattern
   */
  removeExcludedPattern(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM excluded_patterns WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // ==================== DATA MANAGEMENT ====================

  /**
   * Export all user data as JSON
   */
  exportAllData(): ExportedData {
    const db = getDatabase();
    
    // Get all sessions
    const sessions = db.prepare('SELECT * FROM sessions ORDER BY start_time DESC').all() as Session[];
    
    // Get all applications
    const applications = db.prepare('SELECT * FROM applications ORDER BY name ASC').all() as Application[];
    
    // Get all time entries
    const timeEntries = db.prepare('SELECT * FROM time_entries ORDER BY start_time DESC').all() as TimeEntry[];
    
    // Get excluded apps
    const excludedApps = this.getAllExcludedApps();
    
    // Get excluded patterns
    const excludedPatterns = this.getAllExcludedPatterns();
    
    // Get settings
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }
    
    return {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      sessions,
      applications,
      timeEntries,
      excludedApps,
      excludedPatterns,
      settings
    };
  },

  /**
   * Delete all tracking data (sessions, time entries, applications)
   * Does NOT delete settings or excluded apps/patterns
   */
  deleteAllTrackingData(): { deleted: { sessions: number; timeEntries: number; applications: number; screenshots: number } } {
    const db = getDatabase();
    
    // Get counts before deletion
    const sessionCount = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
    const entryCount = (db.prepare('SELECT COUNT(*) as count FROM time_entries').get() as { count: number }).count;
    const appCount = (db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number }).count;
    const screenshotCount = (db.prepare('SELECT COUNT(*) as count FROM screenshots').get() as { count: number }).count;
    
    // Delete in proper order (foreign key constraints)
    db.prepare('DELETE FROM time_entries').run();
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM applications').run();
    db.prepare('DELETE FROM screenshots').run();
    db.prepare('DELETE FROM daily_summaries').run();
    db.prepare('DELETE FROM goal_progress').run();
    db.prepare('DELETE FROM focus_sessions').run();
    
    return {
      deleted: {
        sessions: sessionCount,
        timeEntries: entryCount,
        applications: appCount,
        screenshots: screenshotCount
      }
    };
  },

  /**
   * Delete data older than specified days
   */
  deleteOldData(daysOld: number): { deleted: { sessions: number; timeEntries: number } } {
    if (daysOld <= 0) return { deleted: { sessions: 0, timeEntries: 0 } };
    
    const db = getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();
    
    // Delete old time entries
    const entryResult = db.prepare('DELETE FROM time_entries WHERE start_time < ?').run(cutoffStr);
    
    // Delete old sessions
    const sessionResult = db.prepare('DELETE FROM sessions WHERE start_time < ?').run(cutoffStr);
    
    // Delete old screenshots
    db.prepare('DELETE FROM screenshots WHERE timestamp < ?').run(cutoffStr);
    
    // Delete old daily summaries
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    db.prepare('DELETE FROM daily_summaries WHERE date < ?').run(cutoffDateStr);
    
    // Delete old goal progress
    db.prepare('DELETE FROM goal_progress WHERE date < ?').run(cutoffDateStr);
    
    // Delete old focus sessions
    db.prepare('DELETE FROM focus_sessions WHERE start_time < ?').run(cutoffStr);
    
    return {
      deleted: {
        sessions: sessionResult.changes,
        timeEntries: entryResult.changes
      }
    };
  },

  // ==================== PRIVACY MODE ====================

  /**
   * Get private mode status
   */
  getPrivateMode(): boolean {
    const db = getDatabase();
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'private_mode'");
    const row = stmt.get() as { value: string } | undefined;
    return row?.value === 'true';
  },

  /**
   * Set private mode status
   */
  setPrivateMode(enabled: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('private_mode', ?, datetime('now'))
    `);
    stmt.run(enabled ? 'true' : 'false');
  },

  /**
   * Get data retention days setting
   */
  getDataRetentionDays(): number {
    const db = getDatabase();
    const stmt = db.prepare("SELECT value FROM settings WHERE key = 'data_retention_days'");
    const row = stmt.get() as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0; // 0 means never delete
  },

  /**
   * Set data retention days setting
   */
  setDataRetentionDays(days: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('data_retention_days', ?, datetime('now'))
    `);
    stmt.run(days.toString());
  },

  /**
   * Apply data retention policy (delete old data based on setting)
   */
  applyDataRetention(): { deleted: { sessions: number; timeEntries: number } } {
    const retentionDays = this.getDataRetentionDays();
    if (retentionDays <= 0) {
      return { deleted: { sessions: 0, timeEntries: 0 } };
    }
    return this.deleteOldData(retentionDays);
  }
};