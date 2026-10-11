// FRA-44 presenter: pure streak/heatmap shaping for the client. No JSX,
// no hooks, no side effects (browserTimeZone only reads the environment).
// The server owns streak counting (server/streak.js); this module owns
// how the returned activity days become a GitHub-style heatmap.

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Row labels for the heatmap grid (rows run Sunday..Saturday).
export const HEATMAP_DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

/**
 * The learner's IANA timezone ("America/Toronto"), sent with attempts
 * and streak reads so day boundaries are learner-local.
 * @returns {string}
 */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * API path for the streak read model, scoped to a timezone.
 * @param {string} [timeZone]
 * @returns {string}
 */
export function streakPath(timeZone = browserTimeZone()) {
  return `/api/me/streak?tz=${encodeURIComponent(timeZone || 'UTC')}`;
}

/**
 * Heatmap intensity bucket for a day's attempt count:
 * 0 · 1 · 2-4 · 5-9 · 10+.
 * @param {*} count
 * @returns {number} 0..4
 */
export function heatLevel(count) {
  const n = Number(count) || 0;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

/**
 * Sidebar/hero label: "1-day streak" / "12-day streak".
 * @param {*} currentStreak
 * @returns {string}
 */
export function streakLabel(currentStreak) {
  const n = Number(currentStreak) || 0;
  return n === 1 ? '1-day streak' : `${n}-day streak`;
}

function parseDate(dateStr) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDate(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Build the week-column grid for the heatmap. Columns are weeks (oldest
 * first), rows are Sunday..Saturday; the final column contains `today`,
 * and cells after today are flagged isFuture so the UI can blank them.
 * @param {Array<{date: string, attempts: number}>} days
 * @param {string} today YYYY-MM-DD (learner-local)
 * @param {number} [weeks=53]
 * @returns {{columns: Array<Array<{date: string, count: number, level: number, isToday: boolean, isFuture: boolean}>>, months: Array<{label: string, column: number}>, startDate: string, endDate: string}}
 */
export function buildHeatmap(days, today, weeks = 53) {
  const counts = new Map();
  for (const day of days || []) {
    if (day && day.date) counts.set(day.date, Number(day.attempts) || 0);
  }
  const todayMs = parseDate(today);
  const startMs = todayMs - (new Date(todayMs).getUTCDay() + (weeks - 1) * 7) * 86400000;

  const columns = [];
  const months = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w += 1) {
    const columnStartMs = startMs + w * 7 * 86400000;
    const month = new Date(columnStartMs).getUTCMonth();
    if (month !== lastMonth) {
      months.push({ label: MONTH_LABELS[month], column: w });
      lastMonth = month;
    }
    const column = [];
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
