import Dexie, { Table } from 'dexie';
import {
  VocabularyLearningUnit,
  Deck,
  ReviewLog,
  StudyDayRecord,
  StreakDayDot,
  StreakSummary,
  DailyReminderSettings,
  ExportScope,
} from '../types';
import { INITIAL_DECKS, INITIAL_UNITS } from './initialData';

/**
 * Formats a Date or epoch timestamp into a local calendar date string 'YYYY-MM-DD'
 * using the user's local timezone rather than UTC.
 */
export function toLocalDateString(dateOrMs: Date | number = new Date()): string {
  const d = typeof dateOrMs === 'number' ? new Date(dateOrMs) : dateOrMs;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a 'YYYY-MM-DD' local date string and shifts it by offsetDays.
 */
export function shiftLocalDate(baseDateStr: string, offsetDays: number): Date {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  return new Date(y, m - 1, d + offsetDays, 12, 0, 0, 0);
}

export class LexiCoreDatabase extends Dexie {
  units!: Table<VocabularyLearningUnit, string>;
  decks!: Table<Deck, string>;
  reviewLogs!: Table<ReviewLog, string>;
  studyDays!: Table<StudyDayRecord, string>;

  constructor() {
    super('LexiCoreDB');
    this.version(1).stores({
      units: '&id, word, deckId, [deckId+fsrs.due], fsrs.due, fsrs.state, createdAt, isSuspended',
      decks: '&id, name, createdAt',
      reviewLogs: '&id, unitId, deckId, reviewTime',
    });
    this.version(2).stores({
      units: '&id, word, deckId, [deckId+fsrs.due], fsrs.due, fsrs.state, createdAt, isSuspended',
      decks: '&id, name, createdAt',
      reviewLogs: '&id, unitId, deckId, reviewTime',
      studyDays: '&date, updatedAt',
    });
  }
}

export const db = new LexiCoreDatabase();

let initPromise: Promise<void> | null = null;

/**
 * Synchronizes historical reviewLogs with the studyDays table so any prior study activity
 * or imported backup logs are reflected in the streak store.
 */
export async function syncStreakFromReviewLogs(): Promise<void> {
  const [allLogs, existingDays] = await Promise.all([
    db.reviewLogs.toArray(),
    db.studyDays.toArray(),
  ]);

  if (allLogs.length === 0) return;

  const existingMap = new Map<string, StudyDayRecord>();
  for (const record of existingDays) {
    existingMap.set(record.date, record);
  }

  const logCountsByDate = new Map<string, { count: number; latestTime: number }>();
  for (const log of allLogs) {
    if (!log.reviewTime) continue;
    const dateStr = toLocalDateString(log.reviewTime);
    const prev = logCountsByDate.get(dateStr);
    if (!prev) {
      logCountsByDate.set(dateStr, { count: 1, latestTime: log.reviewTime });
    } else {
      prev.count += 1;
      if (log.reviewTime > prev.latestTime) {
        prev.latestTime = log.reviewTime;
      }
    }
  }

  const recordsToUpsert: StudyDayRecord[] = [];
  for (const [dateStr, stats] of logCountsByDate.entries()) {
    const existing = existingMap.get(dateStr);
    if (!existing) {
      recordsToUpsert.push({
        date: dateStr,
        sessionsCompleted: 1,
        cardsReviewed: stats.count,
        updatedAt: stats.latestTime,
      });
    } else if (existing.cardsReviewed < stats.count) {
      recordsToUpsert.push({
        ...existing,
        sessionsCompleted: Math.max(1, existing.sessionsCompleted),
        cardsReviewed: stats.count,
        updatedAt: Math.max(existing.updatedAt, stats.latestTime),
      });
    }
  }

  if (recordsToUpsert.length > 0) {
    await db.studyDays.bulkPut(recordsToUpsert);
  }
}

/**
 * Records a completed study session for the current local calendar day and returns the updated streak summary.
 */
export async function recordCompletedStudySession(cardsReviewed: number): Promise<StreakSummary> {
  const todayStr = toLocalDateString();
  const nowMs = Date.now();

  await db.transaction('rw', db.studyDays, async () => {
    const existing = await db.studyDays.get(todayStr);
    if (existing) {
      await db.studyDays.put({
        date: todayStr,
        sessionsCompleted: existing.sessionsCompleted + 1,
        cardsReviewed: existing.cardsReviewed + Math.max(1, cardsReviewed),
        updatedAt: nowMs,
      });
    } else {
      await db.studyDays.put({
        date: todayStr,
        sessionsCompleted: 1,
        cardsReviewed: Math.max(1, cardsReviewed),
        updatedAt: nowMs,
      });
    }
  });

  return getStreakSummary();
}

/**
 * Computes the user's current streak, longest streak, and 7-day activity dots from the studyDays table.
 */
export async function getStreakSummary(): Promise<StreakSummary> {
  await syncStreakFromReviewLogs();
  const allDays = await db.studyDays.toArray();
  const activeRecords = allDays.filter((r) => r.sessionsCompleted > 0 || r.cardsReviewed > 0);

  const recordMap = new Map<string, StudyDayRecord>();
  for (const r of activeRecords) {
    recordMap.set(r.date, r);
  }

  const todayStr = toLocalDateString();
  const yesterdayStr = toLocalDateString(shiftLocalDate(todayStr, -1));
  const completedToday = recordMap.has(todayStr);

  // Calculate current consecutive streak
  let currentStreak = 0;
  if (completedToday || recordMap.has(yesterdayStr)) {
    let cursorStr = completedToday ? todayStr : yesterdayStr;
    while (recordMap.has(cursorStr)) {
      currentStreak += 1;
      cursorStr = toLocalDateString(shiftLocalDate(cursorStr, -1));
    }
  }

  // Calculate longest consecutive streak across all recorded study days
  const sortedDates = Array.from(recordMap.keys()).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDateStr: string | null = null;

  for (const dateStr of sortedDates) {
    if (!prevDateStr) {
      runningStreak = 1;
    } else {
      const expectedNext = toLocalDateString(shiftLocalDate(prevDateStr, 1));
      if (dateStr === expectedNext) {
        runningStreak += 1;
      } else {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDateStr = dateStr;
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // Build 7-day activity dots (from 6 days ago through today)
  const last7Days: StreakDayDot[] = Array.from({ length: 7 }, (_, idx) => {
    const offset = idx - 6; // -6, -5, -4, -3, -2, -1, 0
    const dateObj = shiftLocalDate(todayStr, offset);
    const dateStr = toLocalDateString(dateObj);
    const rec = recordMap.get(dateStr);
    const weekdayShort = dateObj.toLocaleDateString([], { weekday: 'short' });

    return {
      date: dateStr,
      dayLabel: offset === 0 ? 'Today' : weekdayShort,
      shortLabel: weekdayShort.charAt(0).toUpperCase(),
      completed: Boolean(rec),
      isToday: offset === 0,
      sessionsCompleted: rec?.sessionsCompleted || 0,
      cardsReviewed: rec?.cardsReviewed || 0,
    };
  });

  return {
    currentStreak,
    longestStreak,
    completedToday,
    totalStudyDays: sortedDates.length,
    lastStudyDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null,
    last7Days,
  };
}

/**
 * Initializes database with default decks and rich vocabulary units on first run.
 * Guarded with an in-flight promise and bulkPut to be completely idempotent and safe against React StrictMode concurrent execution.
 */
export async function initializeDatabase(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await db.open();
      const deckCount = await db.decks.count();
      if (deckCount === 0) {
        await db.decks.bulkPut(INITIAL_DECKS);
      }

      const unitCount = await db.units.count();
      if (unitCount === 0) {
        await db.units.bulkPut(INITIAL_UNITS);
      }

      await syncStreakFromReviewLogs();
    } catch (err) {
      console.error('Failed to initialize local IndexedDB:', err);
    }
  })();

  return initPromise;
}

/**
 * Fetches all units that are due for review (or in learning/new state),
 * optionally filtered by deck.
 */
export async function getDueUnits(deckId?: string, maxUnits: number = 30): Promise<VocabularyLearningUnit[]> {
  const nowIso = new Date().toISOString();
  let collection = db.units.toCollection();

  if (deckId && deckId !== 'all') {
    collection = db.units.where('deckId').equals(deckId);
  }

  const allUnits = await collection.toArray();
  const activeUnits = allUnits.filter((u) => !u.isSuspended);

  // Split into Due items vs New items
  const dueItems: VocabularyLearningUnit[] = [];
  const newItems: VocabularyLearningUnit[] = [];

  for (const unit of activeUnits) {
    if (unit.fsrs.reps === 0) {
      newItems.push(unit);
    } else if (unit.fsrs.due <= nowIso) {
      dueItems.push(unit);
    }
  }

  // Sort due items by due date (oldest due first)
  dueItems.sort((a, b) => new Date(a.fsrs.due).getTime() - new Date(b.fsrs.due).getTime());
  // Sort new items by creation date
  newItems.sort((a, b) => a.createdAt - b.createdAt);

  // Combine: due items first, followed by new items up to limit
  const combined = [...dueItems, ...newItems].slice(0, maxUnits);
  return combined;
}

/**
 * Returns summary counts for decks and overall review workload.
 */
export async function getStudySummary(deckId?: string) {
  const nowIso = new Date().toISOString();
  let collection = db.units.toCollection();
  if (deckId && deckId !== 'all') {
    collection = db.units.where('deckId').equals(deckId);
  }
  const units = await collection.toArray();
  const active = units.filter((u) => !u.isSuspended);

  let newCount = 0;
  let dueCount = 0;
  let learningCount = 0;

  for (const unit of active) {
    if (unit.fsrs.reps === 0) {
      newCount++;
    } else if (unit.fsrs.due <= nowIso) {
      dueCount++;
    } else if (unit.fsrs.state === 1 || unit.fsrs.state === 3) {
      learningCount++;
    }
  }

  return {
    total: active.length,
    newCount,
    dueCount,
    learningCount,
  };
}

const REMINDER_STORAGE_KEY = 'lexicore_daily_reminder_v1';

export const DEFAULT_REMINDER_SETTINGS: DailyReminderSettings = {
  enabled: true,
  reminderTime: '09:00',
  lastNotifiedDate: null,
  dismissedDate: null,
};

/**
 * Loads daily reminder settings from localStorage with safe fallback defaults.
 */
export function getReminderSettings(): DailyReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_REMINDER_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_REMINDER_SETTINGS.enabled,
      reminderTime:
        typeof parsed.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(parsed.reminderTime)
          ? parsed.reminderTime
          : DEFAULT_REMINDER_SETTINGS.reminderTime,
      lastNotifiedDate: typeof parsed.lastNotifiedDate === 'string' ? parsed.lastNotifiedDate : null,
      dismissedDate: typeof parsed.dismissedDate === 'string' ? parsed.dismissedDate : null,
    };
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
}

