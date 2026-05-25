import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, AlertCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { CategoryForm } from '../components/CategoryForm';
import { CategoryApps, UnassignedAppsCard } from '../components/CategoryApps';
import {
  useCategories,
  getProductivityLabel,
  formatDuration,
  type CategoryInput,
  type CategoryWithStats
} from '../hooks/useCategories';
import { useApplications } from '../hooks/useApplications';

export function CategoriesPage() {
  const {
    categories,
    loading,
    error,
    fetchCategoriesWithStats,
    createCategory,
    updateCategory,
    deleteCategory,
    clearError
  } = useCategories();

  // Fetch categories with stats on mount
  useEffect(() => {
    fetchCategoriesWithStats();
  }, [fetchCategoriesWithStats]);
  
  const { 
    applications, 
    updateApplicationCategory 
  } = useApplications();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithStats | null>(null);
  const [appsDialogOpen, setAppsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithStats | null>(null);

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEditCategory = (category: CategoryWithStats) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleDeleteClick = (category: CategoryWithStats) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete.id);
      await fetchCategoriesWithStats(); // Refresh with stats
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleViewApps = (category: CategoryWithStats) => {
    setSelectedCategory(category);
    setAppsDialogOpen(true);
  };

  const handleSaveCategory = async (data: CategoryInput) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
    } else {
      await createCategory(data);
    }
    await fetchCategoriesWithStats(); // Refresh with stats after save
  };

  const getProductivityBadgeVariant = (score: number) => {
    if (score > 0) return 'productive' as const;
    if (score < 0) return 'distracting' as const;
    return 'neutral' as const;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Organize applications into categories to track productivity
          </p>
        </div>
        <Button onClick={handleCreateCategory} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearError}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            productivityBadgeVariant={getProductivityBadgeVariant(category.productivity_score)}
            onEdit={() => handleEditCategory(category)}
            onDelete={() => handleDeleteClick(category)}
            onViewApps={() => handleViewApps(category)}
          />
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground space-y-2">
            <FolderOpen className="h-12 w-12 mx-auto opacity-50" />
            <h3 className="text-lg font-medium">No categories yet</h3>
            <p className="text-sm">
              Create your first category to start organizing applications.
            </p>
            <Button onClick={handleCreateCategory} className="mt-4">
              Create Category
            </Button>
          </div>
        </Card>
      )}

      {/* Unassigned Apps Section */}
      <UnassignedAppsCard
        applications={applications}
        categories={categories}
        onAssignApp={updateApplicationCategory}
      />

      {/* Category Form Dialog */}
      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        existingNames={categories.map((c) => c.name)}
      />

      {/* Apps Assignment Dialog */}
      <CategoryApps
        open={appsDialogOpen}
        onOpenChange={setAppsDialogOpen}
        category={selectedCategory}
        applications={applications}
        categories={categories}
        onAssignApp={updateApplicationCategory}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"?
              Applications in this category will become unassigned.
              {categoryToDelete?.is_default && (
                <span className="block mt-2 text-warning">
                  Note: Default categories cannot be deleted.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={categoryToDelete?.is_default}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CategoryCardProps {
  category: CategoryWithStats;
  productivityBadgeVariant: 'productive' | 'distracting' | 'neutral';
  onEdit: () => void;
  onDelete: () => void;
  onViewApps: () => void;
}

function CategoryCard({
  category,
  productivityBadgeVariant,
  onEdit,
  onDelete,
  onViewApps,
}: CategoryCardProps) {
  const appCount = category.app_count ?? 0;
  const totalDuration = category.total_duration ?? 0;
  
  return (
    <Card className="group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: category.color + '20' }}
            >
              <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}>
                {category.icon || '📁'}
              </span>
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {category.name}
                {category.is_default && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
              </CardTitle>
              <div
                className="w-16 h-1 rounded-full mt-1.5"
                style={{ backgroundColor: category.color }}
              />
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {!category.is_default && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={productivityBadgeVariant}>
            {getProductivityLabel(category.productivity_score)}
          </Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(totalDuration)}
          </span>
          <span className="text-sm text-muted-foreground">
            •
          </span>
          <span className="text-sm text-muted-foreground">
            {appCount} {appCount === 1 ? 'app' : 'apps'}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewApps}
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Manage Apps
        </Button>
      </CardContent>
    </Card>
  );
}