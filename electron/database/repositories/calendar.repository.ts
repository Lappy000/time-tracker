import { getDatabase } from '../index';
import type { CalendarEvent } from '../schema';

// Types for calendar operations
export interface CreateCalendarEventInput {
  external_id?: string | null;
  source?: 'manual' | 'google' | 'outlook';
  title: string;
  start_time: string;
  end_time: string;
  project_id?: number | null;
  notes?: string | null;
}

export interface UpdateCalendarEventInput {
  external_id?: string | null;
  source?: 'manual' | 'google' | 'outlook';
  title?: string;
  start_time?: string;
  end_time?: string;
  project_id?: number | null;
  notes?: string | null;
}

export interface CalendarEventWithProject extends CalendarEvent {
  project_name: string | null;
  project_color: string | null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface TimeEntryOverlap {
  event_id: number;
  event_title: string;
  apps_used: { name: string; duration: number }[];
  total_duration: number;
}

export const CalendarRepository = {
  // ========== EVENT CRUD ==========

  /**
   * Get all calendar events
   */
  getAll(): CalendarEvent[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM calendar_events 
      ORDER BY start_time DESC
    `);
    return stmt.all() as CalendarEvent[];
  },

  /**
   * Get calendar event by ID
   */
  getById(id: number): CalendarEvent | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM calendar_events WHERE id = ?');
    return stmt.get(id) as CalendarEvent | undefined;
  },

  /**
   * Get event with project info
   */
  getWithProject(id: number): CalendarEventWithProject | undefined {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        ce.*,
        p.name as project_name,
        p.color as project_color
      FROM calendar_events ce
      LEFT JOIN projects p ON ce.project_id = p.id
      WHERE ce.id = ?
    `);
    return stmt.get(id) as CalendarEventWithProject | undefined;
  },

