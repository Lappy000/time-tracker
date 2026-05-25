// time-tracker/electron/services/index.ts
export { windowTracker, type WindowTrackerState } from './window-tracker.service';
export { idleDetector, type IdleState } from './idle-detector.service';
export { trackingService, setNotificationsServiceRef, type TrackingServiceState } from './tracking.service';
export { limitsService } from './limits.service';
export { screenshotService, type ScreenshotSettings, type ScreenshotServiceState } from './screenshot.service';
export { notificationsService, type NotificationType, type NotificationPayload } from './notifications.service';
export {
  projectsService,
  type BillingReportEntry,
  type BillingReport,
  type BudgetStatus
} from './projects.service';
export {
  calendarService,
  type CalendarServiceState,
  type WeekViewData,
  type MonthViewData
} from './calendar.service';
export { shortcutsService, type ShortcutConfig } from './shortcuts.service';