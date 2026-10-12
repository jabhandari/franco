// FRA-44 presenter: pure streak/heatmap shaping for the client. No JSX,
// no hooks, no side effects (browserTimeZone only reads the environment).
// The server owns streak counting (server/streak.js); this module owns
// how the returned activity days become a GitHub-style heatmap.
import type { StreakDay } from '../api/client.js';

const MONTH_LABELS: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Row labels for the heatmap grid (rows run Sunday..Saturday).
export const HEATMAP_DAY_LABELS: string[] = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

/**
 * The learner's IANA timezone ("America/Toronto"), sent with attempts
 * and streak reads so day boundaries are learner-local.
 */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * API path for the streak read model, scoped to a timezone.
 */
export function streakPath(timeZone: string = browserTimeZone()): string {
  return `/api/me/streak?tz=${encodeURIComponent(timeZone || 'UTC')}`;
}

/**
 * Heatmap intensity bucket for a day's attempt count:
 * 0 · 1 · 2-4 · 5-9 · 10+.
 */
export function heatLevel(count: number): number {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

/**
 * Sidebar/hero label: "1-day streak" / "12-day streak".
 */
export function streakLabel(currentStreak: number): string {
  const n = Number(currentStreak) || 0;
  return n === 1 ? '1-day streak' : `${n}-day streak`;
}

function parseDate(dateStr: string): number {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** One heatmap cell in the week-column grid. */
export type HeatmapCell = {
  date: string;
  count: number;
  level: number;
  isToday: boolean;
  isFuture: boolean;
};

/** Month label anchored to a week column. */
export type HeatmapMonth = {
  label: string;
  column: number;
};

/** Week-column heatmap grid returned by buildHeatmap. */
export type HeatmapGrid = {
  columns: HeatmapCell[][];
  months: HeatmapMonth[];
  startDate: string;
  endDate: string;
};

/**
 * Build the week-column grid for the heatmap. Columns are weeks (oldest
 * first), rows are Sunday..Saturday; the final column contains `today`,
 * and cells after today are flagged isFuture so the UI can blank them.
 * `today` is required (YYYY-MM-DD, learner-local): an invalid date throws,
 * same as before — callers must pass the streak payload's `today`.
 */
export function buildHeatmap(
  days: StreakDay[] | null | undefined,
  today: string,
  weeks: number = 53,
): HeatmapGrid {
  const counts = new Map<string, number>();
  for (const day of days || []) {
    if (day && day.date) counts.set(day.date, Number(day.attempts) || 0);
  }
  const todayMs = parseDate(today);
  const startMs = todayMs - (new Date(todayMs).getUTCDay() + (weeks - 1) * 7) * 86400000;

  const columns: HeatmapCell[][] = [];
  const months: HeatmapMonth[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w += 1) {
    const columnStartMs = startMs + w * 7 * 86400000;
    const month = new Date(columnStartMs).getUTCMonth();
    if (month !== lastMonth) {
      months.push({ label: MONTH_LABELS[month], column: w });
      lastMonth = month;
    }
    const column: HeatmapCell[] = [];
    for (let r = 0; r < 7; r += 1) {
      const ms = columnStartMs + r * 86400000;
      const date = formatDate(ms);
      const count = counts.get(date) || 0;
      column.push({ date, count, level: heatLevel(count), isToday: ms === todayMs, isFuture: ms > todayMs });
    }
    columns.push(column);
  }
  return { columns, months, startDate: formatDate(startMs), endDate: today };
}
