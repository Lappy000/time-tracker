import { ProjectsRepository, type ProjectWithStats, type ProjectTimeRange } from '../database/repositories';
import type { Project, ProjectRule } from '../database/schema';

export interface BillingReportEntry {
  projectId: number;
  projectName: string;
  client: string | null;
  totalHours: number;
  hourlyRate: number | null;
  billableAmount: number;
  budgetHours: number | null;
  budgetUsedPercent: number | null;
}

export interface BillingReport {
  dateRange: ProjectTimeRange;
  entries: BillingReportEntry[];
  totalHours: number;
  totalBillableAmount: number;
}

export interface BudgetStatus {
  projectId: number;
  projectName: string;
  budgetHours: number;
  usedHours: number;
  remainingHours: number;
  usedPercent: number;
  isOverBudget: boolean;
  isNearLimit: boolean; // > 80%
}

class ProjectsService {
  /**
   * Auto-assign project to a time entry based on rules
   * Called whenever a new time entry is created
   */
  autoAssignProject(
    entryId: number,
    appName: string | null,
    windowTitle: string | null,
    path: string | null
  ): Project | undefined {
    const matchedProject = ProjectsRepository.getProjectForEntry(appName, windowTitle, path);

    if (matchedProject) {
      ProjectsRepository.assignProjectToEntry(entryId, matchedProject.id);
      return matchedProject;
    }

    return undefined;
  }

