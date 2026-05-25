import { getDatabase } from '../index';
import type { FocusSession } from '../schema';

// Input types
export interface CreateFocusSessionInput {
  planned_duration?: number; // seconds, default 1500 (25 min)
  break_duration?: number; // seconds, default 300 (5 min)
  goal_id?: number | null;
  notes?: string | null;
}

export interface UpdateFocusSessionInput {
  end_time?: string;
  actual_duration?: number;
  status?: 'active' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  breaks_taken?: number;
  notes?: string | null;
}

// Focus session with related goal info
export interface FocusSessionWithGoal extends FocusSession {
  goal_name?: string | null;
  goal_target?: number | null;
}

// Statistics interface
export interface FocusStats {
  total_sessions: number;
  completed_sessions: number;
  total_focus_time: number;
  avg_session_duration: number;
  total_breaks: number;
  completion_rate: number;
}

export const FocusSessionRepository = {
  // Get all focus sessions
  getAll(): FocusSessionWithGoal[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        g.name as goal_name,
        g.target_minutes as goal_target
      FROM focus_sessions fs
      LEFT JOIN goals g ON fs.goal_id = g.id
      ORDER BY fs.created_at DESC
    `);
    return stmt.all() as FocusSessionWithGoal[];
  },

  // Get focus sessions by date range
  getByDateRange(startDate: string, endDate: string): FocusSessionWithGoal[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        g.name as goal_name,
        g.target_minutes as goal_target
      FROM focus_sessions fs
      LEFT JOIN goals g ON fs.goal_id = g.id
      WHERE date(fs.start_time) BETWEEN ? AND ?
      ORDER BY fs.start_time DESC
    `);
    return stmt.all(startDate, endDate) as FocusSessionWithGoal[];
  },

  // Get today's focus sessions
  getToday(): FocusSessionWithGoal[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDateRange(today, today);
  },

  // Get focus session by ID
  getById(id: number): FocusSessionWithGoal | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        g.name as goal_name,
        g.target_minutes as goal_target
      FROM focus_sessions fs
      LEFT JOIN goals g ON fs.goal_id = g.id
      WHERE fs.id = ?
    `);
    return stmt.get(id) as FocusSessionWithGoal | undefined;
  },

  // Get active focus session (there should be at most one)
  getActive(): FocusSessionWithGoal | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        g.name as goal_name,
        g.target_minutes as goal_target
      FROM focus_sessions fs
      LEFT JOIN goals g ON fs.goal_id = g.id
      WHERE fs.status IN ('active', 'paused')
      ORDER BY fs.start_time DESC
      LIMIT 1
    `);
    return stmt.get() as FocusSessionWithGoal | undefined;
  },

  // Create new focus session
  create(input: CreateFocusSessionInput): FocusSession {
    const db = getDatabase();
    
    // Cancel any existing active session first
    const activeSession = this.getActive();
    if (activeSession) {
      this.update(activeSession.id, {
        status: 'cancelled',
        end_time: new Date().toISOString()
      });
    }
    
    const plannedDuration = input.planned_duration ?? 1500; // 25 minutes default
    const breakDuration = input.break_duration ?? 300; // 5 minutes default
    
    const stmt = db.prepare(`
      INSERT INTO focus_sessions (
        start_time, planned_duration, break_duration, goal_id, notes, status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `);
    
    const result = stmt.run(
      new Date().toISOString(),
      plannedDuration,
      breakDuration,
      input.goal_id ?? null,
      input.notes ?? null
    );
    
    return this.getById(result.lastInsertRowid as number) as FocusSession;
  },

  // Update focus session
  update(id: number, updates: UpdateFocusSessionInput): void {
    const db = getDatabase();
    const setClauses: string[] = [];
    const values: (string | number | null)[] = [];
    
    if (updates.end_time !== undefined) {
      setClauses.push('end_time = ?');
      values.push(updates.end_time);
    }
    if (updates.actual_duration !== undefined) {
      setClauses.push('actual_duration = ?');
      values.push(updates.actual_duration);
    }
    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.breaks_taken !== undefined) {
      setClauses.push('breaks_taken = ?');
      values.push(updates.breaks_taken);
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }
    
    if (setClauses.length === 0) return;
    
    values.push(id);
    const stmt = db.prepare(`
      UPDATE focus_sessions SET ${setClauses.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  },

  // Pause focus session
  pause(id: number): void {
    const session = this.getById(id);
    if (!session || session.status !== 'active') return;
    
    // Calculate elapsed time
    const startTime = new Date(session.start_time).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000) - (session.actual_duration || 0);
    
    this.update(id, {
      status: 'paused',
      actual_duration: (session.actual_duration || 0) + elapsedSeconds
    });
  },

  // Resume focus session
  resume(id: number): void {
    const session = this.getById(id);
    if (!session || session.status !== 'paused') return;
    
    // Reset start_time to now for continuing the session
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE focus_sessions SET status = 'active', start_time = ? WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), id);
  },

  // Complete focus session
  complete(id: number, notes?: string): FocusSession | undefined {
    const session = this.getById(id);
    if (!session) return undefined;
    
    const now = new Date();
    let actualDuration = session.actual_duration || 0;
    
    // Add remaining time if session was active
    if (session.status === 'active') {
      const startTime = new Date(session.start_time).getTime();
      const elapsedSeconds = Math.floor((now.getTime() - startTime) / 1000);
      actualDuration += elapsedSeconds;
    }
    
    this.update(id, {
      status: 'completed',
      end_time: now.toISOString(),
      actual_duration: actualDuration,
      notes: notes ?? session.notes
    });
    
    return this.getById(id);
  },

  // Cancel focus session
  cancel(id: number): void {
    const session = this.getById(id);
    if (!session) return;
    
    const now = new Date();
    let actualDuration = session.actual_duration || 0;
    
    if (session.status === 'active') {
      const startTime = new Date(session.start_time).getTime();
      const elapsedSeconds = Math.floor((now.getTime() - startTime) / 1000);
      actualDuration += elapsedSeconds;
    }
    
    this.update(id, {
      status: 'cancelled',
      end_time: now.toISOString(),
      actual_duration: actualDuration
    });
  },

  // Increment breaks taken
  incrementBreaks(id: number): void {
    const session = this.getById(id);
    if (!session) return;
    
    this.update(id, {
      breaks_taken: (session.breaks_taken || 0) + 1
    });
  },

  // Delete focus session
  delete(id: number): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM focus_sessions WHERE id = ?');
    stmt.run(id);
  },

  // Get focus statistics for date range
  getStats(startDate?: string, endDate?: string): FocusStats {
    const db = getDatabase();
    
    let dateFilter = '';
    const params: string[] = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE date(start_time) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE date(start_time) >= ?';
      params.push(startDate);
    }
    
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
        COALESCE(SUM(actual_duration), 0) as total_focus_time,
        COALESCE(AVG(CASE WHEN status = 'completed' THEN actual_duration END), 0) as avg_session_duration,
        COALESCE(SUM(breaks_taken), 0) as total_breaks
      FROM focus_sessions
      ${dateFilter}
    `);
    
    const result = stmt.get(...params) as {
      total_sessions: number;
      completed_sessions: number;
      total_focus_time: number;
      avg_session_duration: number;
      total_breaks: number;
    };
    
    return {
      ...result,
      completion_rate: result.total_sessions > 0 
        ? (result.completed_sessions / result.total_sessions) * 100 
        : 0
    };
  },

  // Get today's stats
  getTodayStats(): FocusStats {
    const today = new Date().toISOString().split('T')[0];
    return this.getStats(today, today);
  },

  // Get recent sessions (last N)
  getRecent(limit: number = 10): FocusSessionWithGoal[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        fs.*,
        g.name as goal_name,
        g.target_minutes as goal_target
      FROM focus_sessions fs
      LEFT JOIN goals g ON fs.goal_id = g.id
      ORDER BY fs.start_time DESC
      LIMIT ?
    `);
    return stmt.all(limit) as FocusSessionWithGoal[];
  }
};