  /**
   * Get events by date range
   */
  getByDateRange(dateRange: DateRange): CalendarEvent[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM calendar_events 
      WHERE (start_time >= ? AND start_time <= ?)
         OR (end_time >= ? AND end_time <= ?)
         OR (start_time <= ? AND end_time >= ?)
      ORDER BY start_time ASC
    `);
    return stmt.all(
      dateRange.startDate,
      dateRange.endDate,
      dateRange.startDate,
      dateRange.endDate,
      dateRange.startDate,
      dateRange.endDate
    ) as CalendarEvent[];
  },

  /**
   * Get events with project info by date range
   */
  getByDateRangeWithProject(dateRange: DateRange): CalendarEventWithProject[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        ce.*,
        p.name as project_name,
        p.color as project_color
      FROM calendar_events ce
      LEFT JOIN projects p ON ce.project_id = p.id
      WHERE (ce.start_time >= ? AND ce.start_time <= ?)
         OR (ce.end_time >= ? AND ce.end_time <= ?)
         OR (ce.start_time <= ? AND ce.end_time >= ?)
      ORDER BY ce.start_time ASC
    `);
    return stmt.all(
      dateRange.startDate,
      dateRange.endDate,
      dateRange.startDate,
      dateRange.endDate,
      dateRange.startDate,
      dateRange.endDate
    ) as CalendarEventWithProject[];
  },

  /**
   * Get events for a specific day
   */
  getByDay(date: string): CalendarEvent[] {
    const db = getDatabase();
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    
    const stmt = db.prepare(`
      SELECT * FROM calendar_events 
      WHERE (start_time >= ? AND start_time <= ?)
         OR (end_time >= ? AND end_time <= ?)
         OR (start_time <= ? AND end_time >= ?)
      ORDER BY start_time ASC
    `);
    return stmt.all(startOfDay, endOfDay, startOfDay, endOfDay, startOfDay, endOfDay) as CalendarEvent[];
  },

  /**
   * Get events by source (manual, google, outlook)
   */
  getBySource(source: 'manual' | 'google' | 'outlook'): CalendarEvent[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM calendar_events 
      WHERE source = ?
      ORDER BY start_time DESC
    `);
    return stmt.all(source) as CalendarEvent[];
  },

  /**
   * Get events by project
   */
  getByProject(projectId: number): CalendarEvent[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM calendar_events 
      WHERE project_id = ?
      ORDER BY start_time DESC
    `);
    return stmt.all(projectId) as CalendarEvent[];
  },

  /**
   * Create a calendar event
   */
  create(input: CreateCalendarEventInput): CalendarEvent {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO calendar_events (external_id, source, title, start_time, end_time, project_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.external_id || null,
      input.source || 'manual',
      input.title,
      input.start_time,
      input.end_time,
      input.project_id || null,
      input.notes || null
    );

    return this.getById(result.lastInsertRowid as number)!;
  },

  /**
   * Update a calendar event
   */
  update(id: number, updates: UpdateCalendarEventInput): CalendarEvent | undefined {
    const db = getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.external_id !== undefined) {
      fields.push('external_id = ?');
      values.push(updates.external_id);
    }
    if (updates.source !== undefined) {
      fields.push('source = ?');
      values.push(updates.source);
    }
    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.start_time !== undefined) {
      fields.push('start_time = ?');
      values.push(updates.start_time);
    }
    if (updates.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.end_time);
    }
    if (updates.project_id !== undefined) {
      fields.push('project_id = ?');
      values.push(updates.project_id);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) return this.getById(id);

    values.push(id);
    const stmt = db.prepare(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getById(id);
  },

  /**
   * Delete a calendar event
   */
  delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM calendar_events WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  /**
   * Delete events by external ID (for sync purposes)
   */
  deleteByExternalId(externalId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM calendar_events WHERE external_id = ?');
    const result = stmt.run(externalId);
    return result.changes > 0;
  },

  /**
   * Delete all events by source
   */
  deleteBySource(source: 'manual' | 'google' | 'outlook'): number {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM calendar_events WHERE source = ?');
    const result = stmt.run(source);
    return result.changes;
  },

  // ========== TIME CORRELATION ==========

  /**
   * Get time entries that overlap with a calendar event
   */
  getOverlappingTimeEntries(eventId: number): {
    id: number;
    application_id: number;
    window_title: string | null;
    start_time: string;
    end_time: string | null;
    duration: number;
    app_name: string;
  }[] {
    const event = this.getById(eventId);
    if (!event) return [];

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        te.id,
        te.application_id,
        te.window_title,
        te.start_time,
        te.end_time,
        te.duration,
        a.name as app_name
      FROM time_entries te
      JOIN applications a ON te.application_id = a.id
      WHERE (te.start_time >= ? AND te.start_time <= ?)
         OR (te.end_time >= ? AND te.end_time <= ?)
         OR (te.start_time <= ? AND te.end_time >= ?)
      ORDER BY te.start_time ASC
    `);

    return stmt.all(
      event.start_time,
      event.end_time,
      event.start_time,
      event.end_time,
      event.start_time,
      event.end_time
    ) as {
      id: number;
      application_id: number;
      window_title: string | null;
      start_time: string;
      end_time: string | null;
      duration: number;
      app_name: string;
    }[];
  },

  /**
   * Get app usage summary during a calendar event
   */
  getAppUsageDuringEvent(eventId: number): { name: string; duration: number }[] {
    const event = this.getById(eventId);
    if (!event) return [];

    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        a.name,
        SUM(te.duration) as duration
      FROM time_entries te
      JOIN applications a ON te.application_id = a.id
      WHERE (te.start_time >= ? AND te.start_time <= ?)
         OR (te.end_time >= ? AND te.end_time <= ?)
         OR (te.start_time <= ? AND te.end_time >= ?)
      GROUP BY a.name
      ORDER BY duration DESC
    `);

    return stmt.all(
      event.start_time,
      event.end_time,
      event.start_time,
      event.end_time,
      event.start_time,
      event.end_time
    ) as { name: string; duration: number }[];
  },

  /**
   * Get events with overlapping time entry data
   */
  getEventsWithTimeCorrelation(dateRange: DateRange): TimeEntryOverlap[] {
    const events = this.getByDateRange(dateRange);
    const result: TimeEntryOverlap[] = [];

    for (const event of events) {
      const appUsage = this.getAppUsageDuringEvent(event.id);
      const totalDuration = appUsage.reduce((sum, app) => sum + app.duration, 0);

      result.push({
        event_id: event.id,
        event_title: event.title,
        apps_used: appUsage,
        total_duration: totalDuration,
      });
    }

    return result;
  },

  /**
   * Auto-tag time entries with event title (based on overlap)
   */
  getTimeEntriesDuringEvents(
    dateRange: DateRange
  ): { entry_id: number; event_title: string; event_id: number }[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT 
        te.id as entry_id,
        ce.title as event_title,
        ce.id as event_id
      FROM time_entries te
      JOIN calendar_events ce ON (
        (te.start_time >= ce.start_time AND te.start_time <= ce.end_time)
        OR (te.end_time >= ce.start_time AND te.end_time <= ce.end_time)
        OR (te.start_time <= ce.start_time AND te.end_time >= ce.end_time)
      )
      WHERE ce.start_time >= ? AND ce.end_time <= ?
      ORDER BY te.start_time ASC
    `);

    return stmt.all(dateRange.startDate, dateRange.endDate) as {
      entry_id: number;
      event_title: string;
      event_id: number;
    }[];
  },

  // ========== UTILITY METHODS ==========

  /**
   * Find event by external ID
   */
  findByExternalId(externalId: string): CalendarEvent | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM calendar_events WHERE external_id = ?');
    return stmt.get(externalId) as CalendarEvent | undefined;
  },

  /**
   * Get events count by source
   */
  getCountBySource(): { source: string; count: number }[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM calendar_events
      GROUP BY source
    `);
    return stmt.all() as { source: string; count: number }[];
  },

  /**
   * Get upcoming events (next 7 days)
   */
  getUpcoming(days: number = 7): CalendarEvent[] {
    const db = getDatabase();
    const now = new Date().toISOString();
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const stmt = db.prepare(`
      SELECT * FROM calendar_events 
      WHERE start_time >= ? AND start_time <= ?
      ORDER BY start_time ASC
    `);
    return stmt.all(now, future) as CalendarEvent[];
  },
};