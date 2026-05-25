import { getDatabase } from '../index';
import type { TimeEntry } from '../schema';

export interface TimeEntryWithApp extends TimeEntry {
  app_name?: string;
  category_name?: string;
  category_color?: string;
}

export const TimeEntryRepository = {
  create(
    sessionId: number,
    applicationId: number,
    windowTitle?: string
  ): TimeEntry {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO time_entries (session_id, application_id, window_title, start_time)
      VALUES (?, ?, ?, datetime('now', 'localtime'))
    `);
    const result = stmt.run(sessionId, applicationId, windowTitle);
    return this.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): TimeEntry | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM time_entries WHERE id = ?');
    return stmt.get(id) as TimeEntry | undefined;
  },

  getCurrent(sessionId: number): TimeEntry | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM time_entries 
      WHERE session_id = ? AND end_time IS NULL
      ORDER BY start_time DESC 
      LIMIT 1
    `);
    return stmt.get(sessionId) as TimeEntry | undefined;
  },

  end(id: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE time_entries 
      SET end_time = datetime('now', 'localtime'),
          duration = CAST((julianday(datetime('now', 'localtime')) - julianday(start_time)) * 86400 AS INTEGER)
      WHERE id = ?
    `);
    stmt.run(id);
  },

  setIdle(id: number, isIdle: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE time_entries SET is_idle = ? WHERE id = ?');
    stmt.run(isIdle ? 1 : 0, id);
  },

  getBySession(sessionId: number): TimeEntryWithApp[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT te.*, a.name as app_name, c.name as category_name, c.color as category_color
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE te.session_id = ?
      ORDER BY te.start_time DESC
    `);
    return stmt.all(sessionId) as TimeEntryWithApp[];
  },

  getByDateRange(startDate: string, endDate: string): TimeEntryWithApp[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT te.*, a.name as app_name, c.name as category_name, c.color as category_color
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(te.start_time) BETWEEN date(?) AND date(?)
      ORDER BY te.start_time DESC
    `);
    return stmt.all(startDate, endDate) as TimeEntryWithApp[];
  },

  getTodayStats(): {
    total_duration: number;
    productive_duration: number;
    distraction_duration: number;
    neutral_duration: number;
  } {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        COALESCE(SUM(te.duration), 0) as total_duration,
        COALESCE(SUM(CASE WHEN c.productivity_score > 0 THEN te.duration ELSE 0 END), 0) as productive_duration,
        COALESCE(SUM(CASE WHEN c.productivity_score < 0 THEN te.duration ELSE 0 END), 0) as distraction_duration,
        COALESCE(SUM(CASE WHEN c.productivity_score = 0 OR c.productivity_score IS NULL THEN te.duration ELSE 0 END), 0) as neutral_duration
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(te.start_time) = date('now', 'localtime')
        AND te.is_idle = 0
    `);
    return stmt.get() as {
      total_duration: number;
      productive_duration: number;
      distraction_duration: number;
      neutral_duration: number;
    };
  },

  getHourlyBreakdown(date: string): Array<{
    hour: number;
    duration: number;
    productive_duration: number;
  }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        CAST(strftime('%H', te.start_time) AS INTEGER) as hour,
        COALESCE(SUM(te.duration), 0) as duration,
        COALESCE(SUM(CASE WHEN c.productivity_score > 0 THEN te.duration ELSE 0 END), 0) as productive_duration
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(te.start_time) = date(?)
        AND te.is_idle = 0
      GROUP BY hour
      ORDER BY hour
    `);
    return stmt.all(date) as Array<{
      hour: number;
      duration: number;
      productive_duration: number;
    }>;
  },

  getHourlyBreakdownByCategory(date: string): Array<{
    hour: number;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    duration: number;
  }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        CAST(strftime('%H', te.start_time) AS INTEGER) as hour,
        c.id as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.color, '#6b7280') as category_color,
        COALESCE(SUM(te.duration), 0) as duration
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(te.start_time) = date(?)
        AND te.is_idle = 0
      GROUP BY hour, c.id
      ORDER BY hour, c.name
    `);
    return stmt.all(date) as Array<{
      hour: number;
      category_id: number | null;
      category_name: string | null;
      category_color: string | null;
      duration: number;
    }>;
  },

  // Get daily breakdown for date range (for week/month/all-time views)
  getDailyBreakdown(startDate: string, endDate: string): Array<{
    date: string;
    duration: number;
    productive_duration: number;
  }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        date(te.start_time) as date,
        COALESCE(SUM(te.duration), 0) as duration,
        COALESCE(SUM(CASE WHEN c.productivity_score > 0 THEN te.duration ELSE 0 END), 0) as productive_duration
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(te.start_time) BETWEEN date(?) AND date(?)
        AND te.is_idle = 0
      GROUP BY date(te.start_time)
      ORDER BY date
    `);
    return stmt.all(startDate, endDate) as Array<{
      date: string;
      duration: number;
      productive_duration: number;
    }>;
  },

  // Get daily breakdown by category for date range
  getDailyBreakdownByCategory(startDate: string, endDate: string): Array<{
    date: string;
    category_id: number | null;
    category_name: string | null;
    category_color: string | null;
    duration: number;
  }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        date(te.start_time) as date,
        c.id as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(c.color, '#6b7280') as category_color,
        COALESCE(SUM(te.duration), 0) as duration
      FROM time_entries te
      LEFT JOIN applications a ON te.application_id = a.id
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE date(te.start_time) BETWEEN date(?) AND date(?)
        AND te.is_idle = 0
      GROUP BY date(te.start_time), c.id
      ORDER BY date, c.name
    `);
    return stmt.all(startDate, endDate) as Array<{
      date: string;
      category_id: number | null;
      category_name: string | null;
      category_color: string | null;
      duration: number;
    }>;
  }
};