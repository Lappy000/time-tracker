// Database schema definitions for Time Tracker
export const SCHEMA = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Sessions table - tracks application tracking sessions
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    total_duration INTEGER DEFAULT 0,
    active_duration INTEGER DEFAULT 0,
    idle_duration INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table - app categorization
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT,
    is_productive BOOLEAN DEFAULT 0,
    productivity_score INTEGER DEFAULT 0 CHECK(productivity_score >= -100 AND productivity_score <= 100),
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Applications table - tracked applications
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    executable_path TEXT,
    window_class TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    is_tracked BOOLEAN DEFAULT 1,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, executable_path)
);

-- Time entries table - individual time records
CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    window_title TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration INTEGER DEFAULT 0,
    is_idle BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Goals table - productivity goals and limits
CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('time', 'limit', 'focus')),
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    target_minutes INTEGER NOT NULL,
    period TEXT NOT NULL DEFAULT 'daily' CHECK(period IN ('daily', 'weekly', 'monthly')),
    is_limit BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Goal progress table - daily goal tracking
CREATE TABLE IF NOT EXISTS goal_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    achieved_minutes INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(goal_id, date)
);

-- Daily summaries table - aggregated daily statistics
CREATE TABLE IF NOT EXISTS daily_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL UNIQUE,
    total_tracked_time INTEGER DEFAULT 0,
    productive_time INTEGER DEFAULT 0,
    distraction_time INTEGER DEFAULT 0,
    neutral_time INTEGER DEFAULT 0,
    productivity_score REAL DEFAULT 0,
    focus_sessions INTEGER DEFAULT 0,
    context_switches INTEGER DEFAULT 0,
    top_apps TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Focus sessions table - pomodoro/focus mode tracking
CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    planned_duration INTEGER NOT NULL DEFAULT 1500,
    actual_duration INTEGER DEFAULT 0,
    break_duration INTEGER DEFAULT 300,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled', 'interrupted')),
    breaks_taken INTEGER DEFAULT 0,
    goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table - app configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auto-categorization rules table
CREATE TABLE IF NOT EXISTS auto_category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL,
    pattern_type TEXT NOT NULL CHECK(pattern_type IN ('name', 'path', 'class', 'title')),
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Category limits table - time limits per category
CREATE TABLE IF NOT EXISTS category_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL UNIQUE,
    daily_limit_minutes INTEGER NOT NULL DEFAULT 120,
    warning_threshold_percent INTEGER NOT NULL DEFAULT 80,
    action TEXT NOT NULL DEFAULT 'notify' CHECK(action IN ('notify', 'block', 'log')),
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_session ON time_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_application ON time_entries(application_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_applications_category ON applications(category_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON goal_progress(date);
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_date ON focus_sessions(date(start_time));
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_category_limits_category ON category_limits(category_id);

-- Screenshots table - captures app window screenshots
CREATE TABLE IF NOT EXISTS screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    application_id INTEGER,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    timestamp TEXT NOT NULL,
    window_title TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON screenshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_screenshots_application ON screenshots(application_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_session ON screenshots(session_id);

-- Projects table - project tracking and billing
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    client TEXT,
    hourly_rate REAL,
    budget_hours REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Project rules table - auto-assign time entries to projects
CREATE TABLE IF NOT EXISTS project_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    rule_type TEXT NOT NULL CHECK(rule_type IN ('app', 'path', 'window_title')),
    pattern TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Calendar events table - manual and synced events
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'google', 'outlook')),
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    project_id INTEGER,
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);
CREATE INDEX IF NOT EXISTS idx_project_rules_project ON project_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_rules_type ON project_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project ON calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON calendar_events(source);

-- Privacy: Excluded apps table - apps that are never tracked
CREATE TABLE IF NOT EXISTS excluded_apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Privacy: Excluded patterns table - window title/URL patterns to exclude
CREATE TABLE IF NOT EXISTS excluded_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL,
    pattern_type TEXT NOT NULL DEFAULT 'window_title' CHECK(pattern_type IN ('window_title', 'url')),
    is_regex INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_excluded_apps_name ON excluded_apps(app_name);
CREATE INDEX IF NOT EXISTS idx_excluded_patterns_type ON excluded_patterns(pattern_type);

-- Keyboard shortcuts table - customizable shortcuts
CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
    id TEXT PRIMARY KEY,
    accelerator TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

// Migration to add project_id to time_entries (run as separate statement)
export const MIGRATION_ADD_PROJECT_TO_TIME_ENTRIES = `
ALTER TABLE time_entries ADD COLUMN project_id INTEGER REFERENCES projects(id);
`;

