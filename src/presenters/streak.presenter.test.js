// Unit checks for the streak presenter: API path, heat buckets, labels,
// and the GitHub-style week-column heatmap grid.
import {
  streakPath,
  heatLevel,
  streakLabel,
  buildHeatmap,
  HEATMAP_DAY_LABELS,
} from './streak.presenter.ts';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- streakPath ---
assert(streakPath('America/Toronto') === '/api/me/streak?tz=America%2FToronto', 'streakPath: timezone encoded');
assert(streakPath('UTC') === '/api/me/streak?tz=UTC', 'streakPath: UTC');
assert(streakPath('') === '/api/me/streak?tz=UTC', 'streakPath: empty zone -> UTC');

// --- heatLevel (buckets 0 · 1 · 2-4 · 5-9 · 10+) ---
assert(heatLevel(0) === 0, 'heatLevel: 0 attempts');
assert(heatLevel(1) === 1, 'heatLevel: 1 attempt');
assert(heatLevel(2) === 2 && heatLevel(4) === 2, 'heatLevel: 2-4 attempts');
assert(heatLevel(5) === 3 && heatLevel(9) === 3, 'heatLevel: 5-9 attempts');
assert(heatLevel(10) === 4 && heatLevel(40) === 4, 'heatLevel: 10+ attempts');
assert(heatLevel(undefined) === 0 && heatLevel('x') === 0, 'heatLevel: garbage -> 0');
assert(heatLevel('3') === 2, 'heatLevel: numeric string coerced');

// --- streakLabel ---
assert(streakLabel(1) === '1-day streak', 'streakLabel: singular');
assert(streakLabel(12) === '12-day streak', 'streakLabel: plural');
assert(streakLabel(0) === '0-day streak', 'streakLabel: zero');
assert(streakLabel(undefined) === '0-day streak', 'streakLabel: missing -> 0');

// --- buildHeatmap ---
// 2026-10-11 is a Sunday, so a 2-week grid starts Sunday 2026-10-04 and
// the last column runs Oct 11 (today) .. Oct 17 (all future but today).
const grid = buildHeatmap([{ date: '2026-10-10', attempts: 7 }, { date: '2026-10-04', attempts: 1 }], '2026-10-11', 2);
assert(grid.columns.length === 2, 'buildHeatmap: two week columns');
assert(grid.columns.every((column) => column.length === 7), 'buildHeatmap: seven rows per column');
assert(grid.startDate === '2026-10-04' && grid.endDate === '2026-10-11', 'buildHeatmap: window aligned to Sundays');
assert(grid.columns[0][0].date === '2026-10-04' && grid.columns[0][0].count === 1 && grid.columns[0][0].level === 1, 'buildHeatmap: first cell carries its count/level');
assert(grid.columns[0][6].date === '2026-10-10' && grid.columns[0][6].level === 3, 'buildHeatmap: Saturday cell, 7 attempts -> level 3');
const todayCell = grid.columns[1][0];
assert(todayCell.date === '2026-10-11' && todayCell.isToday && !todayCell.isFuture, 'buildHeatmap: today flagged in final column');
assert(grid.columns[1][1].isFuture && grid.columns[1][6].isFuture, 'buildHeatmap: cells after today flagged future');
assert(grid.months.length === 1 && grid.months[0].label === 'Oct' && grid.months[0].column === 0, 'buildHeatmap: single month label');

const yearGrid = buildHeatmap([], '2026-10-11', 53);
assert(yearGrid.columns.length === 53 && yearGrid.startDate === '2025-10-12', 'buildHeatmap: 53-week default window');
assert(yearGrid.months[0].label === 'Oct' && yearGrid.months[1].label === 'Nov', 'buildHeatmap: month labels advance');
assert(yearGrid.columns.flat().every((cell) => cell.count === 0 && cell.level === 0), 'buildHeatmap: empty history is all level 0');

assert(HEATMAP_DAY_LABELS.length === 7 && HEATMAP_DAY_LABELS[1] === 'Mon' && HEATMAP_DAY_LABELS[3] === 'Wed' && HEATMAP_DAY_LABELS[5] === 'Fri', 'HEATMAP_DAY_LABELS: Mon/Wed/Fri rows');

console.log('streak.presenter checks passed');
