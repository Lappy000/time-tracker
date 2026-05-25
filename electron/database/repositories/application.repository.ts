import { getDatabase } from '../index';
import type { Application, Category } from '../schema';

export interface ApplicationWithCategory extends Application {
  category_name?: string;
  category_color?: string;
  category_productivity_score?: number;
}

export const ApplicationRepository = {
  findOrCreate(name: string, executablePath?: string, windowClass?: string): Application {
    const db = getDatabase();
    
    // Ensure name is never empty
    const sanitizedName = (name && name.trim()) ? name.trim() : 'Unknown Application';
    
    // Try to find existing
    const findStmt = db.prepare(`
      SELECT * FROM applications
      WHERE name = ? AND (executable_path = ? OR (executable_path IS NULL AND ? IS NULL))
    `);
    let app = findStmt.get(sanitizedName, executablePath, executablePath) as Application | undefined;
    
    if (!app) {
      // Create new application
      const insertStmt = db.prepare(`
        INSERT INTO applications (name, executable_path, window_class, category_id)
        VALUES (?, ?, ?, (SELECT category_id FROM auto_category_rules WHERE ? LIKE '%' || pattern || '%' ORDER BY priority DESC LIMIT 1))
      `);
      const result = insertStmt.run(sanitizedName, executablePath, windowClass, sanitizedName.toLowerCase());
      app = this.getById(result.lastInsertRowid as number)!;
    } else {
      // Update last_seen
      const updateStmt = db.prepare(`
        UPDATE applications
        SET last_seen = datetime('now', 'localtime')
        WHERE id = ?
      `);
      updateStmt.run(app.id);
    }
    
    return app;
  },

  getById(id: number): Application | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM applications WHERE id = ?');
    return stmt.get(id) as Application | undefined;
  },

  findByName(name: string): Application | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM applications WHERE name = ? LIMIT 1');
    return stmt.get(name) as Application | undefined;
  },

  getAll(): ApplicationWithCategory[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT a.*, c.name as category_name, c.color as category_color, c.productivity_score as category_productivity_score
      FROM applications a
      LEFT JOIN categories c ON a.category_id = c.id
      ORDER BY a.last_seen DESC
    `);
    return stmt.all() as ApplicationWithCategory[];
  },

  updateCategory(appId: number, categoryId: number | null): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE applications SET category_id = ? WHERE id = ?');
    stmt.run(categoryId, appId);
  },

  setTracked(appId: number, isTracked: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE applications SET is_tracked = ? WHERE id = ?');
    stmt.run(isTracked ? 1 : 0, appId);
  },

  getTopApps(limit: number = 10, startDate?: string, endDate?: string): Array<{
    application: ApplicationWithCategory;
    total_duration: number;
  }> {
    const db = getDatabase();
    let query = `
      SELECT a.*, c.name as category_name, c.color as category_color,
             c.productivity_score as category_productivity_score,
             COALESCE(SUM(te.duration), 0) as total_duration
      FROM applications a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN time_entries te ON a.id = te.application_id
    `;
    
    const params: string[] = [];
    if (startDate && endDate) {
      query += ' WHERE date(te.start_time) BETWEEN date(?) AND date(?)';
      params.push(startDate, endDate);
    }
    
    query += `
      GROUP BY a.id
      ORDER BY total_duration DESC
      LIMIT ?
    `;
    params.push(String(limit));
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params) as (ApplicationWithCategory & { total_duration: number })[];
    
    return results.map(r => ({
      application: r,
      total_duration: r.total_duration
    }));
  },

  // Get all applications with their total time (no limit)
  getAllWithTime(startDate?: string, endDate?: string): Array<{
    application: ApplicationWithCategory;
    total_duration: number;
    first_seen: string;
    session_count: number;
  }> {
    const db = getDatabase();
    let query = `
      SELECT a.*, c.name as category_name, c.color as category_color,
             c.productivity_score as category_productivity_score,
             COALESCE(SUM(te.duration), 0) as total_duration,
             MIN(te.start_time) as first_seen,
             COUNT(DISTINCT te.session_id) as session_count
      FROM applications a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN time_entries te ON a.id = te.application_id
    `;
    
    const params: string[] = [];
    if (startDate && endDate) {
      query += ' WHERE date(te.start_time) BETWEEN date(?) AND date(?)';
      params.push(startDate, endDate);
    }
    
    query += `
      GROUP BY a.id
      HAVING total_duration > 0
      ORDER BY total_duration DESC
    `;
    
    const stmt = db.prepare(query);
    const results = stmt.all(...params) as (ApplicationWithCategory & {
      total_duration: number;
      first_seen: string;
      session_count: number;
    })[];
    
    return results.map(r => ({
      application: r,
      total_duration: r.total_duration,
      first_seen: r.first_seen,
      session_count: r.session_count
    }));
  }
};