// Default categories seed data
export const SEED_CATEGORIES = `
INSERT OR IGNORE INTO categories (name, color, icon, is_productive, productivity_score, is_default) VALUES
    ('Development', '#22c55e', '🎯', 1, 100, 1),
    ('Communication', '#3b82f6', '💼', 1, 50, 1),
    ('Browsing', '#f59e0b', '🌐', 0, 0, 1),
    ('Entertainment', '#ef4444', '🎮', 0, -50, 1),
    ('Learning', '#8b5cf6', '📚', 1, 80, 1),
    ('System', '#6b7280', '🔧', 0, 0, 1),
    ('Uncategorized', '#9ca3af', '📁', 0, 0, 1);
`;

// Default auto-categorization rules
export const SEED_AUTO_RULES = `
INSERT OR IGNORE INTO auto_category_rules (pattern, pattern_type, category_id, priority) VALUES
    -- Development apps
    ('code', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('vscode', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('visual studio', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('intellij', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('webstorm', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('sublime', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('atom', 'name', (SELECT id FROM categories WHERE name = 'Development'), 100),
    ('terminal', 'name', (SELECT id FROM categories WHERE name = 'Development'), 90),
    ('iterm', 'name', (SELECT id FROM categories WHERE name = 'Development'), 90),
    ('powershell', 'name', (SELECT id FROM categories WHERE name = 'Development'), 90),
    ('cmd', 'name', (SELECT id FROM categories WHERE name = 'Development'), 90),
    ('github', 'name', (SELECT id FROM categories WHERE name = 'Development'), 80),
    ('postman', 'name', (SELECT id FROM categories WHERE name = 'Development'), 80),
    
    -- Communication apps
    ('slack', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 100),
    ('discord', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 100),
    ('teams', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 100),
    ('zoom', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 100),
    ('telegram', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 100),
    ('whatsapp', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 100),
    ('outlook', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 90),
    ('mail', 'name', (SELECT id FROM categories WHERE name = 'Communication'), 90),
    
    -- Browsers
    ('chrome', 'name', (SELECT id FROM categories WHERE name = 'Browsing'), 50),
    ('firefox', 'name', (SELECT id FROM categories WHERE name = 'Browsing'), 50),
    ('safari', 'name', (SELECT id FROM categories WHERE name = 'Browsing'), 50),
    ('edge', 'name', (SELECT id FROM categories WHERE name = 'Browsing'), 50),
    ('brave', 'name', (SELECT id FROM categories WHERE name = 'Browsing'), 50),
    ('opera', 'name', (SELECT id FROM categories WHERE name = 'Browsing'), 50),
    
    -- Entertainment
    ('spotify', 'name', (SELECT id FROM categories WHERE name = 'Entertainment'), 100),
    ('netflix', 'name', (SELECT id FROM categories WHERE name = 'Entertainment'), 100),
    ('youtube', 'title', (SELECT id FROM categories WHERE name = 'Entertainment'), 80),
    ('twitch', 'name', (SELECT id FROM categories WHERE name = 'Entertainment'), 100),
    ('steam', 'name', (SELECT id FROM categories WHERE name = 'Entertainment'), 100),
    ('game', 'name', (SELECT id FROM categories WHERE name = 'Entertainment'), 70),
    
    -- Learning
    ('udemy', 'title', (SELECT id FROM categories WHERE name = 'Learning'), 100),
    ('coursera', 'title', (SELECT id FROM categories WHERE name = 'Learning'), 100),
    ('pluralsight', 'title', (SELECT id FROM categories WHERE name = 'Learning'), 100),
    ('notion', 'name', (SELECT id FROM categories WHERE name = 'Learning'), 80),
    ('obsidian', 'name', (SELECT id FROM categories WHERE name = 'Learning'), 80),
    
    -- System
    ('explorer', 'name', (SELECT id FROM categories WHERE name = 'System'), 100),
    ('finder', 'name', (SELECT id FROM categories WHERE name = 'System'), 100),
    ('settings', 'name', (SELECT id FROM categories WHERE name = 'System'), 100),
    ('control panel', 'name', (SELECT id FROM categories WHERE name = 'System'), 100),
    ('task manager', 'name', (SELECT id FROM categories WHERE name = 'System'), 100);
`;

// Default settings seed data
export const SEED_SETTINGS = `
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('tracking_interval', '1000'),
    ('idle_threshold', '300000'),
    ('auto_start', 'true'),
    ('minimize_to_tray', 'true'),
    ('start_minimized', 'false'),
    ('theme', 'dark'),
    ('daily_goal_hours', '8'),
    ('break_reminder_interval', '3000000'),
    ('show_notifications', 'true'),
    ('track_window_titles', 'true'),
    ('exclude_patterns', '[]'),
    ('idle_detection_enabled', 'true'),
    ('idle_action', 'pause'),
    ('notifications_enabled', 'true'),
    ('break_reminder_enabled', 'true'),
    ('limit_exceeded_notification', 'true'),
    ('daily_summary_notification', 'true'),
    ('notification_sound', 'true'),
    ('screenshots_enabled', 'false'),
    ('screenshots_interval', '300000'),
    ('screenshots_quality', '70'),
    ('screenshots_retention_days', '7'),
    ('screenshots_private_apps', '[]'),
    ('private_mode', 'false'),
    ('data_retention_days', '0'),
    ('onboarding_completed', 'false'),
    ('selected_theme', 'dark');
`;

