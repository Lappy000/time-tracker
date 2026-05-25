import { useState } from 'react';
import { FolderPlus, Monitor } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { type Category, getProductivityLabel } from '../hooks/useCategories';
import type { ApplicationWithCategory } from '../hooks/useApplications';

interface CategoryAppsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  applications: ApplicationWithCategory[];
  categories: Category[];
  onAssignApp: (appId: number, categoryId: number | null) => Promise<boolean>;
}

export function CategoryApps({
  open,
  onOpenChange,
  category,
  applications,
  categories,
  onAssignApp,
}: CategoryAppsProps) {
  const [assigningApp, setAssigningApp] = useState<number | null>(null);

  // Get apps assigned to this category
  const assignedApps = category
    ? applications.filter((app) => app.category_id === category.id)
    : [];

  // Get unassigned apps
  const unassignedApps = applications.filter((app) => !app.category_id);

  const handleCategoryChange = async (appId: number, categoryId: string) => {
    setAssigningApp(appId);
    try {
      await onAssignApp(appId, categoryId === 'unassigned' ? null : Number(categoryId));
    } finally {
      setAssigningApp(null);
    }
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
              style={{ backgroundColor: category.color }}
            >
              {category.icon}
            </span>
            {category.name} Applications
          </DialogTitle>
          <DialogDescription>
            Manage applications assigned to this category. 
            {category.productivity_score !== 0 && (
              <span> Time spent on these apps is marked as{' '}
                <strong>{getProductivityLabel(category.productivity_score).toLowerCase()}</strong>.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Assigned Applications */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <span>Assigned Applications</span>
              <Badge variant="secondary">{assignedApps.length}</Badge>
            </h4>
            {assignedApps.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center">
                No applications assigned to this category yet.
              </div>
            ) : (
              <div className="space-y-2">
                {assignedApps.map((app) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    categories={categories}
                    onCategoryChange={handleCategoryChange}
                    isLoading={assigningApp === app.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Unassigned Applications */}
          {unassignedApps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <span>Unassigned Applications</span>
                <Badge variant="outline">{unassignedApps.length}</Badge>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {unassignedApps.map((app) => (
                  <AppRow
                    key={app.id}
                    app={app}
                    categories={categories}
                    onCategoryChange={handleCategoryChange}
                    isLoading={assigningApp === app.id}
                    isUnassigned
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AppRowProps {
  app: ApplicationWithCategory;
  categories: Category[];
  onCategoryChange: (appId: number, categoryId: string) => Promise<void>;
  isLoading: boolean;
  isUnassigned?: boolean;
}

function AppRow({ 
  app, 
  categories, 
  onCategoryChange, 
  isLoading,
  isUnassigned 
}: AppRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
          <Monitor className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{app.name}</p>
          {app.last_seen && (
            <p className="text-xs text-muted-foreground">
              Last seen: {new Date(app.last_seen).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isUnassigned && (
          <FolderPlus className="h-4 w-4 text-muted-foreground" />
        )}
        <Select
          value={app.category_id?.toString() ?? 'unassigned'}
          onValueChange={(value) => onCategoryChange(app.id, value)}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[160px] h-8">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">
              <span className="flex items-center gap-2 text-muted-foreground">
                Unassigned
              </span>
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.icon} {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Standalone component to show all unassigned apps
export function UnassignedAppsCard({
  applications,
  categories,
  onAssignApp,
}: {
  applications: ApplicationWithCategory[];
  categories: Category[];
  onAssignApp: (appId: number, categoryId: number | null) => Promise<boolean>;
}) {
  const [assigningApp, setAssigningApp] = useState<number | null>(null);
  const unassignedApps = applications.filter((app) => !app.category_id);

  const handleCategoryChange = async (appId: number, categoryId: string) => {
    setAssigningApp(appId);
    try {
      await onAssignApp(appId, categoryId === 'unassigned' ? null : Number(categoryId));
    } finally {
      setAssigningApp(null);
    }
  };

  if (unassignedApps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderPlus className="h-4 w-4" />
          Unassigned Applications
          <Badge variant="outline">{unassignedApps.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
          {unassignedApps.map((app) => (
            <AppRow
              key={app.id}
              app={app}
              categories={categories}
              onCategoryChange={handleCategoryChange}
              isLoading={assigningApp === app.id}
              isUnassigned
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}