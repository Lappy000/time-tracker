import {
  CalendarRepository,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
  type CalendarEventWithProject,
  type CalendarDateRange,
} from '../database/repositories';
import type { CalendarEvent } from '../database/schema';

export interface CalendarServiceState {
  isGoogleConnected: boolean;
  isOutlookConnected: boolean;
  lastGoogleSync: string | null;
  lastOutlookSync: string | null;
}

export interface WeekViewData {
  startDate: string;
  endDate: string;
  days: {
    date: string;
    dayOfWeek: number;
    events: CalendarEventWithProject[];
    timeEntries: { hour: number; duration: number; apps: string[] }[];
  }[];
}

export interface MonthViewData {
  year: number;
  month: number;
  weeks: {
    date: string;
    dayOfMonth: number;
    isCurrentMonth: boolean;
    eventCount: number;
    totalTrackedTime: number;
  }[][];
}

class CalendarService {
  private state: CalendarServiceState = {
    isGoogleConnected: false,
    isOutlookConnected: false,
    lastGoogleSync: null,
    lastOutlookSync: null,
  };

  // ========== STATE ==========

  getState(): CalendarServiceState {
    return { ...this.state };
  }

  // ========== MANUAL EVENTS (MVP) ==========

  /**
   * Create a manual calendar event
   */
  createEvent(input: CreateCalendarEventInput): CalendarEvent {
    return CalendarRepository.create({
      ...input,
      source: 'manual',
    });
  }

  /**
   * Update an event
   */
  updateEvent(id: number, updates: UpdateCalendarEventInput): CalendarEvent | undefined {
    return CalendarRepository.update(id, updates);
  }

  /**
   * Delete an event
   */
  deleteEvent(id: number): boolean {
    return CalendarRepository.delete(id);
  }

  /**
   * Get events for a date range
   */
  getEvents(dateRange: CalendarDateRange): CalendarEvent[] {
    return CalendarRepository.getByDateRange(dateRange);
  }

  /**
   * Get events with project info
   */
  getEventsWithProjects(dateRange: CalendarDateRange): CalendarEventWithProject[] {
    return CalendarRepository.getByDateRangeWithProject(dateRange);
  }

  /**
   * Get events for a specific day
   */
  getEventsForDay(date: string): CalendarEvent[] {
    return CalendarRepository.getByDay(date);
  }

  // ========== VIEW HELPERS ==========

