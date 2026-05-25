import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

// Types matching backend
export interface Project {
  id: number;
  name: string;
  color: string;
  client: string | null;
  hourly_rate: number | null;
  budget_hours: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ProjectRule {
  id: number;
  project_id: number;
  rule_type: 'app' | 'path' | 'window_title';
  pattern: string;
}

export interface ProjectWithRules extends Project {
  rules: ProjectRule[];
}

export interface ProjectWithStats extends Project {
  rules: ProjectRule[];
  total_time: number;
  billable_amount: number;
  budget_used_percent: number | null;
}

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

export interface ProjectTimeRange {
  startDate: string;
  endDate: string;
}

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
  isNearLimit: boolean;
}

// IPC Channels for projects
const PROJECTS_CHANNELS = {
  GET_ALL: 'projects:get-all',
  GET_ACTIVE: 'projects:get-active',
  GET_BY_ID: 'projects:get-by-id',
  GET_WITH_STATS: 'projects:get-with-stats',
  GET_ALL_WITH_STATS: 'projects:get-all-with-stats',
  CREATE: 'projects:create',
  UPDATE: 'projects:update',
  DELETE: 'projects:delete',
  ARCHIVE: 'projects:archive',
  RESTORE: 'projects:restore',
  GET_RULES: 'projects:get-rules',
  CREATE_RULE: 'projects:create-rule',
  UPDATE_RULE: 'projects:update-rule',
  DELETE_RULE: 'projects:delete-rule',
  MATCH_PROJECT: 'projects:match-project',
  GET_PROJECT_TIME: 'projects:get-project-time',
  ASSIGN_TO_ENTRY: 'projects:assign-to-entry',
  GET_BILLING_REPORT: 'projects:get-billing-report',
  GET_BUDGET_STATUS: 'projects:get-budget-status',
  GET_BUDGET_WARNINGS: 'projects:get-budget-warnings',
};

