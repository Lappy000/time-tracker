import { useCallback } from 'react';

// Define IPC channels locally to avoid importing from electron folder
const IPC_CHANNELS = {
  TRACKING: {
    START: 'tracking:start',
    STOP: 'tracking:stop',
    GET_STATUS: 'tracking:get-status',
    WINDOW_CHANGED: 'tracking:window-changed',
    IDLE_CHANGED: 'tracking:idle-changed'
  },
  ANALYTICS: {
    GET_TODAY: 'analytics:get-today',
    GET_RANGE: 'analytics:get-range',
    GET_TOP_APPS: 'analytics:get-top-apps',
    GET_CATEGORIES: 'analytics:get-categories',
    GET_HOURLY: 'analytics:get-hourly',
    GET_HOURLY_BY_CATEGORY: 'analytics:get-hourly-by-category',
    GET_DAILY: 'analytics:get-daily',
    GET_DAILY_BY_CATEGORY: 'analytics:get-daily-by-category'
  },
  SETTINGS: {
    GET: 'settings:get',
    UPDATE: 'settings:update'
  },
  CATEGORIES: {
    GET_ALL: 'categories:get-all',
    GET_WITH_STATS: 'categories:get-with-stats',
    CREATE: 'categories:create',
    UPDATE: 'categories:update',
    DELETE: 'categories:delete'
  },
  APPLICATIONS: {
    GET_ALL: 'applications:get-all',
    GET_ALL_WITH_TIME: 'applications:get-all-with-time',
    UPDATE_CATEGORY: 'applications:update-category',
    SET_TRACKED: 'applications:set-tracked'
  },
  GOALS: {
    GET_ALL: 'goals:get-all',
    GET_ACTIVE: 'goals:get-active',
    GET_BY_ID: 'goals:get-by-id',
    CREATE: 'goals:create',
    UPDATE: 'goals:update',
    DELETE: 'goals:delete',
    SET_ACTIVE: 'goals:set-active',
    GET_PROGRESS: 'goals:get-progress',
    UPDATE_PROGRESS: 'goals:update-progress',
    GET_WARNINGS: 'goals:get-warnings',
    SYNC_PROGRESS: 'goals:sync-progress'
  },
  FOCUS: {
    GET_ALL: 'focus:get-all',
    GET_BY_ID: 'focus:get-by-id',
    GET_ACTIVE: 'focus:get-active',
    GET_TODAY: 'focus:get-today',
    GET_STATS: 'focus:get-stats',
    GET_HISTORY: 'focus:get-history',
    START: 'focus:start',
    PAUSE: 'focus:pause',
    RESUME: 'focus:resume',
    COMPLETE: 'focus:complete',
    CANCEL: 'focus:cancel',
    ADD_BREAK: 'focus:add-break',
    UPDATE_NOTES: 'focus:update-notes',
    DELETE: 'focus:delete'
  },
  LIMITS: {
    GET_ALL: 'limits:get-all',
    GET_BY_CATEGORY: 'limits:get-by-category',
    UPSERT: 'limits:upsert',
    DELETE: 'limits:delete',
    CHECK_STATUS: 'limits:check-status',
    WARNING: 'limits:warning',
    EXCEEDED: 'limits:exceeded',
    BLOCKED: 'limits:blocked'
  },
  SCREENSHOTS: {
    GET_ALL: 'screenshots:get-all',
    GET_BY_ID: 'screenshots:get-by-id',
    GET_BY_DATE_RANGE: 'screenshots:get-by-date-range',
    GET_BY_APP: 'screenshots:get-by-app',
    DELETE: 'screenshots:delete',
    DELETE_OLD: 'screenshots:delete-old',
    TAKE_MANUAL: 'screenshots:take-manual',
    GET_SETTINGS: 'screenshots:get-settings',
    UPDATE_SETTINGS: 'screenshots:update-settings',
    GET_STATS: 'screenshots:get-stats'
  },
  NOTIFICATIONS: {
    SEND: 'notifications:send',
    GET_HISTORY: 'notifications:get-history',
    CLEAR_HISTORY: 'notifications:clear-history',
    RESET_BREAK_TIMER: 'notifications:reset-break-timer'
  },
  PRIVACY: {
    GET_EXCLUDED_APPS: 'privacy:get-excluded-apps',
    ADD_EXCLUDED_APP: 'privacy:add-excluded-app',
    REMOVE_EXCLUDED_APP: 'privacy:remove-excluded-app',
    GET_EXCLUDED_PATTERNS: 'privacy:get-excluded-patterns',
    ADD_EXCLUDED_PATTERN: 'privacy:add-excluded-pattern',
    REMOVE_EXCLUDED_PATTERN: 'privacy:remove-excluded-pattern',
    GET_PRIVATE_MODE: 'privacy:get-private-mode',
    SET_PRIVATE_MODE: 'privacy:set-private-mode',
    GET_DATA_RETENTION: 'privacy:get-data-retention',
    SET_DATA_RETENTION: 'privacy:set-data-retention',
    EXPORT_ALL_DATA: 'privacy:export-all-data',
    DELETE_ALL_DATA: 'privacy:delete-all-data',
    APPLY_DATA_RETENTION: 'privacy:apply-data-retention',
    PRIVATE_MODE_CHANGED: 'privacy:private-mode-changed'
  },
  SHORTCUTS: {
    GET_ALL: 'shortcuts:get-all',
    GET_BY_ID: 'shortcuts:get-by-id',
    UPDATE: 'shortcuts:update',
    RESET_ALL: 'shortcuts:reset-all',
    SET_ENABLED: 'shortcuts:set-enabled',
    TRIGGERED: 'shortcuts:triggered'
  },
  THEMES: {
    GET_CURRENT: 'themes:get-current',
    SET_THEME: 'themes:set-theme',
    GET_AVAILABLE: 'themes:get-available'
  },
  APP: {
    MINIMIZE: 'app:minimize',
    MAXIMIZE: 'app:maximize',
    CLOSE: 'app:close',
    QUIT: 'app:quit',
    GET_VERSION: 'app:get-version',
    NAVIGATE: 'navigate',
    GET_ONBOARDING_STATUS: 'app:get-onboarding-status',
    SET_ONBOARDING_COMPLETE: 'app:set-onboarding-complete'
  }
} as const;

interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useIpc() {
  const invoke = useCallback(async <T = unknown>(
    channel: string,
    ...args: unknown[]
  ): Promise<IpcResult<T>> => {
    if (!window.electronAPI) {
      return { success: false, error: 'Electron API not available' };
    }
    try {
      return await window.electronAPI.invoke<T>(channel, ...args);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, []);

  const send = useCallback((channel: string, ...args: unknown[]) => {
    if (window.electronAPI) {
      window.electronAPI.send(channel, ...args);
    }
  }, []);

  const on = useCallback((channel: string, callback: (...args: unknown[]) => void) => {
    if (window.electronAPI) {
      return window.electronAPI.on(channel, callback);
    }
    return () => {};
  }, []);

  return {
    invoke,
    send,
    on,
    channels: IPC_CHANNELS
  };
}