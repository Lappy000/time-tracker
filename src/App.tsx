import { useState, useEffect, useCallback } from 'react';
import { TitleBar, TrackingControl, TodayStats, TopApps, Navigation, CommandPalette, Onboarding, type Page } from './components';
import { CategoriesPage } from './pages/CategoriesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { GoalsPage } from './pages/GoalsPage';
import { FocusPage } from './pages/FocusPage';
import { ScreenshotsPage } from './pages/ScreenshotsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { useIpc, useTracking } from './hooks';
import { ThemeProvider } from './lib/ThemeProvider';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { on, channels, invoke } = useIpc();
  const { isTracking, startTracking, stopTracking } = useTracking();

  // Check if onboarding is needed
  useEffect(() => {
    invoke<boolean>(channels.APP.GET_ONBOARDING_STATUS).then(result => {
      if (result.success && result.data === false) {
        setShowOnboarding(true);
      }
    });
  }, [invoke, channels]);

  // Handle navigation from tray menu or keyboard shortcuts
  useEffect(() => {
    const unsubscribe = on(channels.APP.NAVIGATE, (page: unknown) => {
      if (typeof page === 'string' && ['dashboard', 'categories', 'analytics', 'goals', 'focus', 'screenshots', 'projects', 'calendar', 'applications', 'settings'].includes(page)) {
        setCurrentPage(page as Page);
      }
    });
    return unsubscribe;
  }, [on, channels]);

  // Toggle tracking handler
  const handleToggleTracking = useCallback(() => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  }, [isTracking, startTracking, stopTracking]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette: Ctrl+K or Ctrl+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Alt shortcuts for navigation
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            setCurrentPage('dashboard');
            break;
          case 't':
            setCurrentPage('categories');
            break;
          case 'j':
            setCurrentPage('projects');
            break;
          case 'c':
            setCurrentPage('calendar');
            break;
          case 'a':
            setCurrentPage('analytics');
            break;
          case 'g':
            setCurrentPage('goals');
            break;
          case 'f':
            setCurrentPage('focus');
            break;
          case 'p':
            setCurrentPage('screenshots');
            break;
          case 'l':
            setCurrentPage('applications');
            break;
          case 's':
            setCurrentPage('settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TitleBar />
      
      <div className="flex flex-1 overflow-hidden">
        <Navigation
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
        
        <main className="flex-1 overflow-auto">
          <div className={
            currentPage === 'calendar'
              ? ''
              : currentPage === 'analytics'
                ? 'max-w-7xl mx-auto p-6'
                : 'max-w-4xl mx-auto p-6'
          }>
            {currentPage === 'dashboard' && <DashboardPage />}
            {currentPage === 'categories' && <CategoriesPage />}
            {currentPage === 'projects' && <ProjectsPage />}
            {currentPage === 'calendar' && <CalendarPage />}
            {currentPage === 'analytics' && <AnalyticsPageComponent />}
            {currentPage === 'applications' && <ApplicationsPage />}
            {currentPage === 'goals' && <GoalsPage />}
            {currentPage === 'focus' && <FocusPage />}
            {currentPage === 'screenshots' && <ScreenshotsPage />}
            {currentPage === 'settings' && <SettingsPageComponent />}
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={setCurrentPage}
        isTracking={isTracking}
        onToggleTracking={handleToggleTracking}
      />

      {/* Onboarding */}
      <Onboarding
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// Dashboard Page (existing content)
function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Track your time and boost productivity
        </p>
      </div>

      {/* Tracking Control */}
      <TrackingControl />

      {/* Today's Stats */}
      <TodayStats />

      {/* Top Apps */}
      <TopApps />
    </div>
  );
}

// Analytics Page Component wrapper
function AnalyticsPageComponent() {
  return <AnalyticsPage />;
}

// Settings Page Component wrapper
function SettingsPageComponent() {
  return <SettingsPage />;
}

export default App;