import { getDatabase } from '../index';
import type { CategoryLimit } from '../schema';

export interface CategoryLimitWithUsage extends CategoryLimit {
  category_name?: string;
  category_color?: string;
  used_minutes?: number;
  percent_used?: number;
}

export interface LimitStatus {
  category_id: number;
  category_name: string;
  daily_limit_minutes: number;
  used_minutes: number;
  percent_used: number;
  warning_threshold_percent: number;
  action: 'notify' | 'block' | 'log';
  is_warning: boolean;
  is_exceeded: boolean;
}

export const LimitsRepository = {
  getAll(): CategoryLimit[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM category_limits
      ORDER BY id ASC
    `);
    return stmt.all() as CategoryLimit[];
  },

  getAllWithUsage(): CategoryLimitWithUsage[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT 
        cl.*,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(
          CASE 
            WHEN date(te.start_time) = ? THEN te.duration 
            ELSE 0 
          END
        ) / 60, 0) as used_minutes
      FROM category_limits cl
      JOIN categories c ON cl.category_id = c.id
      LEFT JOIN applications a ON a.category_id = c.id
      LEFT JOIN time_entries te ON te.application_id = a.id
      GROUP BY cl.id
      ORDER BY cl.id ASC
    `);
    const results = stmt.all(today) as CategoryLimitWithUsage[];
    return results.map(r => ({
      ...r,
      percent_used: r.daily_limit_minutes > 0 
        ? Math.round(((r.used_minutes || 0) / r.daily_limit_minutes) * 100)
        : 0
    }));
  },

  getByCategory(categoryId: number): CategoryLimit | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM category_limits WHERE category_id = ?
    `);
    return stmt.get(categoryId) as CategoryLimit | undefined;
  },

  getByCategoryWithUsage(categoryId: number): CategoryLimitWithUsage | undefined {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT 
        cl.*,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(
          CASE 
            WHEN date(te.start_time) = ? THEN te.duration 
            ELSE 0 
          END
        ) / 60, 0) as used_minutes
      FROM category_limits cl
      JOIN categories c ON cl.category_id = c.id
      LEFT JOIN applications a ON a.category_id = c.id
      LEFT JOIN time_entries te ON te.application_id = a.id
      WHERE cl.category_id = ?
      GROUP BY cl.id
    `);
    const result = stmt.get(today, categoryId) as CategoryLimitWithUsage | undefined;
    if (result) {
      result.percent_used = result.daily_limit_minutes > 0 
        ? Math.round(((result.used_minutes || 0) / result.daily_limit_minutes) * 100)
        : 0;
    }
    return result;
  },

  upsert(limit: Omit<CategoryLimit, 'id' | 'created_at'>): CategoryLimit {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO category_limits (category_id, daily_limit_minutes, warning_threshold_percent, action, is_enabled)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(category_id) DO UPDATE SET
        daily_limit_minutes = excluded.daily_limit_minutes,
        warning_threshold_percent = excluded.warning_threshold_percent,
        action = excluded.action,
        is_enabled = excluded.is_enabled
      RETURNING *
    `);
    return stmt.get(
      limit.category_id,
      limit.daily_limit_minutes,
      limit.warning_threshold_percent,
      limit.action,
      limit.is_enabled ? 1 : 0
    ) as CategoryLimit;
  },

  delete(categoryId: number): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM category_limits WHERE category_id = ?');
    stmt.run(categoryId);
  },

  checkStatus(): LimitStatus[] {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT 
        cl.category_id,
        c.name as category_name,
        cl.daily_limit_minutes,
        cl.warning_threshold_percent,
        cl.action,
        cl.is_enabled,
        COALESCE(SUM(
          CASE 
            WHEN date(te.start_time) = ? THEN te.duration 
            ELSE 0 
          END
        ) / 60, 0) as used_minutes
      FROM category_limits cl
      JOIN categories c ON cl.category_id = c.id
      LEFT JOIN applications a ON a.category_id = c.id
      LEFT JOIN time_entries te ON te.application_id = a.id
      WHERE cl.is_enabled = 1
      GROUP BY cl.id
    `);
    const results = stmt.all(today) as Array<{
      category_id: number;
      category_name: string;
      daily_limit_minutes: number;
      warning_threshold_percent: number;
      action: 'notify' | 'block' | 'log';
      is_enabled: number;
      used_minutes: number;
    }>;

    return results.map(r => {
      const percentUsed = r.daily_limit_minutes > 0 
        ? Math.round((r.used_minutes / r.daily_limit_minutes) * 100)
        : 0;
      return {
        category_id: r.category_id,
        category_name: r.category_name,
        daily_limit_minutes: r.daily_limit_minutes,
        used_minutes: r.used_minutes,
        percent_used: percentUsed,
        warning_threshold_percent: r.warning_threshold_percent,
        action: r.action,
        is_warning: percentUsed >= r.warning_threshold_percent && percentUsed < 100,
        is_exceeded: percentUsed >= 100
      };
    });
  },

  getUsageForCategory(categoryId: number, date?: string): { used_minutes: number; limit_minutes: number; percent: number } {
    const db = getDatabase();
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get the limit
    const limitStmt = db.prepare('SELECT daily_limit_minutes FROM category_limits WHERE category_id = ?');
    const limitResult = limitStmt.get(categoryId) as { daily_limit_minutes: number } | undefined;
    const limitMinutes = limitResult?.daily_limit_minutes || 0;

    // Get usage
    const usageStmt = db.prepare(`
      SELECT COALESCE(SUM(te.duration) / 60000, 0) as used_minutes
      FROM time_entries te
      JOIN applications a ON te.application_id = a.id
      WHERE a.category_id = ? AND date(te.start_time) = ?
    `);
    const usageResult = usageStmt.get(categoryId, targetDate) as { used_minutes: number };
    const usedMinutes = usageResult?.used_minutes || 0;

    return {
      used_minutes: usedMinutes,
      limit_minutes: limitMinutes,
      percent: limitMinutes > 0 ? Math.round((usedMinutes / limitMinutes) * 100) : 0
    };
  }
};