  /**
   * Generate a billing report for a date range
   */
  generateBillingReport(dateRange: ProjectTimeRange): BillingReport {
    const projectsWithStats = ProjectsRepository.getAllWithStats(dateRange);
    
    const entries: BillingReportEntry[] = projectsWithStats
      .filter((p) => p.total_time > 0) // Only include projects with tracked time
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        client: project.client,
        totalHours: project.total_time / 3600,
        hourlyRate: project.hourly_rate,
        billableAmount: project.billable_amount,
        budgetHours: project.budget_hours,
        budgetUsedPercent: project.budget_used_percent,
      }));

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);
    const totalBillableAmount = entries.reduce((sum, e) => sum + e.billableAmount, 0);

    return {
      dateRange,
      entries,
      totalHours,
      totalBillableAmount,
    };
  }

  /**
   * Generate billing report grouped by client
   */
  generateBillingReportByClient(
    dateRange: ProjectTimeRange
  ): Record<string, { entries: BillingReportEntry[]; totalHours: number; totalAmount: number }> {
    const report = this.generateBillingReport(dateRange);
    const grouped: Record<string, { entries: BillingReportEntry[]; totalHours: number; totalAmount: number }> = {};

    for (const entry of report.entries) {
      const client = entry.client || 'No Client';
      if (!grouped[client]) {
        grouped[client] = { entries: [], totalHours: 0, totalAmount: 0 };
      }
      grouped[client].entries.push(entry);
      grouped[client].totalHours += entry.totalHours;
      grouped[client].totalAmount += entry.billableAmount;
    }

    return grouped;
  }

  /**
   * Get budget status for all projects with budgets
   */
  getBudgetStatuses(dateRange?: ProjectTimeRange): BudgetStatus[] {
    const projectsWithStats = ProjectsRepository.getAllWithStats(dateRange);
    
    return projectsWithStats
      .filter((p) => p.budget_hours !== null && p.budget_hours > 0)
      .map((project) => {
        const usedHours = project.total_time / 3600;
        const budgetHours = project.budget_hours!;
        const usedPercent = (usedHours / budgetHours) * 100;

        return {
          projectId: project.id,
          projectName: project.name,
          budgetHours,
          usedHours,
          remainingHours: Math.max(0, budgetHours - usedHours),
          usedPercent,
          isOverBudget: usedHours > budgetHours,
          isNearLimit: usedPercent >= 80 && usedPercent < 100,
        };
      });
  }

  /**
   * Get projects that are over or near budget limit
   */
  getBudgetWarnings(dateRange?: ProjectTimeRange): BudgetStatus[] {
    const statuses = this.getBudgetStatuses(dateRange);
    return statuses.filter((s) => s.isOverBudget || s.isNearLimit);
  }

  /**
   * Calculate billable amount for a project
   */
  calculateBillableAmount(projectId: number, dateRange?: ProjectTimeRange): number {
    const project = ProjectsRepository.getProjectWithStats(projectId, dateRange);
    return project?.billable_amount || 0;
  }

  /**
   * Get active projects summary
   */
  getActiveProjectsSummary(dateRange?: ProjectTimeRange): {
    totalProjects: number;
    activeProjects: number;
    totalTrackedTime: number;
    totalBillableAmount: number;
    projectsNearBudget: number;
    projectsOverBudget: number;
  } {
    const allProjects = ProjectsRepository.getAll();
    const activeProjects = allProjects.filter((p) => p.is_active);
    const projectsWithStats = ProjectsRepository.getAllWithStats(dateRange);
    const budgetStatuses = this.getBudgetStatuses(dateRange);

    return {
      totalProjects: allProjects.length,
      activeProjects: activeProjects.length,
      totalTrackedTime: projectsWithStats.reduce((sum, p) => sum + p.total_time, 0),
      totalBillableAmount: projectsWithStats.reduce((sum, p) => sum + p.billable_amount, 0),
      projectsNearBudget: budgetStatuses.filter((s) => s.isNearLimit).length,
      projectsOverBudget: budgetStatuses.filter((s) => s.isOverBudget).length,
    };
  }

  /**
   * Test if a pattern would match given input
   */
  testRule(
    ruleType: 'app' | 'path' | 'window_title',
    pattern: string,
    appName: string | null,
    windowTitle: string | null,
    path: string | null
  ): boolean {
    const patternLower = pattern.toLowerCase();
    let target: string | null = null;

    switch (ruleType) {
      case 'app':
        target = appName;
        break;
      case 'window_title':
        target = windowTitle;
        break;
      case 'path':
        target = path;
        break;
    }

    if (!target) return false;
    return target.toLowerCase().includes(patternLower);
  }

  /**
   * Bulk assign project to time entries in a date range
   */
  bulkAssignProject(
    projectId: number,
    dateRange: ProjectTimeRange,
    appName?: string,
    windowTitle?: string
  ): number {
    const { getDatabase } = require('../database/index');
    const db = getDatabase();

    let query = `
      UPDATE time_entries 
      SET project_id = ?
      WHERE start_time >= ? AND start_time <= ?
    `;
    const params: unknown[] = [projectId, dateRange.startDate, dateRange.endDate];

    if (appName) {
      query += ` AND application_id IN (SELECT id FROM applications WHERE name LIKE ?)`;
      params.push(`%${appName}%`);
    }

    if (windowTitle) {
      query += ` AND window_title LIKE ?`;
      params.push(`%${windowTitle}%`);
    }

    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    return result.changes;
  }

  /**
   * Remove project assignment from time entries
   */
  unassignProjectFromEntries(projectId: number): number {
    const { getDatabase } = require('../database/index');
    const db = getDatabase();

    const stmt = db.prepare('UPDATE time_entries SET project_id = NULL WHERE project_id = ?');
    const result = stmt.run(projectId);
    return result.changes;
  }

  /**
   * Re-run auto-assignment for all unassigned entries in a date range
   */
  rerunAutoAssignment(dateRange: ProjectTimeRange): number {
    const { getDatabase } = require('../database/index');
    const db = getDatabase();

    // Get unassigned entries with app info
    const stmt = db.prepare(`
      SELECT 
        te.id,
        a.name as app_name,
        te.window_title,
        a.executable_path
      FROM time_entries te
      JOIN applications a ON te.application_id = a.id
      WHERE te.project_id IS NULL
        AND te.start_time >= ? 
        AND te.start_time <= ?
    `);

    const entries = stmt.all(dateRange.startDate, dateRange.endDate) as {
      id: number;
      app_name: string;
      window_title: string | null;
      executable_path: string | null;
    }[];

    let assignedCount = 0;
    for (const entry of entries) {
      const matched = this.autoAssignProject(
        entry.id,
        entry.app_name,
        entry.window_title,
        entry.executable_path
      );
      if (matched) assignedCount++;
    }

    return assignedCount;
  }
}

export const projectsService = new ProjectsService();