export function useProjects() {
  const { invoke } = useIpc();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects with stats
  const fetchProjects = useCallback(async (dateRange?: ProjectTimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<ProjectWithStats[]>(PROJECTS_CHANNELS.GET_ALL_WITH_STATS, dateRange);
      if (result.success && result.data) {
        setProjects(result.data);
      } else {
        setError(result.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // Fetch active projects only
  const fetchActiveProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<Project[]>(PROJECTS_CHANNELS.GET_ACTIVE);
      if (result.success && result.data) {
        // Convert to ProjectWithStats format with empty stats
        const projectsWithStats: ProjectWithStats[] = result.data.map(p => ({
          ...p,
          rules: [],
          total_time: 0,
          billable_amount: 0,
          budget_used_percent: null,
        }));
        setProjects(projectsWithStats);
      } else {
        setError(result.error || 'Failed to fetch active projects');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke]);

  // Get project by ID with rules
  const getProject = useCallback(async (id: number): Promise<ProjectWithRules | null> => {
    try {
      const result = await invoke<ProjectWithRules>(PROJECTS_CHANNELS.GET_BY_ID, id);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [invoke]);

  // Get project with stats
  const getProjectWithStats = useCallback(async (id: number, dateRange?: ProjectTimeRange): Promise<ProjectWithStats | null> => {
    try {
      const result = await invoke<ProjectWithStats>(PROJECTS_CHANNELS.GET_WITH_STATS, id, dateRange);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [invoke]);

  // Create project
  const createProject = useCallback(async (input: CreateProjectInput): Promise<Project | null> => {
    try {
      const result = await invoke<Project>(PROJECTS_CHANNELS.CREATE, input);
      if (result.success && result.data) {
        await fetchProjects(); // Refresh list
        return result.data;
      }
      setError(result.error || 'Failed to create project');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, fetchProjects]);

  // Update project
  const updateProject = useCallback(async (id: number, updates: UpdateProjectInput): Promise<Project | null> => {
    try {
      const result = await invoke<Project>(PROJECTS_CHANNELS.UPDATE, id, updates);
      if (result.success && result.data) {
        await fetchProjects(); // Refresh list
        return result.data;
      }
      setError(result.error || 'Failed to update project');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, fetchProjects]);

  // Delete project
  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    try {
      const result = await invoke<void>(PROJECTS_CHANNELS.DELETE, id);
      if (result.success) {
        await fetchProjects(); // Refresh list
        return true;
      }
      setError(result.error || 'Failed to delete project');
      return false;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, fetchProjects]);

  // Archive project
  const archiveProject = useCallback(async (id: number): Promise<boolean> => {
    try {
      const result = await invoke<Project>(PROJECTS_CHANNELS.ARCHIVE, id);
      if (result.success) {
        await fetchProjects(); // Refresh list
        return true;
      }
      setError(result.error || 'Failed to archive project');
      return false;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, fetchProjects]);

  // Restore archived project
  const restoreProject = useCallback(async (id: number): Promise<boolean> => {
    try {
      const result = await invoke<Project>(PROJECTS_CHANNELS.RESTORE, id);
      if (result.success) {
        await fetchProjects(); // Refresh list
        return true;
      }
      setError(result.error || 'Failed to restore project');
      return false;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, fetchProjects]);

  // ========== RULES ==========

  // Get rules for a project
  const getRules = useCallback(async (projectId: number): Promise<ProjectRule[]> => {
    try {
      const result = await invoke<ProjectRule[]>(PROJECTS_CHANNELS.GET_RULES, projectId);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [invoke]);

  // Create rule
  const createRule = useCallback(async (input: CreateProjectRuleInput): Promise<ProjectRule | null> => {
    try {
      const result = await invoke<ProjectRule>(PROJECTS_CHANNELS.CREATE_RULE, input);
      if (result.success && result.data) {
        return result.data;
      }
      setError(result.error || 'Failed to create rule');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke]);

  // Update rule
  const updateRule = useCallback(async (id: number, updates: { rule_type?: 'app' | 'path' | 'window_title'; pattern?: string }): Promise<ProjectRule | null> => {
    try {
      const result = await invoke<ProjectRule>(PROJECTS_CHANNELS.UPDATE_RULE, id, updates);
      if (result.success && result.data) {
        return result.data;
      }
      setError(result.error || 'Failed to update rule');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke]);

  // Delete rule
  const deleteRule = useCallback(async (id: number): Promise<boolean> => {
    try {
      const result = await invoke<void>(PROJECTS_CHANNELS.DELETE_RULE, id);
      if (result.success) {
        return true;
      }
      setError(result.error || 'Failed to delete rule');
      return false;
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke]);

  // ========== BILLING ==========

  // Get billing report
  const getBillingReport = useCallback(async (dateRange: ProjectTimeRange): Promise<BillingReport | null> => {
    try {
      const result = await invoke<BillingReport>(PROJECTS_CHANNELS.GET_BILLING_REPORT, dateRange);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [invoke]);

  // Get budget statuses
  const getBudgetStatuses = useCallback(async (dateRange?: ProjectTimeRange): Promise<BudgetStatus[]> => {
    try {
      const result = await invoke<BudgetStatus[]>(PROJECTS_CHANNELS.GET_BUDGET_STATUS, dateRange);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [invoke]);

  // Get budget warnings
  const getBudgetWarnings = useCallback(async (dateRange?: ProjectTimeRange): Promise<BudgetStatus[]> => {
    try {
      const result = await invoke<BudgetStatus[]>(PROJECTS_CHANNELS.GET_BUDGET_WARNINGS, dateRange);
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    } catch {
      return [];
    }
  }, [invoke]);

  // ========== HELPERS ==========

  // Match project for an entry
  const matchProject = useCallback(async (appName: string | null, windowTitle: string | null, path: string | null): Promise<Project | null> => {
    try {
      const result = await invoke<Project>(PROJECTS_CHANNELS.MATCH_PROJECT, appName, windowTitle, path);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [invoke]);

  // Format hours (seconds to hours string)
  const formatHours = useCallback((seconds: number): string => {
    const hours = seconds / 3600;
    return hours.toFixed(1) + 'h';
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filter helpers
  const activeProjects = projects.filter(p => p.is_active);
  const archivedProjects = projects.filter(p => !p.is_active);

  return {
    // State
    projects,
    activeProjects,
    archivedProjects,
    loading,
    error,

    // Actions
    fetchProjects,
    fetchActiveProjects,
    getProject,
    getProjectWithStats,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject,

    // Rules
    getRules,
    createRule,
    updateRule,
    deleteRule,

    // Billing
    getBillingReport,
    getBudgetStatuses,
    getBudgetWarnings,

    // Helpers
    matchProject,
    formatHours,
    formatCurrency,
  };
}