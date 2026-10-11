// FRA-44: daily-streak date math. Pure helpers — streaks derive entirely
// from learner_activity_days rows, so nothing here touches the database.
// A "day" is the learner's local calendar day; all math is on YYYY-MM-DD
// date strings, never on 24-hour windows.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Accepts a pg DATE value (a Date at UTC midnight), a timestamp, or a
// string, and returns its YYYY-MM-DD date string.
export function toDateString(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (DATE_RE.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

// IANA timezone validation: unknown names fall back to UTC rather than
// throwing inside a request handler.
export function normalizeTimeZone(value) {
  if (typeof value !== 'string' || !value) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

// The learner-local calendar date for an instant, as YYYY-MM-DD.
export function localDateString(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant instanceof Date ? instant : new Date(instant));
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

// Shift a YYYY-MM-DD date string by whole days (UTC math, DST-free).
export function shiftDate(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day) + days * 86400000);
  return shifted.toISOString().slice(0, 10);
}

function dayNumber(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

// Current/longest streaks from a list of active date strings. Current:
// consecutive active days ending today, or ending yesterday while today
// is still in play. Longest: the longest run anywhere in the list.
export function computeStreaks(activeDates, today) {
  const days = new Set((activeDates || []).map(toDateString).filter(Boolean));
  const studiedToday = days.has(today);

  let longestStreak = 0;
  let run = 0;
  let previous = null;
  for (const date of [...days].sort()) {
    run = previous !== null && dayNumber(date) - dayNumber(previous) === 1 ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    previous = date;
  }

  let currentStreak = 0;
  let cursor = studiedToday ? today : shiftDate(today, -1);
  while (days.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return { currentStreak, longestStreak, studiedToday };
}

// Read model for GET /api/me/streak from learner_activity_days rows:
// streak counters plus all-time activity totals. The endpoint slices
// `days` to the heatmap window before responding.
export function summarizeActivity(rows, today) {
  const days = (rows || [])
    .map((row) => ({ date: toDateString(row.activity_date), attempts: Number(row.attempts_count) || 0 }))
    .filter((row) => row.date);
  const { currentStreak, longestStreak, studiedToday } = computeStreaks(days.map((day) => day.date), today);
  return {
    currentStreak,
    longestStreak,
    studiedToday,
    activeDays: days.length,
    totalAttempts: days.reduce((sum, day) => sum + day.attempts, 0),
    days,
  };
}