// Default keyboard shortcuts seed data
export const SEED_SHORTCUTS = `
INSERT OR IGNORE INTO keyboard_shortcuts (id, accelerator, is_enabled) VALUES
    ('toggle_tracking', 'Ctrl+Shift+T', 1),
    ('toggle_private_mode', 'Ctrl+Shift+P', 1),
    ('start_focus', 'Ctrl+Shift+F', 1),
    ('take_screenshot', 'Ctrl+Shift+S', 1),
    ('open_dashboard', 'Ctrl+Shift+D', 1),
    ('open_command_palette', 'Ctrl+K', 1);
`;

// Default excluded patterns seed data
export const SEED_EXCLUDED_PATTERNS = `
INSERT OR IGNORE INTO excluded_patterns (pattern, pattern_type, is_regex) VALUES
    ('Incognito', 'window_title', 0),
    ('Private', 'window_title', 0),
    ('InPrivate', 'window_title', 0),
    ('password', 'window_title', 0),
    ('Password', 'window_title', 0);
`;

// Types for database entities
export interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  total_duration: number;
  active_duration: number;
  idle_duration: number;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_productive: boolean;
  productivity_score: number;
  is_default: boolean;
  created_at: string;
}

export interface Application {
  id: number;
  name: string;
  executable_path: string | null;
  window_class: string | null;
  category_id: number | null;
  is_tracked: boolean;
  first_seen: string;
  last_seen: string;
  created_at: string;
}

export interface TimeEntry {
  id: number;
  session_id: number;
  application_id: number;
  window_title: string | null;
  start_time: string;
  end_time: string | null;
  duration: number;
  is_idle: boolean;
  created_at: string;
}

export interface Goal {
  id: number;
  name: string;
  type: 'time' | 'limit' | 'focus';
  category_id: number | null;
  application_id: number | null;
  target_minutes: number;
  period: 'daily' | 'weekly' | 'monthly';
  is_limit: boolean;
  is_active: boolean;
  created_at: string;
}

export interface GoalProgress {
  id: number;
  goal_id: number;
  date: string;
  achieved_minutes: number;
  is_completed: boolean;
  created_at: string;
}

export interface DailySummary {
  id: number;
  date: string;
  total_tracked_time: number;
  productive_time: number;
  distraction_time: number;
  neutral_time: number;
  productivity_score: number;
  focus_sessions: number;
  context_switches: number;
  top_apps: string;
  created_at: string;
}

export interface FocusSession {
  id: number;
  start_time: string;
  end_time: string | null;
  planned_duration: number;
  actual_duration: number;
  break_duration: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'interrupted';
  breaks_taken: number;
  goal_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface CategoryLimit {
  id: number;
  category_id: number;
  daily_limit_minutes: number;
  warning_threshold_percent: number;
  action: 'notify' | 'block' | 'log';
  is_enabled: boolean;
  created_at?: string;
}

export interface Screenshot {
  id: number;
  session_id: number | null;
  application_id: number | null;
  file_path: string;
  thumbnail_path: string | null;
  timestamp: string;
  window_title: string | null;
}

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

export interface CalendarEvent {
  id: number;
  external_id: string | null;
  source: 'manual' | 'google' | 'outlook';
  title: string;
  start_time: string;
  end_time: string;
  project_id: number | null;
  notes: string | null;
}

// Privacy types
export interface ExcludedApp {
  id: number;
  app_name: string;
  created_at: string;
}

export interface ExcludedPattern {
  id: number;
  pattern: string;
  pattern_type: 'window_title' | 'url';
  is_regex: boolean;
  created_at: string;
}

// Keyboard shortcuts types
export interface KeyboardShortcut {
  id: string;
  accelerator: string;
  is_enabled: boolean;
  updated_at: string;
}

// Available shortcut IDs
export type ShortcutId =
  | 'toggle_tracking'
  | 'toggle_private_mode'
  | 'start_focus'
  | 'take_screenshot'
  | 'open_dashboard'
  | 'open_command_palette';

// Default shortcut mappings
export const DEFAULT_SHORTCUTS: Record<ShortcutId, string> = {
  toggle_tracking: 'Ctrl+Shift+T',
  toggle_private_mode: 'Ctrl+Shift+P',
  start_focus: 'Ctrl+Shift+F',
  take_screenshot: 'Ctrl+Shift+S',
  open_dashboard: 'Ctrl+Shift+D',
  open_command_palette: 'Ctrl+K'
};