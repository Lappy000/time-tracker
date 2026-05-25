import { getDatabase } from '../index';
import type { Category } from '../schema';

export const CategoryRepository = {
  getAll(): Category[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM categories ORDER BY name');
    return stmt.all() as Category[];
  },

  getById(id: number): Category | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    return stmt.get(id) as Category | undefined;
  },

  getByName(name: string): Category | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM categories WHERE name = ?');
    return stmt.get(name) as Category | undefined;
  },

  create(category: Omit<Category, 'id' | 'created_at'>): Category {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO categories (name, color, icon, is_productive, productivity_score, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      category.name,
      category.color,
      category.icon,
      category.is_productive ? 1 : 0,
      category.productivity_score,
      category.is_default ? 1 : 0
    );
    return this.getById(result.lastInsertRowid as number)!;
  },

  update(id: number, updates: Partial<Omit<Category, 'id' | 'created_at'>>): void {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon || '');
    }
    if (updates.is_productive !== undefined) {
      fields.push('is_productive = ?');
      values.push(updates.is_productive ? 1 : 0);
    }
    if (updates.productivity_score !== undefined) {
      fields.push('productivity_score = ?');
      values.push(updates.productivity_score);
    }

    if (fields.length > 0) {
      values.push(id);
      const stmt = db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  },

  delete(id: number): void {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM categories WHERE id = ? AND is_default = 0');
    stmt.run(id);
  },

  getUsageStats(): Array<{
    category: Category;
    total_duration: number;
    app_count: number;
  }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT c.*, 
             COALESCE(SUM(te.duration), 0) as total_duration,
             COUNT(DISTINCT a.id) as app_count
      FROM categories c
      LEFT JOIN applications a ON c.id = a.category_id
      LEFT JOIN time_entries te ON a.id = te.application_id
        AND date(te.start_time) = date('now', 'localtime')
      GROUP BY c.id
      ORDER BY total_duration DESC
    `);
    const results = stmt.all() as (Category & { total_duration: number; app_count: number })[];
    return results.map(r => ({
      category: r,
      total_duration: r.total_duration,
      app_count: r.app_count
    }));
  }
};