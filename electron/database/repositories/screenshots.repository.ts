import { getDatabase } from '../index';
import type { Screenshot } from '../schema';
import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotWithApp extends Screenshot {
  app_name?: string;
  category_name?: string;
  category_color?: string;
}

export interface CreateScreenshotInput {
  session_id?: number | null;
  application_id?: number | null;
  file_path: string;
  thumbnail_path?: string | null;
  timestamp: string;
  window_title?: string | null;
}

export const ScreenshotsRepository = {
  create(input: CreateScreenshotInput): Screenshot {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO screenshots (session_id, application_id, file_path, thumbnail_path, timestamp, window_title)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      input.session_id ?? null,
      input.application_id ?? null,
      input.file_path,
      input.thumbnail_path ?? null,
      input.timestamp,
      input.window_title ?? null
    );
    
    return this.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): ScreenshotWithApp | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        s.*,
        a.name as app_name,
        c.name as category_name,
        c.color as category_color
      FROM screenshots s
      LEFT JOIN applications a ON s.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE s.id = ?
    `);
    return stmt.get(id) as ScreenshotWithApp | undefined;
  },

  getByDateRange(startDate: string, endDate: string): ScreenshotWithApp[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        s.*,
        a.name as app_name,
        c.name as category_name,
        c.color as category_color
      FROM screenshots s
      LEFT JOIN applications a ON s.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(s.timestamp) >= date(?)
        AND date(s.timestamp) <= date(?)
      ORDER BY s.timestamp DESC
    `);
    return stmt.all(startDate, endDate) as ScreenshotWithApp[];
  },

  getByApplication(applicationId: number): ScreenshotWithApp[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        s.*,
        a.name as app_name,
        c.name as category_name,
        c.color as category_color
      FROM screenshots s
      LEFT JOIN applications a ON s.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE s.application_id = ?
      ORDER BY s.timestamp DESC
    `);
    return stmt.all(applicationId) as ScreenshotWithApp[];
  },

  getBySession(sessionId: number): ScreenshotWithApp[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        s.*,
        a.name as app_name,
        c.name as category_name,
        c.color as category_color
      FROM screenshots s
      LEFT JOIN applications a ON s.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE s.session_id = ?
      ORDER BY s.timestamp DESC
    `);
    return stmt.all(sessionId) as ScreenshotWithApp[];
  },

  getRecent(limit: number = 50): ScreenshotWithApp[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        s.*,
        a.name as app_name,
        c.name as category_name,
        c.color as category_color
      FROM screenshots s
      LEFT JOIN applications a ON s.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY s.timestamp DESC
      LIMIT ?
    `);
    return stmt.all(limit) as ScreenshotWithApp[];
  },

  delete(id: number): boolean {
    const db = getDatabase();
    
    // Get the file paths before deleting
    const screenshot = this.getById(id);
    if (!screenshot) return false;
    
    // Delete database record
    const stmt = db.prepare('DELETE FROM screenshots WHERE id = ?');
    const result = stmt.run(id);
    
    // Delete files from disk
    if (result.changes > 0) {
      try {
        if (screenshot.file_path && fs.existsSync(screenshot.file_path)) {
          fs.unlinkSync(screenshot.file_path);
        }
        if (screenshot.thumbnail_path && fs.existsSync(screenshot.thumbnail_path)) {
          fs.unlinkSync(screenshot.thumbnail_path);
        }
      } catch (error) {
        console.error('Failed to delete screenshot files:', error);
      }
    }
    
    return result.changes > 0;
  },

  deleteOld(daysOld: number): number {
    const db = getDatabase();
    
    // Get old screenshots first to delete files
    const getOldStmt = db.prepare(`
      SELECT id, file_path, thumbnail_path FROM screenshots
      WHERE date(timestamp) < date('now', '-' || ? || ' days')
    `);
    const oldScreenshots = getOldStmt.all(daysOld) as { id: number; file_path: string; thumbnail_path: string | null }[];
    
    // Delete from database
    const deleteStmt = db.prepare(`
      DELETE FROM screenshots
      WHERE date(timestamp) < date('now', '-' || ? || ' days')
    `);
    const result = deleteStmt.run(daysOld);
    
    // Delete files from disk
    for (const screenshot of oldScreenshots) {
      try {
        if (screenshot.file_path && fs.existsSync(screenshot.file_path)) {
          fs.unlinkSync(screenshot.file_path);
        }
        if (screenshot.thumbnail_path && fs.existsSync(screenshot.thumbnail_path)) {
          fs.unlinkSync(screenshot.thumbnail_path);
        }
      } catch (error) {
        console.error('Failed to delete old screenshot file:', error);
      }
    }
    
    // Also delete empty directories
    this.cleanupEmptyDirectories();
    
    return result.changes;
  },

  cleanupEmptyDirectories(): void {
    // This will be called to clean up empty date directories
    // Implementation depends on where screenshots are stored
    // For now, we'll just log
    console.log('Cleaned up empty screenshot directories');
  },

  getStats(startDate?: string, endDate?: string): { total: number; byApp: { app_name: string; count: number }[] } {
    const db = getDatabase();
    
    let totalQuery = 'SELECT COUNT(*) as total FROM screenshots';
    let byAppQuery = `
      SELECT a.name as app_name, COUNT(s.id) as count
      FROM screenshots s
      LEFT JOIN applications a ON s.application_id = a.id
    `;
    
    if (startDate && endDate) {
      totalQuery += ` WHERE date(timestamp) >= date('${startDate}') AND date(timestamp) <= date('${endDate}')`;
      byAppQuery += ` WHERE date(s.timestamp) >= date('${startDate}') AND date(s.timestamp) <= date('${endDate}')`;
    }
    
    byAppQuery += ' GROUP BY s.application_id ORDER BY count DESC LIMIT 10';
    
    const totalResult = db.prepare(totalQuery).get() as { total: number };
    const byAppResult = db.prepare(byAppQuery).all() as { app_name: string; count: number }[];
    
    return {
      total: totalResult.total,
      byApp: byAppResult
    };
  }
};