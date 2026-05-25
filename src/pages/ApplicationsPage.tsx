import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AppWindow, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useIpc, useCategories } from '../hooks';
import { formatDuration } from '../lib/utils';

interface ApplicationWithTime {
  id: number;
  name: string;
  executable_path: string | null;
  total_duration: number;
  first_seen: string;
  session_count: number;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  is_tracked: boolean;
}

export function ApplicationsPage() {
  const { invoke, channels } = useIpc();
  const { categories } = useCategories();
  const [applications, setApplications] = useState<ApplicationWithTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch applications with time data
  const fetchApplications = async () => {
    setLoading(true);
    const result = await invoke<ApplicationWithTime[]>(channels.APPLICATIONS.GET_ALL_WITH_TIME);
    if (result.success && result.data) {
      setApplications(result.data);
    }
    setLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, []);

  // Filter and search applications
  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.executable_path && app.executable_path.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = selectedCategory === 'all' ||
        (selectedCategory === 'uncategorized' && !app.category_id) ||
        (app.category_id && app.category_id.toString() === selectedCategory);

      return matchesSearch && matchesCategory;
    });
  }, [applications, searchQuery, selectedCategory]);

  // Calculate totals
  const totalTime = useMemo(() => {
    return filteredApps.reduce((sum, app) => sum + app.total_duration, 0);
  }, [filteredApps]);

  const totalSessions = useMemo(() => {
    return filteredApps.reduce((sum, app) => sum + app.session_count, 0);
  }, [filteredApps]);

  // Format date for display
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AppWindow className="h-6 w-6 text-primary" />
            Applications
          </h1>
          <p className="text-muted-foreground">
            All tracked applications with usage statistics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchApplications}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Applications</div>
            <div className="text-2xl font-bold">{filteredApps.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Time Tracked</div>
            <div className="text-2xl font-bold">{formatDuration(totalTime)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Sessions</div>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Categories</option>
            <option value="uncategorized">Uncategorized</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Applications ({filteredApps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header Row */}
            <div className="grid grid-cols-[1fr_120px_100px_100px_120px] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              <div>Application</div>
              <div className="text-right">Total Time</div>
              <div className="text-right">Sessions</div>
              <div className="text-center">Category</div>
              <div className="text-right">First Seen</div>
            </div>

            {/* Application Rows */}
            {filteredApps.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No applications match your filters'
                  : 'No applications tracked yet'}
              </div>
            ) : (
              filteredApps.map((app, index) => (
                <div
                  key={app.id}
                  className={`grid grid-cols-[1fr_120px_100px_100px_120px] gap-4 px-3 py-3 items-center hover:bg-muted/50 rounded ${
                    index % 2 === 0 ? 'bg-muted/20' : ''
                  }`}
                >
                  {/* Application Name */}
                  <div className="min-w-0">
                    <div className="font-medium truncate" title={app.name}>
                      {app.name}
                    </div>
                    {app.executable_path && (
                      <div className="text-xs text-muted-foreground truncate" title={app.executable_path}>
                        {app.executable_path}
                      </div>
                    )}
                  </div>

                  {/* Total Time */}
                  <div className="text-right font-mono text-sm">
                    {formatDuration(app.total_duration)}
                  </div>

                  {/* Sessions */}
                  <div className="text-right text-sm">
                    {app.session_count}
                  </div>

                  {/* Category */}
                  <div className="text-center">
                    {app.category_name ? (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: app.category_color ? `${app.category_color}20` : undefined,
                          borderColor: app.category_color || undefined,
                          color: app.category_color || undefined
                        }}
                      >
                        {app.category_name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* First Seen */}
                  <div className="text-right text-xs text-muted-foreground">
                    {formatDate(app.first_seen)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      {filteredApps.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredApps.length} of {applications.length} applications
          {searchQuery || selectedCategory !== 'all' ? ' (filtered)' : ''}
        </div>
      )}
    </div>
  );
}