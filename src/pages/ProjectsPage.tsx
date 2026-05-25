import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, Filter, Archive } from 'lucide-react';
import { ProjectForm, ProjectCard, ProjectRules, BillingReport } from '@/components/projects';
import {
  useProjects,
  type ProjectWithStats,
  type ProjectRule,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateProjectRuleInput,
  type BillingReport as BillingReportType,
  type ProjectTimeRange,
} from '@/hooks';

type ViewMode = 'grid' | 'list';
type FilterMode = 'active' | 'archived' | 'all';
type ModalMode = 'form' | 'rules' | 'billing' | null;

export function ProjectsPage() {
  const {
    projects,
    activeProjects,
    archivedProjects,
    loading,
    error,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject,
    getRules,
    createRule,
    deleteRule,
    getBillingReport,
  } = useProjects();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [projectRules, setProjectRules] = useState<ProjectRule[]>([]);
  const [billingReport, setBillingReport] = useState<BillingReportType | null>(null);
  const [filter, setFilter] = useState<FilterMode>('active');
  const [billingDateRange, setBillingDateRange] = useState<ProjectTimeRange>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstDay.toISOString(),
      endDate: lastDay.toISOString(),
    };
  });

  // Filter projects based on selected filter
  const filteredProjects = filter === 'active'
    ? activeProjects
    : filter === 'archived'
    ? archivedProjects
    : projects;

  // Handle opening form for new project
  const handleNewProject = () => {
    setSelectedProject(null);
    setModalMode('form');
  };

  // Handle editing a project
  const handleEditProject = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setModalMode('form');
  };

  // Handle viewing project rules
  const handleViewRules = async (project: ProjectWithStats) => {
    setSelectedProject(project);
    const rules = await getRules(project.id);
    setProjectRules(rules);
    setModalMode('rules');
  };

  // Handle opening billing report
  const handleOpenBilling = async () => {
    const report = await getBillingReport(billingDateRange);
    setBillingReport(report);
    setModalMode('billing');
  };

  // Handle saving project (create or update)
  const handleSaveProject = async (data: CreateProjectInput | UpdateProjectInput) => {
    if (selectedProject) {
      await updateProject(selectedProject.id, data as UpdateProjectInput);
    } else {
      await createProject(data as CreateProjectInput);
    }
    setModalMode(null);
    setSelectedProject(null);
  };

  // Handle deleting a project
  const handleDeleteProject = async (id: number) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      await deleteProject(id);
    }
  };

  // Handle archiving a project
  const handleArchiveProject = async (id: number) => {
    await archiveProject(id);
  };

  // Handle restoring a project
  const handleRestoreProject = async (id: number) => {
    await restoreProject(id);
  };

  // Handle creating a rule
  const handleCreateRule = async (input: CreateProjectRuleInput): Promise<ProjectRule | null> => {
    const result = await createRule(input);
    if (result && selectedProject) {
      setProjectRules([...projectRules, result]);
    }
    return result;
  };

  // Handle deleting a rule
  const handleDeleteRule = async (id: number): Promise<boolean> => {
    const success = await deleteRule(id);
    if (success) {
      setProjectRules(projectRules.filter((r) => r.id !== id));
    }
    return success;
  };

  // Handle billing date range change
  const handleBillingDateRangeChange = async (range: ProjectTimeRange) => {
    setBillingDateRange(range);
    const report = await getBillingReport(range);
    setBillingReport(report);
  };

  // Close modal
  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedProject(null);
    setProjectRules([]);
    setBillingReport(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">
            Manage projects and track time per project
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenBilling}>
            <DollarSign className="h-4 w-4 mr-2" />
            Billing Report
          </Button>
          <Button onClick={handleNewProject}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1">
          <Button
            variant={filter === 'active' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active ({activeProjects.length})
          </Button>
          <Button
            variant={filter === 'archived' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('archived')}
          >
            <Archive className="h-4 w-4 mr-1" />
            Archived ({archivedProjects.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({projects.length})
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading projects...
        </div>
      )}

      {/* Projects grid */}
      {!loading && filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {filter === 'archived'
              ? 'No archived projects.'
              : 'No projects yet. Create your first project to start tracking time.'}
          </p>
          {filter !== 'archived' && (
            <Button onClick={handleNewProject}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEditProject}
              onArchive={handleArchiveProject}
              onRestore={handleRestoreProject}
              onDelete={handleDeleteProject}
              onViewRules={handleViewRules}
            />
          ))}
        </div>
      )}

      {/* Modal overlay */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative z-10 w-full max-w-lg mx-4">
            {modalMode === 'form' && (
              <ProjectForm
                project={selectedProject}
                onSave={handleSaveProject}
                onCancel={handleCloseModal}
              />
            )}
            {modalMode === 'rules' && selectedProject && (
              <ProjectRules
                project={selectedProject}
                rules={projectRules}
                onCreateRule={handleCreateRule}
                onDeleteRule={handleDeleteRule}
                onClose={handleCloseModal}
              />
            )}
            {modalMode === 'billing' && (
              <div className="max-w-2xl">
                <BillingReport
                  report={billingReport}
                  dateRange={billingDateRange}
                  onDateRangeChange={handleBillingDateRangeChange}
                  onClose={handleCloseModal}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}