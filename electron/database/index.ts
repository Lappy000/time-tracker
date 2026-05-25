import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { SCHEMA, SEED_CATEGORIES, SEED_AUTO_RULES, SEED_SETTINGS, SEED_SHORTCUTS, SEED_EXCLUDED_PATTERNS, MIGRATION_ADD_PROJECT_TO_TIME_ENTRIES } from './schema';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Check if a column exists in a table
function columnExists(database: Database.Database, tableName: string, columnName: string): boolean {
  const tableInfo = database.pragma(`table_info(${tableName})`) as { name: string }[];
  return tableInfo.some((col) => col.name === columnName);
}

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'time-tracker.db');

  console.log('Initializing database at:', dbPath);

  db = new Database(dbPath);
  
  // Enable foreign keys and WAL mode for better performance
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  
  // Create schema
  db.exec(SCHEMA);
  
  // Seed default data
  db.exec(SEED_CATEGORIES);
  db.exec(SEED_AUTO_RULES);
  db.exec(SEED_SETTINGS);
  db.exec(SEED_SHORTCUTS);
  db.exec(SEED_EXCLUDED_PATTERNS);
  
  // Run migrations
  runMigrations(db);
  
  console.log('Database initialized successfully');
  
  return db;
}

// Run database migrations
function runMigrations(database: Database.Database): void {
  // Migration: Add project_id to time_entries table
  if (!columnExists(database, 'time_entries', 'project_id')) {
    try {
      database.exec(MIGRATION_ADD_PROJECT_TO_TIME_ENTRIES);
      console.log('Migration: Added project_id column to time_entries');
    } catch (error) {
      // Column might already exist in schema
      console.log('Migration: project_id column may already exist');
    }
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

// Export types
export * from './schema';