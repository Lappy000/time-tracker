import { useState, useEffect, useMemo } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Camera, Trash2, Calendar, Image, X, ZoomIn, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useScreenshots, Screenshot } from '@/hooks';
import { useApplications } from '@/hooks';
import { cn } from '@/lib/utils';

type DateFilter = 'today' | 'week' | 'month' | 'custom';

export function ScreenshotsPage() {
  const {
    screenshots,
    settings,
    stats,
    loading,
    error,
    fetchByDateRange,
    deleteScreenshot,
    deleteMultiple,
    takeManualScreenshot,
    updateSettings,
    refresh
  } = useScreenshots();
  
  const { applications } = useApplications();

  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate date range based on filter
  useEffect(() => {
    const now = new Date();
    let startDate: string;
    let endDate: string = format(now, 'yyyy-MM-dd');

    switch (dateFilter) {
      case 'today':
        startDate = format(now, 'yyyy-MM-dd');
        break;
      case 'week':
        startDate = format(subDays(now, 7), 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(subDays(now, 30), 'yyyy-MM-dd');
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          return;
        }
        break;
      default:
        startDate = format(now, 'yyyy-MM-dd');
    }

    fetchByDateRange(startDate, endDate);
  }, [dateFilter, customStartDate, customEndDate, fetchByDateRange]);

  // Filter screenshots by application
  const filteredScreenshots = useMemo(() => {
    if (selectedApp === 'all') return screenshots;
    return screenshots.filter(s => s.app_name === selectedApp);
  }, [screenshots, selectedApp]);

  // Group screenshots by date for timeline view
  const groupedScreenshots = useMemo(() => {
    const groups: Record<string, Screenshot[]> = {};
    
    filteredScreenshots.forEach(screenshot => {
      const date = format(new Date(screenshot.timestamp), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(screenshot);
    });

    // Sort by timestamp within each group
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });

    return groups;
  }, [filteredScreenshots]);

  // Get unique app names for filter
  const uniqueApps = useMemo(() => {
    const apps = new Set(screenshots.map(s => s.app_name).filter(Boolean));
    return Array.from(apps).sort();
  }, [screenshots]);

  // Handle selection toggle
  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Handle select all
  const selectAll = () => {
    if (selectedIds.size === filteredScreenshots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredScreenshots.map(s => s.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    
    const idsToDelete = Array.from(selectedIds);
    await deleteMultiple(idsToDelete);
    
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
    setIsDeleting(false);
  };

  // Handle single delete
  const handleDelete = async (id: number) => {
    await deleteScreenshot(id);
    if (selectedScreenshot?.id === id) {
      setSelectedScreenshot(null);
      setShowImageModal(false);
    }
  };

  // Handle manual screenshot
  const handleTakeScreenshot = async () => {
    const result = await takeManualScreenshot();
    if (result.success) {
      refresh();
    }
  };

  // Navigate between screenshots in modal
  const navigateScreenshot = (direction: 'prev' | 'next') => {
    if (!selectedScreenshot) return;
    
    const currentIndex = filteredScreenshots.findIndex(s => s.id === selectedScreenshot.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < filteredScreenshots.length) {
      setSelectedScreenshot(filteredScreenshots[newIndex]);
    }
  };

  // Get file URL for display (using custom local-file:// protocol)
  const getFileUrl = (filePath: string | null | undefined): string => {
    if (!filePath) return '';
    // Already a URL (but convert file:// to local-file://)
    if (filePath.startsWith('file://')) {
      return filePath.replace('file://', 'local-file://');
    }
    if (filePath.startsWith('http') || filePath.startsWith('local-file://')) {
      return filePath;
    }
    // Convert Windows path to local-file:// URL format
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `local-file://${encodeURI(normalizedPath).replace(/\?/g, '%3F').replace(/#/g, '%23')}`;
  };

  // Placeholder SVG for broken/missing images
  const placeholderImage = 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
      <rect fill="#1f2937" width="200" height="150"/>
      <text x="50%" y="50%" fill="#6b7280" font-size="14" text-anchor="middle" dy=".3em">No Preview</text>
    </svg>
  `);

  if (!settings.screenshots_enabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Screenshots</h1>
          <p className="text-muted-foreground">
            View captured screenshots of your activity
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Screenshots are disabled</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Enable screenshots in Settings to capture periodic snapshots of your activity.
                This feature is opt-in for privacy reasons.
              </p>
              <Button onClick={() => updateSettings({ screenshots_enabled: true })}>
                Enable Screenshots
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Screenshots</h1>
          <p className="text-muted-foreground">
            View captured screenshots of your activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTakeScreenshot}>
            <Camera className="h-4 w-4 mr-2" />
            Take Screenshot
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-36"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-36"
                />
              </>
            )}

            {/* App Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All apps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All applications</SelectItem>
                  {uniqueApps.map(app => (
                    <SelectItem key={app} value={app!}>{app}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Screenshots</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{filteredScreenshots.length}</div>
              <div className="text-sm text-muted-foreground">In Current View</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{uniqueApps.length}</div>
              <div className="text-sm text-muted-foreground">Applications</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{Object.keys(groupedScreenshots).length}</div>
              <div className="text-sm text-muted-foreground">Days with Activity</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Screenshots Grid / Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredScreenshots.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Image className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No screenshots found</h3>
              <p className="text-muted-foreground">
                No screenshots match your current filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Select All */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              {selectedIds.size === filteredScreenshots.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Timeline Groups */}
          {Object.entries(groupedScreenshots)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateScreenshots]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-sm font-medium text-muted-foreground px-2">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  <Badge variant="secondary">{dateScreenshots.length}</Badge>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {dateScreenshots.map(screenshot => (
                    <div
                      key={screenshot.id}
                      className={cn(
                        "group relative rounded-lg border overflow-hidden cursor-pointer transition-all",
                        selectedIds.has(screenshot.id) && "ring-2 ring-primary"
                      )}
                      onClick={() => {
                        setSelectedScreenshot(screenshot);
                        setShowImageModal(true);
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-muted relative">
                        <img
                          src={getFileUrl(screenshot.thumbnail_path || screenshot.file_path)}
                          alt={screenshot.window_title || 'Screenshot'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            // Prevent infinite loop if placeholder also fails
                            if (!target.dataset.fallback) {
                              target.dataset.fallback = 'true';
                              target.src = placeholderImage;
                            }
                          }}
                        />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="h-8 w-8 text-white" />
                        </div>

                        {/* Selection Checkbox */}
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(screenshot.id);
                          }}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            selectedIds.has(screenshot.id) 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-white bg-black/20"
                          )}>
                            {selectedIds.has(screenshot.id) && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2">
                        <div className="text-xs font-medium truncate">
                          {screenshot.app_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(screenshot.timestamp), 'HH:mm:ss')}
                        </div>
                        {screenshot.category_name && (
                          <Badge 
                            variant="secondary" 
                            className="mt-1 text-[10px]"
                            style={{ 
                              backgroundColor: `${screenshot.category_color}20`,
                              color: screenshot.category_color 
                            }}
                          >
                            {screenshot.category_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedScreenshot?.app_name || 'Screenshot'}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {selectedScreenshot && format(new Date(selectedScreenshot.timestamp), 'PPpp')}
              </span>
            </DialogTitle>
            {selectedScreenshot?.window_title && (
              <DialogDescription className="truncate">
                {selectedScreenshot.window_title}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="relative flex-1 min-h-0 overflow-auto">
            {selectedScreenshot && (
              <img
                src={getFileUrl(selectedScreenshot.file_path)}
                alt={selectedScreenshot.window_title || 'Screenshot'}
                className="w-full h-auto"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'true';
                    target.src = placeholderImage;
                  }
                }}
              />
            )}
            
            {/* Navigation Buttons */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100"
              onClick={() => navigateScreenshot('prev')}
              disabled={!selectedScreenshot || filteredScreenshots.findIndex(s => s.id === selectedScreenshot.id) === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-75 hover:opacity-100"
              onClick={() => navigateScreenshot('next')}
              disabled={!selectedScreenshot || filteredScreenshots.findIndex(s => s.id === selectedScreenshot.id) === filteredScreenshots.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => selectedScreenshot && handleDelete(selectedScreenshot.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Screenshots</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} screenshot{selectedIds.size !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}