  /**
   * Get week view data with events and time entries
   */
  getWeekView(startDate: string): WeekViewData {
    const start = new Date(startDate);
    // Ensure we start on Monday
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const dateRange: CalendarDateRange = {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };

    const events = this.getEventsWithProjects(dateRange);
    const timeEntriesByDay = this.getTimeEntriesByDay(dateRange);

    const days: WeekViewData['days'] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        events: events.filter((e) => e.start_time.startsWith(dateStr)),
        timeEntries: timeEntriesByDay[dateStr] || [],
      });
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      days,
    };
  }

  /**
   * Get month view data
   */
  getMonthView(year: number, month: number): MonthViewData {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    // Start from the Monday of the first week
    const startDate = new Date(firstDay);
    const dayOfWeek = startDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + diff);

    // End on the Sunday of the last week
    const endDate = new Date(lastDay);
    const endDayOfWeek = endDate.getDay();
    if (endDayOfWeek !== 0) {
      endDate.setDate(endDate.getDate() + (7 - endDayOfWeek));
    }

    const dateRange: CalendarDateRange = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    const events = CalendarRepository.getByDateRange(dateRange);
    const timeStats = this.getTimeStatsForMonth(dateRange);

    const weeks: MonthViewData['weeks'] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const week: MonthViewData['weeks'][0] = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = events.filter((e) => e.start_time.startsWith(dateStr));

        week.push({
          date: dateStr,
          dayOfMonth: currentDate.getDate(),
          isCurrentMonth: currentDate.getMonth() === month - 1,
          eventCount: dayEvents.length,
          totalTrackedTime: timeStats[dateStr] || 0,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }

    return { year, month, weeks };
  }

  /**
   * Get time entries grouped by day and hour
   */
  private getTimeEntriesByDay(
    dateRange: CalendarDateRange
  ): Record<string, { hour: number; duration: number; apps: string[] }[]> {
    const { getDatabase } = require('../database/index');
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT 
        date(te.start_time) as date,
        strftime('%H', te.start_time) as hour,
        SUM(te.duration) as duration,
        GROUP_CONCAT(DISTINCT a.name) as apps
      FROM time_entries te
      JOIN applications a ON te.application_id = a.id
      WHERE te.start_time >= ? AND te.start_time <= ?
      GROUP BY date, hour
      ORDER BY date, hour
    `);

    const rows = stmt.all(dateRange.startDate, dateRange.endDate) as {
      date: string;
      hour: string;
      duration: number;
      apps: string;
    }[];

    const result: Record<string, { hour: number; duration: number; apps: string[] }[]> = {};
    for (const row of rows) {
      if (!result[row.date]) {
        result[row.date] = [];
      }
      result[row.date].push({
        hour: parseInt(row.hour, 10),
        duration: row.duration,
        apps: row.apps ? row.apps.split(',') : [],
      });
    }

    return result;
  }

  /**
   * Get total tracked time per day for a date range
   */
  private getTimeStatsForMonth(
    dateRange: CalendarDateRange
  ): Record<string, number> {
    const { getDatabase } = require('../database/index');
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT 
        date(start_time) as date,
        SUM(duration) as total_duration
      FROM time_entries
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY date
    `);

    const rows = stmt.all(dateRange.startDate, dateRange.endDate) as {
      date: string;
      total_duration: number;
    }[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.date] = row.total_duration;
    }

    return result;
  }

  // ========== TIME CORRELATION ==========

  /**
   * Get summary of what apps were used during an event
   */
  getEventAppUsage(eventId: number): { name: string; duration: number; percentage: number }[] {
    const appUsage = CalendarRepository.getAppUsageDuringEvent(eventId);
    const totalDuration = appUsage.reduce((sum, a) => sum + a.duration, 0);

    return appUsage.map((a) => ({
      name: a.name,
      duration: a.duration,
      percentage: totalDuration > 0 ? (a.duration / totalDuration) * 100 : 0,
    }));
  }

  /**
   * Format app usage as a human-readable string
   * e.g., "During meeting X, you used: Teams (30m), Notion (15m)"
   */
  formatEventAppUsage(eventId: number): string {
    const event = CalendarRepository.getById(eventId);
    if (!event) return '';

    const appUsage = this.getEventAppUsage(eventId);
    if (appUsage.length === 0) return `During "${event.title}", no tracked activity.`;

    const appStrings = appUsage.slice(0, 5).map((a) => {
      const minutes = Math.round(a.duration / 60);
      return `${a.name} (${minutes}m)`;
    });

    return `During "${event.title}", you used: ${appStrings.join(', ')}`;
  }

  // ========== FUTURE: GOOGLE/OUTLOOK INTEGRATION PLACEHOLDERS ==========

  /**
   * Placeholder: Connect Google Calendar
   */
  connectGoogle(): Promise<void> {
    // Future implementation:
    // 1. OAuth flow with Google
    // 2. Store tokens securely
    // 3. Set isGoogleConnected to true
    console.log('Google Calendar integration not yet implemented');
    return Promise.resolve();
  }

  /**
   * Placeholder: Sync Google Calendar events
   */
  syncGoogleEvents(): Promise<void> {
    // Future implementation:
    // 1. Fetch events from Google Calendar API
    // 2. Upsert events with source='google' and external_id
    // 3. Update lastGoogleSync timestamp
    console.log('Google Calendar sync not yet implemented');
    return Promise.resolve();
  }

  /**
   * Placeholder: Disconnect Google Calendar
   */
  disconnectGoogle(): Promise<void> {
    // Future implementation:
    // 1. Revoke OAuth tokens
    // 2. Optionally delete synced events
    // 3. Set isGoogleConnected to false
    console.log('Google Calendar disconnect not yet implemented');
    this.state.isGoogleConnected = false;
    return Promise.resolve();
  }

  /**
   * Placeholder: Connect Outlook Calendar
   */
  connectOutlook(): Promise<void> {
    console.log('Outlook Calendar integration not yet implemented');
    return Promise.resolve();
  }

  /**
   * Placeholder: Sync Outlook Calendar events
   */
  syncOutlookEvents(): Promise<void> {
    console.log('Outlook Calendar sync not yet implemented');
    return Promise.resolve();
  }

  /**
   * Placeholder: Disconnect Outlook Calendar
   */
  disconnectOutlook(): Promise<void> {
    console.log('Outlook Calendar disconnect not yet implemented');
    this.state.isOutlookConnected = false;
    return Promise.resolve();
  }
}

export const calendarService = new CalendarService();