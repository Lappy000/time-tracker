import { ipcMain, app, BrowserWindow, IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import { IPC_CHANNELS } from './channels';
import { initDatabase, closeDatabase } from '../database';
import {
  SessionRepository,
  ApplicationRepository,
  TimeEntryRepository,
  CategoryRepository,
  SettingsRepository,
  GoalRepository,
  FocusSessionRepository,
  LimitsRepository,
  ScreenshotsRepository,
  ProjectsRepository,
  CalendarRepository,
  PrivacyRepository,
  type AppSettings,
  type CreateGoalInput,
  type UpdateGoalInput,
  type CreateFocusSessionInput,
  type CreateProjectInput,
  type UpdateProjectInput,
  type CreateProjectRuleInput,
  type ProjectTimeRange,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
  type CalendarDateRange,
  type CreateExcludedAppInput,
  type CreateExcludedPatternInput
} from '../database/repositories';
import type { CategoryLimit, ShortcutId } from '../database/schema';
import { trackingService, limitsService, screenshotService, notificationsService, projectsService, calendarService, shortcutsService, idleDetector, type ScreenshotSettings, type NotificationPayload } from '../services';
import { setAutoLaunch } from '../auto-launch';

// Type for category creation (matches schema Category type without id and created_at)
interface CreateCategoryInput {
  name: string;
  color: string;
  icon: string | null;
  is_productive: boolean;
  productivity_score: number;
  is_default: boolean;
}

// Type for category updates
interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string | null;
  is_productive?: boolean;
  productivity_score?: number;
}

