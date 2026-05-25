import { getDatabase } from '../index';
import type { Session } from '../schema';

export const SessionRepository = {
  create(): Session {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO sessions (start_time) 
      VALUES (datetime('now', 'localtime'))
    `);
    const result = stmt.run();
    return this.getById(result.lastInsertRowid as number)!;
  },

  getById(id: number): Session | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as Session | undefined;
  },

  getCurrent(): Session | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE end_time IS NULL 
      ORDER BY start_time DESC 
      LIMIT 1
    `);
    return stmt.get() as Session | undefined;
  },

  end(id: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE sessions 
      SET end_time = datetime('now', 'localtime'),
          total_duration = CAST((julianday(datetime('now', 'localtime')) - julianday(start_time)) * 86400 AS INTEGER)
      WHERE id = ?
    `);
    stmt.run(id);
  },

  updateDurations(id: number, activeDuration: number, idleDuration: number): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE sessions 
      SET active_duration = ?,
          idle_duration = ?,
          total_duration = ? + ?
      WHERE id = ?
    `);
    stmt.run(activeDuration, idleDuration, activeDuration, idleDuration, id);
  },

  getByDateRange(startDate: string, endDate: string): Session[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sessions 
      WHERE date(start_time) BETWEEN date(?) AND date(?)
      ORDER BY start_time DESC
    `);
    return stmt.all(startDate, endDate) as Session[];
  },

  getToday(): Session[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sessions
      WHERE date(start_time) = date('now', 'localtime')
      ORDER BY start_time DESC
    `);
    const sessions = stmt.all() as Session[];
    // Log sessions to debug "0s" issue
    if (sessions.length > 0) {
      console.log('SessionRepository: Today sessions:', sessions);
    }
    return sessions;
  }
};