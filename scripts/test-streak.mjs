// Unit checks for the FRA-44 daily-streak date math (server/streak.js):
// timezone conversion, streak counting, and the read-model summary.
import {
  toDateString,
  normalizeTimeZone,
  localDateString,
  shiftDate,
  computeStreaks,
  summarizeActivity,
} from '../server/streak.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- toDateString ---
assert(toDateString('2026-10-11') === '2026-10-11', 'toDateString: date string passes through');
assert(toDateString(new Date(Date.UTC(2026, 9, 11))) === '2026-10-11', 'toDateString: pg DATE value (UTC midnight)');
assert(toDateString('2026-10-11T05:00:00.000Z') === '2026-10-11', 'toDateString: timestamp string -> UTC date');
assert(toDateString(null) === null, 'toDateString: null -> null');
assert(toDateString('not-a-date') === null, 'toDateString: garbage -> null');

// --- normalizeTimeZone ---
assert(normalizeTimeZone('America/Toronto') === 'America/Toronto', 'normalizeTimeZone: valid IANA name kept');
assert(normalizeTimeZone('Not/AZone') === 'UTC', 'normalizeTimeZone: unknown name -> UTC');
assert(normalizeTimeZone(undefined) === 'UTC', 'normalizeTimeZone: missing -> UTC');
assert(normalizeTimeZone('') === 'UTC', 'normalizeTimeZone: empty -> UTC');

// --- localDateString ---
// 02:30 UTC on Oct 11 is still Oct 10 (22:30 EDT) in Toronto.
assert(localDateString('2026-10-11T02:30:00Z', 'America/Toronto') === '2026-10-10', 'localDateString: UTC instant maps to previous Toronto day');
assert(localDateString('2026-10-11T02:30:00Z', 'UTC') === '2026-10-11', 'localDateString: same instant in UTC');
assert(localDateString('2026-10-11T02:30:00Z', 'Pacific/Auckland') === '2026-10-11', 'localDateString: same instant in Auckland (UTC+13)');
// Winter: 04:30 UTC on Jan 15 is Jan 14 (23:30 EST) in Toronto.
assert(localDateString('2026-01-15T04:30:00Z', 'America/Toronto') === '2026-01-14', 'localDateString: EST offset respected');
assert(localDateString('2026-10-11T02:30:00Z', 'Bogus/Zone') === '2026-10-11', 'localDateString: bogus zone falls back to UTC');

// --- shiftDate ---
assert(shiftDate('2026-10-11', -1) === '2026-10-10', 'shiftDate: one day back');
assert(shiftDate('2026-03-01', -1) === '2026-02-28', 'shiftDate: month boundary back');
assert(shiftDate('2024-03-01', -1) === '2024-02-29', 'shiftDate: leap day');
assert(shiftDate('2026-12-31', 1) === '2027-01-01', 'shiftDate: year boundary forward');
assert(shiftDate('2026-10-11', -370) === '2025-10-06', 'shiftDate: heatmap window start');

// --- computeStreaks ---
let s = computeStreaks([], '2026-10-11');
assert(s.currentStreak === 0 && s.longestStreak === 0 && s.studiedToday === false, 'computeStreaks: no activity');

s = computeStreaks(['2026-10-11'], '2026-10-11');
assert(s.currentStreak === 1 && s.longestStreak === 1 && s.studiedToday === true, 'computeStreaks: today only');

s = computeStreaks(['2026-10-10'], '2026-10-11');
assert(s.currentStreak === 1 && s.longestStreak === 1 && s.studiedToday === false, 'computeStreaks: yesterday only keeps streak alive');

s = computeStreaks(['2026-10-09'], '2026-10-11');
assert(s.currentStreak === 0 && s.longestStreak === 1, 'computeStreaks: a fully missed day breaks the streak');

s = computeStreaks(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'], '2026-10-11');
assert(s.currentStreak === 5 && s.longestStreak === 5, 'computeStreaks: five-day run ending today');

s = computeStreaks(['2026-10-11', '2026-10-09', '2026-10-10', '2026-10-10'], '2026-10-11');
assert(s.currentStreak === 3 && s.longestStreak === 3, 'computeStreaks: unsorted input and duplicates collapse');

s = computeStreaks(
  ['2026-08-01', '2026-08-02', '2026-08-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'],
  '2026-10-11'
);
assert(s.currentStreak === 6 && s.longestStreak === 6 && s.studiedToday === false, 'computeStreaks: current run ends yesterday, beats older run');

s = computeStreaks(
  ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-10-10'],
  '2026-10-11'
);
assert(s.currentStreak === 1 && s.longestStreak === 7, 'computeStreaks: longest kept from an older run');

s = computeStreaks(['2026-01-30', '2026-01-31', '2026-02-01'], '2026-02-01');
assert(s.currentStreak === 3 && s.longestStreak === 3, 'computeStreaks: run across a month boundary');

// --- summarizeActivity ---
const summary = summarizeActivity(
  [
    { activity_date: '2026-10-09', attempts_count: 3 },
    { activity_date: new Date(Date.UTC(2026, 9, 10)), attempts_count: '4' },
    { activity_date: '2026-10-11', attempts_count: 2 },
  ],
  '2026-10-11'
);
assert(summary.currentStreak === 3 && summary.longestStreak === 3 && summary.studiedToday === true, 'summarizeActivity: streaks from rows');
assert(summary.activeDays === 3 && summary.totalAttempts === 9, 'summarizeActivity: totals (numeric strings coerced)');
assert(summary.days[1].date === '2026-10-10' && summary.days[1].attempts === 4, 'summarizeActivity: pg DATE values normalized');

const empty = summarizeActivity([], '2026-10-11');
assert(empty.currentStreak === 0 && empty.activeDays === 0 && empty.totalAttempts === 0 && empty.days.length === 0, 'summarizeActivity: brand-new learner');

console.log('streak checks passed');