export function registerIpcHandlers(): void {
  // Initialize database
  initDatabase();

  // ========== TRACKING HANDLERS ==========
  
  // Start tracking session
  ipcMain.handle(IPC_CHANNELS.TRACKING.START, async () => {
    try {
      const success = await trackingService.startTracking();
      if (success) {
        const state = trackingService.getState();
        return { success: true, data: state };
      }
      return { success: false, error: 'Failed to start tracking' };
    } catch (error) {
      console.error('Failed to start tracking:', error);
      return { success: false, error: String(error) };
    }
  });

  // Stop tracking session
  ipcMain.handle(IPC_CHANNELS.TRACKING.STOP, async () => {
    try {
      await trackingService.stopTracking();
      return { success: true };
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get current tracking status
  ipcMain.handle(IPC_CHANNELS.TRACKING.GET_STATUS, async () => {
    try {
      const session = SessionRepository.getCurrent();
      const stats = TimeEntryRepository.getTodayStats();
      const trackingState = trackingService.getState();
      return {
        success: true,
        data: {
          isTracking: trackingState.isTracking,
          isIdle: trackingState.isIdle,
          currentApp: trackingState.currentApp,
          currentSession: session || null,
          todayStats: stats
        }
      };
    } catch (error) {
      console.error('Failed to get tracking status:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== ANALYTICS HANDLERS ==========

  // Get today's summary
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_TODAY, async () => {
    try {
      const stats = TimeEntryRepository.getTodayStats();
      const topAppsRaw = ApplicationRepository.getTopApps(10);
      const sessions = SessionRepository.getToday();
      const today = new Date().toISOString().split('T')[0];
      const hourlyBreakdown = TimeEntryRepository.getHourlyBreakdown(today);
      
      // Flatten topApps structure for frontend compatibility
      const topApps = topAppsRaw.map(item => ({
        id: item.application.id,
        name: item.application.name,
        total_duration: item.total_duration,
        category_name: item.application.category_name || null,
        category_color: item.application.category_color || null
      }));
      
      return {
        success: true,
        data: {
          stats,
          topApps,
          sessions,
          hourlyBreakdown
        }
      };
    } catch (error) {
      console.error('Failed to get today analytics:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get analytics by date range
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_RANGE, async (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
    try {
      const entries = TimeEntryRepository.getByDateRange(startDate, endDate);
      const sessions = SessionRepository.getByDateRange(startDate, endDate);
      const topAppsRaw = ApplicationRepository.getTopApps(10, startDate, endDate);
      
      // Flatten topApps structure for frontend compatibility
      const topApps = topAppsRaw.map(item => ({
        id: item.application.id,
        name: item.application.name,
        total_duration: item.total_duration,
        category_name: item.application.category_name || null,
        category_color: item.application.category_color || null
      }));
      
      return {
        success: true,
        data: {
          entries,
          sessions,
          topApps
        }
      };
    } catch (error) {
      console.error('Failed to get range analytics:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get top applications
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_TOP_APPS, async (_event: IpcMainInvokeEvent, limit: number = 10) => {
    try {
      const topAppsRaw = ApplicationRepository.getTopApps(limit);
      // Flatten structure for frontend compatibility
      const topApps = topAppsRaw.map(item => ({
        id: item.application.id,
        name: item.application.name,
        total_duration: item.total_duration,
        category_name: item.application.category_name || null,
        category_color: item.application.category_color || null
      }));
      return { success: true, data: topApps };
    } catch (error) {
      console.error('Failed to get top apps:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get category statistics
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_CATEGORIES, async () => {
    try {
      const categoryStats = CategoryRepository.getUsageStats();
      return { success: true, data: categoryStats };
    } catch (error) {
      console.error('Failed to get category stats:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get hourly breakdown
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_HOURLY, async (_event: IpcMainInvokeEvent, date: string) => {
    try {
      const hourlyBreakdown = TimeEntryRepository.getHourlyBreakdown(date);
      return { success: true, data: hourlyBreakdown };
    } catch (error) {
      console.error('Failed to get hourly breakdown:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get hourly breakdown by category
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_HOURLY_BY_CATEGORY, async (_event: IpcMainInvokeEvent, date: string) => {
    try {
      const hourlyBreakdown = TimeEntryRepository.getHourlyBreakdownByCategory(date);
      return { success: true, data: hourlyBreakdown };
    } catch (error) {
      console.error('Failed to get hourly breakdown by category:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get daily breakdown for date range
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_DAILY, async (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
    try {
      const dailyBreakdown = TimeEntryRepository.getDailyBreakdown(startDate, endDate);
      return { success: true, data: dailyBreakdown };
    } catch (error) {
      console.error('Failed to get daily breakdown:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get daily breakdown by category for date range
  ipcMain.handle(IPC_CHANNELS.ANALYTICS.GET_DAILY_BY_CATEGORY, async (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
    try {
      const dailyBreakdown = TimeEntryRepository.getDailyBreakdownByCategory(startDate, endDate);
      return { success: true, data: dailyBreakdown };
    } catch (error) {
      console.error('Failed to get daily breakdown by category:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== SETTINGS HANDLERS ==========

  // Get all settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async () => {
    try {
      const settings = SettingsRepository.getAppSettings();
      return { success: true, data: settings };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS.UPDATE, async (_event: IpcMainInvokeEvent, updates: Partial<AppSettings>) => {
    try {
      SettingsRepository.updateAppSettings(updates);
      
      // Handle auto_start setting change
      if (updates.auto_start !== undefined) {
        setAutoLaunch(updates.auto_start);
      }
      
      // Handle idle_detection_enabled setting change
      if (updates.idle_detection_enabled !== undefined) {
        const trackingState = trackingService.getState();
        if (updates.idle_detection_enabled && trackingState.isTracking) {
          // Start idle detector if tracking is active
          idleDetector.start();
        } else if (!updates.idle_detection_enabled) {
          // Stop idle detector
          idleDetector.stop();
        }
      }
      
      const settings = SettingsRepository.getAppSettings();
      return { success: true, data: settings };
    } catch (error) {
      console.error('Failed to update settings:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== CATEGORY HANDLERS ==========

  // Get all categories
  ipcMain.handle(IPC_CHANNELS.CATEGORIES.GET_ALL, async () => {
    try {
      const categories = CategoryRepository.getAll();
      return { success: true, data: categories };
    } catch (error) {
      console.error('Failed to get categories:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get all categories with usage stats (time spent and app count)
  ipcMain.handle(IPC_CHANNELS.CATEGORIES.GET_WITH_STATS, async () => {
    try {
      const categoryStats = CategoryRepository.getUsageStats();
      // Flatten the structure for frontend compatibility
      const result = categoryStats.map(item => ({
        ...item.category,
        total_duration: item.total_duration,
        app_count: item.app_count
      }));
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get categories with stats:', error);
      return { success: false, error: String(error) };
    }
  });

  // Create category
  ipcMain.handle(IPC_CHANNELS.CATEGORIES.CREATE, async (_event: IpcMainInvokeEvent, category: CreateCategoryInput) => {
    try {
      const newCategory = CategoryRepository.create(category);
      return { success: true, data: newCategory };
    } catch (error) {
      console.error('Failed to create category:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update category
  ipcMain.handle(IPC_CHANNELS.CATEGORIES.UPDATE, async (_event: IpcMainInvokeEvent, id: number, updates: UpdateCategoryInput) => {
    try {
      CategoryRepository.update(id, updates);
      const category = CategoryRepository.getById(id);
      return { success: true, data: category };
    } catch (error) {
      console.error('Failed to update category:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete category
  ipcMain.handle(IPC_CHANNELS.CATEGORIES.DELETE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      CategoryRepository.delete(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete category:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== APPLICATION HANDLERS ==========

  // Get all applications
  ipcMain.handle(IPC_CHANNELS.APPLICATIONS.GET_ALL, async () => {
    try {
      const apps = ApplicationRepository.getAll();
      return { success: true, data: apps };
    } catch (error) {
      console.error('Failed to get applications:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get all applications with time data
  ipcMain.handle(IPC_CHANNELS.APPLICATIONS.GET_ALL_WITH_TIME, async (_event: IpcMainInvokeEvent, startDate?: string, endDate?: string) => {
    try {
      const apps = ApplicationRepository.getAllWithTime(startDate, endDate);
      // Flatten structure for frontend compatibility
      const result = apps.map(item => ({
        id: item.application.id,
        name: item.application.name,
        executable_path: item.application.executable_path,
        total_duration: item.total_duration,
        first_seen: item.first_seen,
        session_count: item.session_count,
        category_id: item.application.category_id,
        category_name: item.application.category_name || null,
        category_color: item.application.category_color || null,
        is_tracked: item.application.is_tracked
      }));
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get applications with time:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update application category
  ipcMain.handle(IPC_CHANNELS.APPLICATIONS.UPDATE_CATEGORY, async (_event: IpcMainInvokeEvent, appId: number, categoryId: number | null) => {
    try {
      ApplicationRepository.updateCategory(appId, categoryId);
      return { success: true };
    } catch (error) {
      console.error('Failed to update app category:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set application tracked status
  ipcMain.handle(IPC_CHANNELS.APPLICATIONS.SET_TRACKED, async (_event: IpcMainInvokeEvent, appId: number, isTracked: boolean) => {
    try {
      ApplicationRepository.setTracked(appId, isTracked);
      return { success: true };
    } catch (error) {
      console.error('Failed to set tracked status:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== GOALS HANDLERS ==========

  // Get all goals
  ipcMain.handle(IPC_CHANNELS.GOALS.GET_ALL, async () => {
    try {
      const goals = GoalRepository.getAll();
      return { success: true, data: goals };
    } catch (error) {
      console.error('Failed to get goals:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get active goals
  ipcMain.handle(IPC_CHANNELS.GOALS.GET_ACTIVE, async () => {
    try {
      const goals = GoalRepository.getActive();
      return { success: true, data: goals };
    } catch (error) {
      console.error('Failed to get active goals:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get goal by ID
  ipcMain.handle(IPC_CHANNELS.GOALS.GET_BY_ID, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const goal = GoalRepository.getById(id);
      return { success: true, data: goal };
    } catch (error) {
      console.error('Failed to get goal:', error);
      return { success: false, error: String(error) };
    }
  });

  // Create goal
  ipcMain.handle(IPC_CHANNELS.GOALS.CREATE, async (_event: IpcMainInvokeEvent, input: CreateGoalInput) => {
    try {
      console.log('Received goal creation request:', JSON.stringify(input));
      
      // Basic validation
      if (!input.name) {
        throw new Error('Goal name is required');
      }
      
      const goal = GoalRepository.create(input);
      return { success: true, data: goal };
    } catch (error) {
      console.error('Failed to create goal:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update goal
  ipcMain.handle(IPC_CHANNELS.GOALS.UPDATE, async (_event: IpcMainInvokeEvent, id: number, updates: UpdateGoalInput) => {
    try {
      GoalRepository.update(id, updates);
      const goal = GoalRepository.getById(id);
      return { success: true, data: goal };
    } catch (error) {
      console.error('Failed to update goal:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete goal
  ipcMain.handle(IPC_CHANNELS.GOALS.DELETE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      GoalRepository.delete(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete goal:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set goal active status
  ipcMain.handle(IPC_CHANNELS.GOALS.SET_ACTIVE, async (_event: IpcMainInvokeEvent, id: number, isActive: boolean) => {
    try {
      GoalRepository.setActive(id, isActive);
      return { success: true };
    } catch (error) {
      console.error('Failed to set goal active status:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get goal progress
  ipcMain.handle(IPC_CHANNELS.GOALS.GET_PROGRESS, async (_event: IpcMainInvokeEvent, goalId: number, date?: string) => {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const progress = GoalRepository.getProgress(goalId, targetDate);
      return { success: true, data: progress };
    } catch (error) {
      console.error('Failed to get goal progress:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update goal progress
  ipcMain.handle(IPC_CHANNELS.GOALS.UPDATE_PROGRESS, async (_event: IpcMainInvokeEvent, goalId: number, minutes: number, date?: string) => {
    try {
      GoalRepository.updateProgress(goalId, minutes, date);
      const goal = GoalRepository.getById(goalId);
      return { success: true, data: goal };
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get limit warnings
  ipcMain.handle(IPC_CHANNELS.GOALS.GET_WARNINGS, async () => {
    try {
      const warnings = GoalRepository.getLimitWarnings();
      return { success: true, data: warnings };
    } catch (error) {
      console.error('Failed to get limit warnings:', error);
      return { success: false, error: String(error) };
    }
  });

  // Sync all goals progress
  ipcMain.handle(IPC_CHANNELS.GOALS.SYNC_PROGRESS, async (_event: IpcMainInvokeEvent, date?: string) => {
    try {
      GoalRepository.syncAllProgress(date);
      const goals = GoalRepository.getActive();
      return { success: true, data: goals };
    } catch (error) {
      console.error('Failed to sync goals progress:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== FOCUS SESSION HANDLERS ==========

  // Get all focus sessions
  ipcMain.handle(IPC_CHANNELS.FOCUS.GET_ALL, async () => {
    try {
      const sessions = FocusSessionRepository.getAll();
      return { success: true, data: sessions };
    } catch (error) {
      console.error('Failed to get focus sessions:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get focus session by ID
  ipcMain.handle(IPC_CHANNELS.FOCUS.GET_BY_ID, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const session = FocusSessionRepository.getById(id);
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to get focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get active focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.GET_ACTIVE, async () => {
    try {
      const session = FocusSessionRepository.getActive();
      return { success: true, data: session || null };
    } catch (error) {
      console.error('Failed to get active focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get today's focus sessions
  ipcMain.handle(IPC_CHANNELS.FOCUS.GET_TODAY, async () => {
    try {
      const sessions = FocusSessionRepository.getToday();
      const stats = FocusSessionRepository.getTodayStats();
      return { success: true, data: { sessions, stats } };
    } catch (error) {
      console.error('Failed to get today focus sessions:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get focus statistics
  ipcMain.handle(IPC_CHANNELS.FOCUS.GET_STATS, async (_event: IpcMainInvokeEvent, startDate?: string, endDate?: string) => {
    try {
      const stats = FocusSessionRepository.getStats(startDate, endDate);
      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get focus stats:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get focus session history
  ipcMain.handle(IPC_CHANNELS.FOCUS.GET_HISTORY, async (_event: IpcMainInvokeEvent, limit: number = 10) => {
    try {
      const sessions = FocusSessionRepository.getRecent(limit);
      return { success: true, data: sessions };
    } catch (error) {
      console.error('Failed to get focus history:', error);
      return { success: false, error: String(error) };
    }
  });

  // Start focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.START, async (_event: IpcMainInvokeEvent, input?: CreateFocusSessionInput) => {
    try {
      const session = FocusSessionRepository.create(input || {});
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to start focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Pause focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.PAUSE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      FocusSessionRepository.pause(id);
      const session = FocusSessionRepository.getById(id);
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to pause focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Resume focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.RESUME, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      FocusSessionRepository.resume(id);
      const session = FocusSessionRepository.getById(id);
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to resume focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Complete focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.COMPLETE, async (_event: IpcMainInvokeEvent, id: number, notes?: string) => {
    try {
      const session = FocusSessionRepository.complete(id, notes);
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to complete focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Cancel focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.CANCEL, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      FocusSessionRepository.cancel(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to cancel focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // Add break to focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.ADD_BREAK, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      FocusSessionRepository.incrementBreaks(id);
      const session = FocusSessionRepository.getById(id);
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to add break:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update focus session notes
  ipcMain.handle(IPC_CHANNELS.FOCUS.UPDATE_NOTES, async (_event: IpcMainInvokeEvent, id: number, notes: string) => {
    try {
      FocusSessionRepository.update(id, { notes });
      const session = FocusSessionRepository.getById(id);
      return { success: true, data: session };
    } catch (error) {
      console.error('Failed to update notes:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete focus session
  ipcMain.handle(IPC_CHANNELS.FOCUS.DELETE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      FocusSessionRepository.delete(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete focus session:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== LIMITS HANDLERS ==========

  // Get all category limits
  ipcMain.handle(IPC_CHANNELS.LIMITS.GET_ALL, async () => {
    try {
      const limits = LimitsRepository.getAllWithUsage();
      return { success: true, data: limits };
    } catch (error) {
      console.error('Failed to get limits:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get limit by category
  ipcMain.handle(IPC_CHANNELS.LIMITS.GET_BY_CATEGORY, async (_event: IpcMainInvokeEvent, categoryId: number) => {
    try {
      const limit = LimitsRepository.getByCategoryWithUsage(categoryId);
      return { success: true, data: limit || null };
    } catch (error) {
      console.error('Failed to get limit by category:', error);
      return { success: false, error: String(error) };
    }
  });

  // Upsert limit
  ipcMain.handle(IPC_CHANNELS.LIMITS.UPSERT, async (_event: IpcMainInvokeEvent, limit: Omit<CategoryLimit, 'id' | 'created_at'>) => {
    try {
      const result = LimitsRepository.upsert(limit);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to upsert limit:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete limit
  ipcMain.handle(IPC_CHANNELS.LIMITS.DELETE, async (_event: IpcMainInvokeEvent, categoryId: number) => {
    try {
      LimitsRepository.delete(categoryId);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete limit:', error);
      return { success: false, error: String(error) };
    }
  });

  // Check limits status
  ipcMain.handle(IPC_CHANNELS.LIMITS.CHECK_STATUS, async () => {
    try {
      const statuses = limitsService.checkLimits();
      return { success: true, data: statuses };
    } catch (error) {
      console.error('Failed to check limits status:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== SCREENSHOTS HANDLERS ==========

  // Get all screenshots (with optional limit)
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.GET_ALL, async (_event: IpcMainInvokeEvent, limit?: number) => {
    try {
      const screenshots = ScreenshotsRepository.getRecent(limit || 50);
      return { success: true, data: screenshots };
    } catch (error) {
      console.error('Failed to get screenshots:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get screenshot by ID
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.GET_BY_ID, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const screenshot = ScreenshotsRepository.getById(id);
      return { success: true, data: screenshot || null };
    } catch (error) {
      console.error('Failed to get screenshot:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get screenshots by date range
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.GET_BY_DATE_RANGE, async (_event: IpcMainInvokeEvent, startDate: string, endDate: string) => {
    try {
      const screenshots = ScreenshotsRepository.getByDateRange(startDate, endDate);
      return { success: true, data: screenshots };
    } catch (error) {
      console.error('Failed to get screenshots by date range:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get screenshots by application
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.GET_BY_APP, async (_event: IpcMainInvokeEvent, appId: number) => {
    try {
      const screenshots = ScreenshotsRepository.getByApplication(appId);
      return { success: true, data: screenshots };
    } catch (error) {
      console.error('Failed to get screenshots by app:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete screenshot
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.DELETE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const success = ScreenshotsRepository.delete(id);
      return { success };
    } catch (error) {
      console.error('Failed to delete screenshot:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete old screenshots
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.DELETE_OLD, async (_event: IpcMainInvokeEvent, daysOld: number) => {
    try {
      const deleted = ScreenshotsRepository.deleteOld(daysOld);
      return { success: true, data: { deleted } };
    } catch (error) {
      console.error('Failed to delete old screenshots:', error);
      return { success: false, error: String(error) };
    }
  });

  // Take manual screenshot
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.TAKE_MANUAL, async () => {
    try {
      const result = await screenshotService.takeManualScreenshot();
      return result;
    } catch (error) {
      console.error('Failed to take manual screenshot:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get screenshot settings
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.GET_SETTINGS, async () => {
    try {
      const settings = screenshotService.getSettings();
      return { success: true, data: settings };
    } catch (error) {
      console.error('Failed to get screenshot settings:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update screenshot settings
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.UPDATE_SETTINGS, async (_event: IpcMainInvokeEvent, updates: Partial<ScreenshotSettings>) => {
    try {
      screenshotService.updateSettings(updates);
      const settings = screenshotService.getSettings();
      
      // Start or stop screenshot service based on enabled setting
      if (updates.screenshots_enabled === true) {
        screenshotService.start();
      } else if (updates.screenshots_enabled === false) {
        screenshotService.stop();
      }
      
      return { success: true, data: settings };
    } catch (error) {
      console.error('Failed to update screenshot settings:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get screenshot statistics
  ipcMain.handle(IPC_CHANNELS.SCREENSHOTS.GET_STATS, async (_event: IpcMainInvokeEvent, startDate?: string, endDate?: string) => {
    try {
      const stats = ScreenshotsRepository.getStats(startDate, endDate);
      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get screenshot stats:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== NOTIFICATIONS HANDLERS ==========

  // Send manual notification
  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.SEND, async (_event: IpcMainInvokeEvent, payload: NotificationPayload) => {
    try {
      notificationsService.send(payload);
      return { success: true };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get notification history
  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.GET_HISTORY, async () => {
    try {
      const history = notificationsService.getHistory();
      return { success: true, data: history };
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return { success: false, error: String(error) };
    }
  });

  // Clear notification history
  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.CLEAR_HISTORY, async () => {
    try {
      notificationsService.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('Failed to clear notification history:', error);
      return { success: false, error: String(error) };
    }
  });

  // Reset break timer
  ipcMain.handle(IPC_CHANNELS.NOTIFICATIONS.RESET_BREAK_TIMER, async () => {
    try {
      notificationsService.resetBreakTimer();
      return { success: true };
    } catch (error) {
      console.error('Failed to reset break timer:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== PROJECTS HANDLERS ==========

  // Get all projects
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_ALL, async () => {
    try {
      const projects = ProjectsRepository.getAll();
      return { success: true, data: projects };
    } catch (error) {
      console.error('Failed to get projects:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get active projects
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_ACTIVE, async () => {
    try {
      const projects = ProjectsRepository.getActive();
      return { success: true, data: projects };
    } catch (error) {
      console.error('Failed to get active projects:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get project by ID
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_BY_ID, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const project = ProjectsRepository.getWithRules(id);
      return { success: true, data: project || null };
    } catch (error) {
      console.error('Failed to get project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get project with stats
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_WITH_STATS, async (_event: IpcMainInvokeEvent, id: number, dateRange?: ProjectTimeRange) => {
    try {
      const project = ProjectsRepository.getProjectWithStats(id, dateRange);
      return { success: true, data: project || null };
    } catch (error) {
      console.error('Failed to get project with stats:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get all projects with stats
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_ALL_WITH_STATS, async (_event: IpcMainInvokeEvent, dateRange?: ProjectTimeRange) => {
    try {
      const projects = ProjectsRepository.getAllWithStats(dateRange);
      return { success: true, data: projects };
    } catch (error) {
      console.error('Failed to get projects with stats:', error);
      return { success: false, error: String(error) };
    }
  });

  // Create project
  ipcMain.handle(IPC_CHANNELS.PROJECTS.CREATE, async (_event: IpcMainInvokeEvent, input: CreateProjectInput) => {
    try {
      const project = ProjectsRepository.create(input);
      return { success: true, data: project };
    } catch (error) {
      console.error('Failed to create project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update project
  ipcMain.handle(IPC_CHANNELS.PROJECTS.UPDATE, async (_event: IpcMainInvokeEvent, id: number, updates: UpdateProjectInput) => {
    try {
      const project = ProjectsRepository.update(id, updates);
      return { success: true, data: project };
    } catch (error) {
      console.error('Failed to update project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete project
  ipcMain.handle(IPC_CHANNELS.PROJECTS.DELETE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const success = ProjectsRepository.delete(id);
      return { success };
    } catch (error) {
      console.error('Failed to delete project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Archive project
  ipcMain.handle(IPC_CHANNELS.PROJECTS.ARCHIVE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const project = ProjectsRepository.archive(id);
      return { success: true, data: project };
    } catch (error) {
      console.error('Failed to archive project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Restore project
  ipcMain.handle(IPC_CHANNELS.PROJECTS.RESTORE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const project = ProjectsRepository.restore(id);
      return { success: true, data: project };
    } catch (error) {
      console.error('Failed to restore project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get project rules
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_RULES, async (_event: IpcMainInvokeEvent, projectId: number) => {
    try {
      const rules = ProjectsRepository.getRulesByProject(projectId);
      return { success: true, data: rules };
    } catch (error) {
      console.error('Failed to get project rules:', error);
      return { success: false, error: String(error) };
    }
  });

  // Create project rule
  ipcMain.handle(IPC_CHANNELS.PROJECTS.CREATE_RULE, async (_event: IpcMainInvokeEvent, input: CreateProjectRuleInput) => {
    try {
      const rule = ProjectsRepository.createRule(input);
      return { success: true, data: rule };
    } catch (error) {
      console.error('Failed to create project rule:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update project rule
  ipcMain.handle(IPC_CHANNELS.PROJECTS.UPDATE_RULE, async (_event: IpcMainInvokeEvent, id: number, updates: { rule_type?: 'app' | 'path' | 'window_title'; pattern?: string }) => {
    try {
      const rule = ProjectsRepository.updateRule(id, updates);
      return { success: true, data: rule };
    } catch (error) {
      console.error('Failed to update project rule:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete project rule
  ipcMain.handle(IPC_CHANNELS.PROJECTS.DELETE_RULE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const success = ProjectsRepository.deleteRule(id);
      return { success };
    } catch (error) {
      console.error('Failed to delete project rule:', error);
      return { success: false, error: String(error) };
    }
  });

  // Match project for entry
  ipcMain.handle(IPC_CHANNELS.PROJECTS.MATCH_PROJECT, async (_event: IpcMainInvokeEvent, appName: string | null, windowTitle: string | null, path: string | null) => {
    try {
      const project = ProjectsRepository.getProjectForEntry(appName, windowTitle, path);
      return { success: true, data: project || null };
    } catch (error) {
      console.error('Failed to match project:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get project time
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_PROJECT_TIME, async (_event: IpcMainInvokeEvent, projectId: number, dateRange?: ProjectTimeRange) => {
    try {
      const time = ProjectsRepository.getProjectTime(projectId, dateRange);
      return { success: true, data: time };
    } catch (error) {
      console.error('Failed to get project time:', error);
      return { success: false, error: String(error) };
    }
  });

  // Assign project to entry
  ipcMain.handle(IPC_CHANNELS.PROJECTS.ASSIGN_TO_ENTRY, async (_event: IpcMainInvokeEvent, entryId: number, projectId: number | null) => {
    try {
      const success = ProjectsRepository.assignProjectToEntry(entryId, projectId);
      return { success };
    } catch (error) {
      console.error('Failed to assign project to entry:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get billing report
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_BILLING_REPORT, async (_event: IpcMainInvokeEvent, dateRange: ProjectTimeRange) => {
    try {
      const report = projectsService.generateBillingReport(dateRange);
      return { success: true, data: report };
    } catch (error) {
      console.error('Failed to get billing report:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get budget status
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_BUDGET_STATUS, async (_event: IpcMainInvokeEvent, dateRange?: ProjectTimeRange) => {
    try {
      const statuses = projectsService.getBudgetStatuses(dateRange);
      return { success: true, data: statuses };
    } catch (error) {
      console.error('Failed to get budget status:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get budget warnings
  ipcMain.handle(IPC_CHANNELS.PROJECTS.GET_BUDGET_WARNINGS, async (_event: IpcMainInvokeEvent, dateRange?: ProjectTimeRange) => {
    try {
      const warnings = projectsService.getBudgetWarnings(dateRange);
      return { success: true, data: warnings };
    } catch (error) {
      console.error('Failed to get budget warnings:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== CALENDAR HANDLERS ==========

  // Get all calendar events
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_ALL, async () => {
    try {
      const events = CalendarRepository.getAll();
      return { success: true, data: events };
    } catch (error) {
      console.error('Failed to get calendar events:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get calendar event by ID
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_BY_ID, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const event = CalendarRepository.getWithProject(id);
      return { success: true, data: event || null };
    } catch (error) {
      console.error('Failed to get calendar event:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get events by date range
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_BY_DATE_RANGE, async (_event: IpcMainInvokeEvent, dateRange: CalendarDateRange) => {
    try {
      const events = calendarService.getEventsWithProjects(dateRange);
      return { success: true, data: events };
    } catch (error) {
      console.error('Failed to get calendar events by date range:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get events by day
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_BY_DAY, async (_event: IpcMainInvokeEvent, date: string) => {
    try {
      const events = calendarService.getEventsForDay(date);
      return { success: true, data: events };
    } catch (error) {
      console.error('Failed to get calendar events by day:', error);
      return { success: false, error: String(error) };
    }
  });

  // Create calendar event
  ipcMain.handle(IPC_CHANNELS.CALENDAR.CREATE, async (_event: IpcMainInvokeEvent, input: CreateCalendarEventInput) => {
    try {
      const event = calendarService.createEvent(input);
      return { success: true, data: event };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update calendar event
  ipcMain.handle(IPC_CHANNELS.CALENDAR.UPDATE, async (_event: IpcMainInvokeEvent, id: number, updates: UpdateCalendarEventInput) => {
    try {
      const event = calendarService.updateEvent(id, updates);
      return { success: true, data: event };
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete calendar event
  ipcMain.handle(IPC_CHANNELS.CALENDAR.DELETE, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const success = calendarService.deleteEvent(id);
      return { success };
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get week view
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_WEEK_VIEW, async (_event: IpcMainInvokeEvent, startDate: string) => {
    try {
      const weekView = calendarService.getWeekView(startDate);
      return { success: true, data: weekView };
    } catch (error) {
      console.error('Failed to get week view:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get month view
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_MONTH_VIEW, async (_event: IpcMainInvokeEvent, year: number, month: number) => {
    try {
      const monthView = calendarService.getMonthView(year, month);
      return { success: true, data: monthView };
    } catch (error) {
      console.error('Failed to get month view:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get event app usage
  ipcMain.handle(IPC_CHANNELS.CALENDAR.GET_EVENT_APP_USAGE, async (_event: IpcMainInvokeEvent, eventId: number) => {
    try {
      const usage = calendarService.getEventAppUsage(eventId);
      return { success: true, data: usage };
    } catch (error) {
      console.error('Failed to get event app usage:', error);
      return { success: false, error: String(error) };
    }
  });

  // Format event usage as string
  ipcMain.handle(IPC_CHANNELS.CALENDAR.FORMAT_EVENT_USAGE, async (_event: IpcMainInvokeEvent, eventId: number) => {
    try {
      const formatted = calendarService.formatEventAppUsage(eventId);
      return { success: true, data: formatted };
    } catch (error) {
      console.error('Failed to format event usage:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== APP WINDOW HANDLERS ==========

  // Minimize window
  ipcMain.on(IPC_CHANNELS.APP.MINIMIZE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  // Maximize/restore window
  ipcMain.on(IPC_CHANNELS.APP.MAXIMIZE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.restore();
    } else {
      win?.maximize();
    }
  });

  // Close window (minimize to tray)
  ipcMain.on(IPC_CHANNELS.APP.CLOSE, (event: IpcMainEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const settings = SettingsRepository.getAppSettings();
    if (settings.minimize_to_tray) {
      win?.hide();
    } else {
      win?.close();
    }
  });

  // Quit application
  ipcMain.on(IPC_CHANNELS.APP.QUIT, () => {
    closeDatabase();
    app.quit();
  });

  // Get app version
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, async () => {
    return { success: true, data: app.getVersion() };
  });

  // Get onboarding status
  ipcMain.handle(IPC_CHANNELS.APP.GET_ONBOARDING_STATUS, async () => {
    try {
      const settings = SettingsRepository.getAppSettings();
      return { success: true, data: settings.onboarding_completed };
    } catch (error) {
      console.error('Failed to get onboarding status:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set onboarding complete
  ipcMain.handle(IPC_CHANNELS.APP.SET_ONBOARDING_COMPLETE, async () => {
    try {
      SettingsRepository.updateAppSettings({ onboarding_completed: true });
      return { success: true };
    } catch (error) {
      console.error('Failed to set onboarding complete:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== PRIVACY HANDLERS ==========

  // Get all excluded apps
  ipcMain.handle(IPC_CHANNELS.PRIVACY.GET_EXCLUDED_APPS, async () => {
    try {
      const apps = PrivacyRepository.getAllExcludedApps();
      return { success: true, data: apps };
    } catch (error) {
      console.error('Failed to get excluded apps:', error);
      return { success: false, error: String(error) };
    }
  });

  // Add excluded app
  ipcMain.handle(IPC_CHANNELS.PRIVACY.ADD_EXCLUDED_APP, async (_event: IpcMainInvokeEvent, input: CreateExcludedAppInput) => {
    try {
      const app = PrivacyRepository.addExcludedApp(input);
      return { success: true, data: app };
    } catch (error) {
      console.error('Failed to add excluded app:', error);
      return { success: false, error: String(error) };
    }
  });

  // Remove excluded app
  ipcMain.handle(IPC_CHANNELS.PRIVACY.REMOVE_EXCLUDED_APP, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const success = PrivacyRepository.removeExcludedApp(id);
      return { success };
    } catch (error) {
      console.error('Failed to remove excluded app:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get all excluded patterns
  ipcMain.handle(IPC_CHANNELS.PRIVACY.GET_EXCLUDED_PATTERNS, async () => {
    try {
      const patterns = PrivacyRepository.getAllExcludedPatterns();
      return { success: true, data: patterns };
    } catch (error) {
      console.error('Failed to get excluded patterns:', error);
      return { success: false, error: String(error) };
    }
  });

  // Add excluded pattern
  ipcMain.handle(IPC_CHANNELS.PRIVACY.ADD_EXCLUDED_PATTERN, async (_event: IpcMainInvokeEvent, input: CreateExcludedPatternInput) => {
    try {
      const pattern = PrivacyRepository.addExcludedPattern(input);
      return { success: true, data: pattern };
    } catch (error) {
      console.error('Failed to add excluded pattern:', error);
      return { success: false, error: String(error) };
    }
  });

  // Remove excluded pattern
  ipcMain.handle(IPC_CHANNELS.PRIVACY.REMOVE_EXCLUDED_PATTERN, async (_event: IpcMainInvokeEvent, id: number) => {
    try {
      const success = PrivacyRepository.removeExcludedPattern(id);
      return { success };
    } catch (error) {
      console.error('Failed to remove excluded pattern:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get private mode
  ipcMain.handle(IPC_CHANNELS.PRIVACY.GET_PRIVATE_MODE, async () => {
    try {
      const enabled = PrivacyRepository.getPrivateMode();
      return { success: true, data: enabled };
    } catch (error) {
      console.error('Failed to get private mode:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set private mode
  ipcMain.handle(IPC_CHANNELS.PRIVACY.SET_PRIVATE_MODE, async (_event: IpcMainInvokeEvent, enabled: boolean) => {
    try {
      PrivacyRepository.setPrivateMode(enabled);
      
      // Notify renderer about private mode change
      const win = BrowserWindow.getAllWindows()[0];
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.PRIVACY.PRIVATE_MODE_CHANGED, { enabled });
      }
      
      return { success: true, data: enabled };
    } catch (error) {
      console.error('Failed to set private mode:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get data retention days
  ipcMain.handle(IPC_CHANNELS.PRIVACY.GET_DATA_RETENTION, async () => {
    try {
      const days = PrivacyRepository.getDataRetentionDays();
      return { success: true, data: days };
    } catch (error) {
      console.error('Failed to get data retention:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set data retention days
  ipcMain.handle(IPC_CHANNELS.PRIVACY.SET_DATA_RETENTION, async (_event: IpcMainInvokeEvent, days: number) => {
    try {
      PrivacyRepository.setDataRetentionDays(days);
      return { success: true, data: days };
    } catch (error) {
      console.error('Failed to set data retention:', error);
      return { success: false, error: String(error) };
    }
  });

  // Export all data
  ipcMain.handle(IPC_CHANNELS.PRIVACY.EXPORT_ALL_DATA, async () => {
    try {
      const data = PrivacyRepository.exportAllData();
      return { success: true, data };
    } catch (error) {
      console.error('Failed to export data:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete all data
  ipcMain.handle(IPC_CHANNELS.PRIVACY.DELETE_ALL_DATA, async () => {
    try {
      const result = PrivacyRepository.deleteAllTrackingData();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to delete all data:', error);
      return { success: false, error: String(error) };
    }
  });

  // Apply data retention
  ipcMain.handle(IPC_CHANNELS.PRIVACY.APPLY_DATA_RETENTION, async () => {
    try {
      const result = PrivacyRepository.applyDataRetention();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to apply data retention:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== SHORTCUTS HANDLERS ==========

  // Get all shortcuts
  ipcMain.handle(IPC_CHANNELS.SHORTCUTS.GET_ALL, async () => {
    try {
      const shortcuts = shortcutsService.getAllShortcuts();
      return { success: true, data: shortcuts };
    } catch (error) {
      console.error('Failed to get shortcuts:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get shortcut by ID
  ipcMain.handle(IPC_CHANNELS.SHORTCUTS.GET_BY_ID, async (_event: IpcMainInvokeEvent, id: ShortcutId) => {
    try {
      const shortcut = shortcutsService.getShortcutById(id);
      return { success: true, data: shortcut || null };
    } catch (error) {
      console.error('Failed to get shortcut:', error);
      return { success: false, error: String(error) };
    }
  });

  // Update shortcut
  ipcMain.handle(IPC_CHANNELS.SHORTCUTS.UPDATE, async (_event: IpcMainInvokeEvent, id: ShortcutId, accelerator: string) => {
    try {
      const shortcut = shortcutsService.updateShortcut(id, accelerator);
      return { success: true, data: shortcut };
    } catch (error) {
      console.error('Failed to update shortcut:', error);
      return { success: false, error: String(error) };
    }
  });

  // Reset all shortcuts
  ipcMain.handle(IPC_CHANNELS.SHORTCUTS.RESET_ALL, async () => {
    try {
      const shortcuts = shortcutsService.resetAllShortcuts();
      return { success: true, data: shortcuts };
    } catch (error) {
      console.error('Failed to reset shortcuts:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set shortcut enabled
  ipcMain.handle(IPC_CHANNELS.SHORTCUTS.SET_ENABLED, async (_event: IpcMainInvokeEvent, id: ShortcutId, enabled: boolean) => {
    try {
      const shortcut = shortcutsService.setShortcutEnabled(id, enabled);
      return { success: true, data: shortcut };
    } catch (error) {
      console.error('Failed to set shortcut enabled:', error);
      return { success: false, error: String(error) };
    }
  });

  // ========== THEMES HANDLERS ==========

  // Get current theme
  ipcMain.handle(IPC_CHANNELS.THEMES.GET_CURRENT, async () => {
    try {
      const settings = SettingsRepository.getAppSettings();
      return { success: true, data: settings.selected_theme || 'dark' };
    } catch (error) {
      console.error('Failed to get current theme:', error);
      return { success: false, error: String(error) };
    }
  });

  // Set theme
  ipcMain.handle(IPC_CHANNELS.THEMES.SET_THEME, async (_event: IpcMainInvokeEvent, themeId: string) => {
    try {
      SettingsRepository.updateAppSettings({ selected_theme: themeId });
      return { success: true, data: themeId };
    } catch (error) {
      console.error('Failed to set theme:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get available themes (returns theme IDs - actual theme definitions are in frontend)
  ipcMain.handle(IPC_CHANNELS.THEMES.GET_AVAILABLE, async () => {
    try {
      const themeIds = [
        'dark', 'light', 'midnight', 'forest', 'sunset',
        'ocean', 'lavender', 'monokai', 'nord', 'dracula'
      ];
      return { success: true, data: themeIds };
    } catch (error) {
      console.error('Failed to get available themes:', error);
      return { success: false, error: String(error) };
    }
  });

  console.log('IPC handlers registered');
}

export function cleanupIpcHandlers(): void {
  // Remove all handlers when app closes
  (Object.values(IPC_CHANNELS) as Record<string, string>[]).forEach((group) => {
    (Object.values(group) as string[]).forEach((channel) => {
      ipcMain.removeHandler(channel);
      ipcMain.removeAllListeners(channel);
    });
  });
  closeDatabase();
}