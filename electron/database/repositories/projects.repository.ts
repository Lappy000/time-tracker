import { getDatabase } from '../index';
import type { Project, ProjectRule } from '../schema';

// Types for project operations
export interface CreateProjectInput {
  name: string;
  color?: string;
  client?: string | null;
  hourly_rate?: number | null;
  budget_hours?: number | null;
  is_active?: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  color?: string;
  client?: string | null;
  hourly_rate?: number | null;
  budget_hours?: number | null;
  is_active?: boolean;
}

export interface CreateProjectRuleInput {
  project_id: number;
  rule_type: 'app' | 'path' | 'window_title';
  pattern: string;
}

export interface ProjectWithRules extends Project {
  rules: ProjectRule[];
}

export interface ProjectWithStats extends Project {
  rules: ProjectRule[];
  total_time: number; // in seconds
  billable_amount: number;
  budget_used_percent: number | null;
}

export interface ProjectTimeRange {
  startDate: string;
  endDate: string;
}

export const ProjectsRepository = {
  // ========== PROJECT CRUD ==========

  /**
   * Get all projects
   */
  getAll(): Project[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM projects 
      ORDER BY is_active DESC, name ASC
    `);
    return stmt.all() as Project[];
  },

  /**
   * Get active projects only
   */
  getActive(): Project[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM projects 
      WHERE is_active = 1 
      ORDER BY name ASC
    `);
    return stmt.all() as Project[];
  },

  /**
   * Get project by ID
   */
  getById(id: number): Project | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as Project | undefined;
  },

  /**
   * Get project with its rules
   */
  getWithRules(id: number): ProjectWithRules | undefined {
    const project = this.getById(id);
    if (!project) return undefined;

    const rules = this.getRulesByProject(id);
    return { ...project, rules };
  },

  /**
   * Get all projects with their rules
   */
  getAllWithRules(): ProjectWithRules[] {
    const projects = this.getAll();
    return projects.map((project) => ({
      ...project,
      rules: this.getRulesByProject(project.id),
    }));
  },

  /**
   * Create a new project
   */
  create(input: CreateProjectInput): Project {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO projects (name, color, client, hourly_rate, budget_hours, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name,
      input.color || '#6366f1',
      input.client || null,
      input.hourly_rate || null,
      input.budget_hours || null,
      input.is_active !== false ? 1 : 0
    );

    return this.getById(result.lastInsertRowid as number)!;
  },

  /**
   * Update a project
   */
  update(id: number, updates: UpdateProjectInput): Project | undefined {
    const db = getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.client !== undefined) {
      fields.push('client = ?');
      values.push(updates.client);
    }
    if (updates.hourly_rate !== undefined) {
      fields.push('hourly_rate = ?');
      values.push(updates.hourly_rate);
    }
    if (updates.budget_hours !== undefined) {
      fields.push('budget_hours = ?');
      values.push(updates.budget_hours);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (fields.length === 0) return this.getById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete a project
   */
  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Archive a project (set is_active to false)
   */
  archive(id: number): Project | undefined {
    return this.update(id, { is_active: false });
  },

  /**
   * Restore an archived project
   */
  restore(id: number): Project | undefined {
    return this.update(id, { is_active: true });
  },

  // ========== PROJECT RULES ==========

  /**
   * Get all rules for a project
   */
  getRulesByProject(projectId: number): ProjectRule[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM project_rules WHERE project_id = ?');
    return stmt.all(projectId) as ProjectRule[];
  },

  /**
   * Get a rule by ID
   */
  getRuleById(id: number): ProjectRule | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM project_rules WHERE id = ?');
    return stmt.get(id) as ProjectRule | undefined;
  },

  /**
   * Create a project rule
   */
  createRule(input: CreateProjectRuleInput): ProjectRule {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO project_rules (project_id, rule_type, pattern)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(input.project_id, input.rule_type, input.pattern);
    return this.getRuleById(result.lastInsertRowid as number)!;
  },

  /**
   * Update a project rule
   */
  updateRule(
    id: number,
    updates: { rule_type?: 'app' | 'path' | 'window_title'; pattern?: string }
  ): ProjectRule | undefined {
    const db = getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.rule_type !== undefined) {
      fields.push('rule_type = ?');
      values.push(updates.rule_type);
    }
    if (updates.pattern !== undefined) {
      fields.push('pattern = ?');
      values.push(updates.pattern);
    }

    if (fields.length === 0) return this.getRuleById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE project_rules SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getRuleById(id);
  },

  /**
   * Delete a project rule
   */
  deleteRule(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM project_rules WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete all rules for a project
   */
  deleteRulesByProject(projectId: number): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM project_rules WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  },

  // ========== PROJECT MATCHING ==========

  /**
   * Get project for a time entry based on rules
   * Priority: app name -> window title -> path
   */
  getProjectForEntry(
    appName: string | null,
    windowTitle: string | null,
    path: string | null
  ): Project | undefined {
    const db = getDatabase();

    // Get all active projects with their rules
    const projectsWithRules = this.getAllWithRules().filter((p) => p.is_active);

    for (const project of projectsWithRules) {
      for (const rule of project.rules) {
        const pattern = rule.pattern.toLowerCase();
        let matchTarget: string | null = null;

        switch (rule.rule_type) {
          case 'app':
            matchTarget = appName;
            break;
          case 'window_title':
            matchTarget = windowTitle;
            break;
          case 'path':
            matchTarget = path;
            break;
        }

        if (matchTarget && matchTarget.toLowerCase().includes(pattern)) {
          return project;
        }
      }
    }

    return undefined;
  },

  // ========== PROJECT TIME & BILLING ==========

  /**
   * Get total time spent on a project
   */
  getProjectTime(projectId: number, dateRange?: ProjectTimeRange): number {
    const db = getDatabase();
    let query = `
      SELECT COALESCE(SUM(duration), 0) as total_time
      FROM time_entries
      WHERE project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (dateRange) {
      query += ' AND start_time >= ? AND start_time <= ?';
      params.push(dateRange.startDate, dateRange.endDate);
    }

    const stmt = db.prepare(query);
    const result = stmt.get(...params) as { total_time: number };
    return result.total_time;
  },

  /**
   * Get project with statistics
   */
  getProjectWithStats(id: number, dateRange?: ProjectTimeRange): ProjectWithStats | undefined {
    const project = this.getWithRules(id);
    if (!project) return undefined;

    const totalTime = this.getProjectTime(id, dateRange);
    const totalHours = totalTime / 3600;
    const billableAmount = project.hourly_rate ? totalHours * project.hourly_rate : 0;
    const budgetUsedPercent = project.budget_hours
      ? (totalHours / project.budget_hours) * 100
      : null;

    return {
      ...project,
      total_time: totalTime,
      billable_amount: billableAmount,
      budget_used_percent: budgetUsedPercent,
    };
  },

  /**
   * Get all projects with statistics
   */
  getAllWithStats(dateRange?: ProjectTimeRange): ProjectWithStats[] {
    const projects = this.getAll();
    return projects.map((project) => {
      const rules = this.getRulesByProject(project.id);
      const totalTime = this.getProjectTime(project.id, dateRange);
      const totalHours = totalTime / 3600;
      const billableAmount = project.hourly_rate ? totalHours * project.hourly_rate : 0;
      const budgetUsedPercent = project.budget_hours
        ? (totalHours / project.budget_hours) * 100
        : null;

      return {
        ...project,
        rules,
        total_time: totalTime,
        billable_amount: billableAmount,
        budget_used_percent: budgetUsedPercent,
      };
    });
  },

  /**
   * Get projects grouped by client
   */
  getProjectsByClient(): Record<string, Project[]> {
    const projects = this.getAll();
    const grouped: Record<string, Project[]> = {};

    for (const project of projects) {
      const client = project.client || 'No Client';
      if (!grouped[client]) {
        grouped[client] = [];
      }
      grouped[client].push(project);
    }

    return grouped;
  },

  /**
   * Assign project to a time entry
   */
  assignProjectToEntry(entryId: number, projectId: number | null): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE time_entries SET project_id = ? WHERE id = ?');
    const result = stmt.run(projectId, entryId);
    return result.changes > 0;
  },

  /**
   * Get time entries for a project
   */
  getTimeEntriesForProject(
    projectId: number,
    dateRange?: ProjectTimeRange
  ): { id: number; application_id: number; window_title: string; start_time: string; duration: number }[] {
    const db = getDatabase();
    let query = `
      SELECT id, application_id, window_title, start_time, duration
      FROM time_entries
      WHERE project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (dateRange) {
      query += ' AND start_time >= ? AND start_time <= ?';
      params.push(dateRange.startDate, dateRange.endDate);
    }

    query += ' ORDER BY start_time DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as { id: number; application_id: number; window_title: string; start_time: string; duration: number }[];
  },
};