/**
 * Persists daily reminder settings to localStorage and returns the normalized settings object.
 */
export function saveReminderSettings(
  partial: Partial<DailyReminderSettings>
): DailyReminderSettings {
  const current = getReminderSettings();
  const updated: DailyReminderSettings = {
    ...current,
    ...partial,
  };
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save reminder settings:', err);
  }
  return updated;
}

/**
 * Formats the current local time as 'HH:mm' (24-hour) for comparison against reminderTime.
 */
export function getCurrentLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Checks whether the current local time has reached or passed the configured reminder time ('HH:mm').
 */
export function isReminderTimeReached(reminderTime: string, now: Date = new Date()): boolean {
  if (!reminderTime || !/^\d{2}:\d{2}$/.test(reminderTime)) return false;
  const currentHHmm = getCurrentLocalTimeString(now);
  return currentHHmm >= reminderTime;
}

/**
 * Dispatches a browser notification for daily vocabulary review if the Notification API is supported and granted.
 */
export function sendBrowserReviewNotification(dueCount: number, isTest: boolean = false): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const title = isTest
      ? 'LexiCore Daily Reminder (Test)'
      : 'Time for Your Daily Vocabulary Review';
    const body =
      dueCount > 0
        ? `You have ${dueCount} vocabulary ${dueCount === 1 ? 'card' : 'cards'} ready for spaced repetition review today. Keep your streak alive!`
        : 'Complete a quick study session today to maintain your daily learning streak!';

    const notification = new Notification(title, {
      body,
      icon: '/icon.svg',
      tag: isTest ? 'lexicore-test-reminder' : 'lexicore-daily-reminder',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (err) {
    console.error('Failed to dispatch browser notification:', err);
    return false;
  }
}

/**
 * Exports only the vocabulary learning units as a clean JSON string.
 */
export async function exportVocabularyOnlyAsJson(): Promise<{
  json: string;
  filename: string;
  unitCount: number;
}> {
  const units = await db.units.toArray();
  const dateStamp = toLocalDateString();
  const json = JSON.stringify(
    {
      version: 2,
      exportType: 'vocabulary',
      exportedAt: new Date().toISOString(),
      count: units.length,
      units,
    },
    null,
    2
  );

  return {
    json,
    filename: `lexicore-vocabulary-${dateStamp}.json`,
    unitCount: units.length,
  };
}

/**
 * Exports the entire database as a JSON string for backups or sharing.
 */
export async function exportDatabaseAsJson(): Promise<string> {
  const [decks, units, reviewLogs, studyDays] = await Promise.all([
    db.decks.toArray(),
    db.units.toArray(),
    db.reviewLogs.toArray(),
    db.studyDays.toArray(),
  ]);
  const reminderSettings = getReminderSettings();

  return JSON.stringify(
    {
      version: 2,
      exportType: 'full_backup',
      exportedAt: new Date().toISOString(),
      decks,
      units,
      reviewLogs,
      studyDays,
      reminderSettings,
    },
    null,
    2
  );
}

/**
 * Exports JSON data according to the user's chosen ExportScope ('vocabulary' | 'full').
 */
export async function exportDataByScope(scope: ExportScope): Promise<{
  json: string;
  filename: string;
  unitCount: number;
  deckCount: number;
}> {
  const dateStamp = toLocalDateString();
  if (scope === 'vocabulary') {
    const res = await exportVocabularyOnlyAsJson();
    return {
      ...res,
      deckCount: 0,
    };
  }

  const [decks, units, reviewLogs, studyDays] = await Promise.all([
    db.decks.toArray(),
    db.units.toArray(),
    db.reviewLogs.toArray(),
    db.studyDays.toArray(),
  ]);
  const reminderSettings = getReminderSettings();

  const json = JSON.stringify(
    {
      version: 2,
      exportType: 'full_backup',
      exportedAt: new Date().toISOString(),
      decks,
      units,
      reviewLogs,
      studyDays,
      reminderSettings,
    },
    null,
    2
  );

  return {
    json,
    filename: `lexicore-backup-${dateStamp}.json`,
    unitCount: units.length,
    deckCount: decks.length,
  };
}

/**
 * Imports database items from an exported JSON backup (supports both full backups and vocabulary-only exports).
 */
export async function importDatabaseFromJson(
  jsonStr: string
): Promise<{ unitsAdded: number; decksAdded: number }> {
  const data = JSON.parse(jsonStr);
  let decksAdded = 0;
  let unitsAdded = 0;

  await db.transaction('rw', db.decks, db.units, db.reviewLogs, db.studyDays, async () => {
    if (Array.isArray(data.decks)) {
      await db.decks.bulkPut(data.decks);
      decksAdded = data.decks.length;
    }

    if (Array.isArray(data.units)) {
      await db.units.bulkPut(data.units);
      unitsAdded = data.units.length;
    } else if (Array.isArray(data)) {
      await db.units.bulkPut(data);
      unitsAdded = data.length;
    }

    if (Array.isArray(data.reviewLogs)) {
      await db.reviewLogs.bulkPut(data.reviewLogs);
    }

    if (Array.isArray(data.studyDays)) {
      await db.studyDays.bulkPut(data.studyDays);
    }
  });

  if (data && typeof data === 'object' && data.reminderSettings) {
    saveReminderSettings(data.reminderSettings);
  }

  await syncStreakFromReviewLogs();
  return { unitsAdded, decksAdded };
}

/**
 * Deletes a deck, its associated vocabulary learning units, and its orphaned reviewLogs in a transaction.
 * Preserves studyDays so the user's daily streak history remains intact.
 */
export async function deleteDeck(deckId: string): Promise<{ deletedUnitsCount: number }> {
  return await db.transaction('rw', db.decks, db.units, db.reviewLogs, async () => {
    const unitsToDelete = await db.units.where('deckId').equals(deckId).toArray();
    const count = unitsToDelete.length;
    await db.units.where('deckId').equals(deckId).delete();
    await db.reviewLogs.where('deckId').equals(deckId).delete();
    await db.decks.delete(deckId);
    return { deletedUnitsCount: count };
  });
}

