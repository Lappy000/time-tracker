import { getDatabase } from '../index';
import type { Goal, GoalProgress } from '../schema';

export interface GoalWithProgress extends Goal {
  current_progress: number;
  percentage: number;
  category_name?: string | null;
  category_color?: string | null;
  application_name?: string | null;
}

export interface CreateGoalInput {
  name: string;
  type: 'time' | 'limit' | 'focus';
  category_id?: number | null;
  application_id?: number | null;
  target_minutes: number;
  period: 'daily' | 'weekly' | 'monthly';
  is_limit?: boolean;
}

export interface UpdateGoalInput {
  name?: string;
  type?: 'time' | 'limit' | 'focus';
  category_id?: number | null;
  application_id?: number | null;
  target_minutes?: number;
  period?: 'daily' | 'weekly' | 'monthly';
  is_limit?: boolean;
  is_active?: boolean;
}

export const GoalRepository = {
  getAll(): GoalWithProgress[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const stmt = db.prepare(`
      SELECT 
        g.*,
        c.name as category_name,
        c.color as category_color,
        a.name as application_name,
        COALESCE(gp.achieved_minutes, 0) as current_progress,
        CASE 
          WHEN g.target_minutes > 0 
          THEN ROUND((COALESCE(gp.achieved_minutes, 0) * 100.0) / g.target_minutes, 1)
          ELSE 0 
        END as percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN applications a ON g.application_id = a.id
      LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = ?
      ORDER BY g.created_at DESC
    `);
    
    return stmt.all(today) as GoalWithProgress[];
  },

  getActive(): GoalWithProgress[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const stmt = db.prepare(`
      SELECT 
        g.*,
        c.name as category_name,
        c.color as category_color,
        a.name as application_name,
        COALESCE(gp.achieved_minutes, 0) as current_progress,
        CASE 
          WHEN g.target_minutes > 0 
          THEN ROUND((COALESCE(gp.achieved_minutes, 0) * 100.0) / g.target_minutes, 1)
          ELSE 0 
        END as percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN applications a ON g.application_id = a.id
      LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = ?
      WHERE g.is_active = 1
      ORDER BY g.created_at DESC
    `);
    
    return stmt.all(today) as GoalWithProgress[];
  },

  getById(id: number): GoalWithProgress | undefined {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const stmt = db.prepare(`
      SELECT 
        g.*,
        c.name as category_name,
        c.color as category_color,
        a.name as application_name,
        COALESCE(gp.achieved_minutes, 0) as current_progress,
        CASE 
          WHEN g.target_minutes > 0 
          THEN ROUND((COALESCE(gp.achieved_minutes, 0) * 100.0) / g.target_minutes, 1)
          ELSE 0 
        END as percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN applications a ON g.application_id = a.id
      LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = ?
      WHERE g.id = ?
    `);
    
    return stmt.get(today, id) as GoalWithProgress | undefined;
  },

  create(input: CreateGoalInput): Goal {
    const db = getDatabase();
    
    // Ensure type has a default value to prevent NOT NULL constraint errors
    const goalType = input.type || 'time';
    
    const stmt = db.prepare(`
      INSERT INTO goals (name, type, category_id, application_id, target_minutes, period, is_limit)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      input.name,
      goalType,
      input.category_id || null,
      input.application_id || null,
      input.target_minutes,
      input.period || 'daily',
      input.is_limit ? 1 : 0
    );
    
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, updates: UpdateGoalInput): void {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.application_id !== undefined) {
      fields.push('application_id = ?');
      values.push(updates.application_id);
    }
    if (updates.target_minutes !== undefined) {
      fields.push('target_minutes = ?');
      values.push(updates.target_minutes);
    }
    if (updates.period !== undefined) {
      fields.push('period = ?');
      values.push(updates.period);
    }
    if (updates.is_limit !== undefined) {
      fields.push('is_limit = ?');
      values.push(updates.is_limit ? 1 : 0);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      const stmt = db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  },

  delete(id: number): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM goals WHERE id = ?');
    stmt.run(id);
  },

  setActive(id: number, isActive: boolean): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE goals SET is_active = ? WHERE id = ?');
    stmt.run(isActive ? 1 : 0, id);
  },

  // Progress tracking
  getProgress(goalId: number, date: string): GoalProgress | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM goal_progress WHERE goal_id = ? AND date = ?');
    return stmt.get(goalId, date) as GoalProgress | undefined;
  },

  updateProgress(goalId: number, minutes: number, date?: string): void {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get the goal to check target
    const goal = this.getById(goalId);
    if (!goal) return;
    
    // Check if progress exists for today
    const existing = this.getProgress(goalId, targetDate);
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE goal_progress 
        SET achieved_minutes = ?,
            is_completed = CASE WHEN ? >= ? THEN 1 ELSE 0 END
        WHERE goal_id = ? AND date = ?
      `);
      stmt.run(minutes, minutes, goal.target_minutes, goalId, targetDate);
    } else {
      const stmt = db.prepare(`
        INSERT INTO goal_progress (goal_id, date, achieved_minutes, is_completed)
        VALUES (?, ?, ?, CASE WHEN ? >= ? THEN 1 ELSE 0 END)
      `);
      stmt.run(goalId, targetDate, minutes, minutes, goal.target_minutes);
    }
  },

  incrementProgress(goalId: number, minutes: number, date?: string): void {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const goal = this.getById(goalId);
    if (!goal) return;
    
    const existing = this.getProgress(goalId, targetDate);
    const newMinutes = (existing?.achieved_minutes || 0) + minutes;
    
    this.updateProgress(goalId, newMinutes, targetDate);
  },

  // Get goals that have reached their limit (for warnings)
  getLimitWarnings(): GoalWithProgress[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const stmt = db.prepare(`
      SELECT 
        g.*,
        c.name as category_name,
        c.color as category_color,
        a.name as application_name,
        COALESCE(gp.achieved_minutes, 0) as current_progress,
        CASE 
          WHEN g.target_minutes > 0 
          THEN ROUND((COALESCE(gp.achieved_minutes, 0) * 100.0) / g.target_minutes, 1)
          ELSE 0 
        END as percentage
      FROM goals g
      LEFT JOIN categories c ON g.category_id = c.id
      LEFT JOIN applications a ON g.application_id = a.id
      LEFT JOIN goal_progress gp ON g.id = gp.goal_id AND gp.date = ?
      WHERE g.is_active = 1 
        AND g.is_limit = 1
        AND COALESCE(gp.achieved_minutes, 0) >= (g.target_minutes * 0.8)
      ORDER BY percentage DESC
    `);
    
    return stmt.all(today) as GoalWithProgress[];
  },

  // Get history for a specific goal
  getProgressHistory(goalId: number, days: number = 7): GoalProgress[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM goal_progress 
      WHERE goal_id = ? 
        AND date >= date('now', '-' || ? || ' days')
      ORDER BY date DESC
    `);
    return stmt.all(goalId, days) as GoalProgress[];
  },

  // Auto-calculate progress from time entries
  calculateProgressFromTimeEntries(goalId: number, date?: string): number {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const goal = this.getById(goalId);
    if (!goal) return 0;
    
    let sql = '';
    const params: (string | number)[] = [targetDate];
    
    if (goal.category_id) {
      // Calculate time for category
      sql = `
        SELECT COALESCE(SUM(te.duration), 0) / 60 as total_minutes
        FROM time_entries te
        JOIN applications a ON te.application_id = a.id
        WHERE a.category_id = ?
          AND date(te.start_time) = ?
          AND te.is_idle = 0
      `;
      params.unshift(goal.category_id);
    } else if (goal.application_id) {
      // Calculate time for specific application
      sql = `
        SELECT COALESCE(SUM(te.duration), 0) / 60 as total_minutes
        FROM time_entries te
        WHERE te.application_id = ?
          AND date(te.start_time) = ?
          AND te.is_idle = 0
      `;
      params.unshift(goal.application_id);
    } else {
      // Calculate total productive time
      sql = `
        SELECT COALESCE(SUM(te.duration), 0) / 60 as total_minutes
        FROM time_entries te
        JOIN applications a ON te.application_id = a.id
        JOIN categories c ON a.category_id = c.id
        WHERE c.productivity_score > 0
          AND date(te.start_time) = ?
          AND te.is_idle = 0
      `;
    }
    
    const stmt = db.prepare(sql);
    const result = stmt.get(...params) as { total_minutes: number };
    return Math.round(result.total_minutes);
  },

  // Sync all goals progress with actual time entries
  syncAllProgress(date?: string): void {
    const goals = this.getActive();
    
    for (const goal of goals) {
      const minutes = this.calculateProgressFromTimeEntries(goal.id, date);
      this.updateProgress(goal.id, minutes, date);
    }
  }
};