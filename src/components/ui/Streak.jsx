import React from 'react';
import { Check, Flame } from 'lucide-react';
import { Panel, PanelHeader } from './Panel.jsx';
import { RecordCount, StatGroup } from './Data.jsx';
import { EmptyState } from './EmptyState.jsx';
import { Text } from './Text.jsx';
import { buildHeatmap, streakLabel, HEATMAP_DAY_LABELS } from '../../presenters/streak.presenter.js';

// FRA-44 streak UI. All three placements read the GET /api/me/streak
// payload ({ currentStreak, longestStreak, studiedToday, activeDays,
// totalAttempts, today, days }) and render nothing until it arrives.

const FLAME_COLOR = '#d94836';
const FLAME_FILL = '#f4604e';

function bestLabel(longestStreak) {
  const best = Number(longestStreak) || 0;
  return `Best: ${best} day${best === 1 ? '' : 's'}`;
}

// Compact flame chip for the sidebar, under the nav.
export function StreakChip({ streak }) {
  if (!streak) return null;
  const current = Number(streak.currentStreak) || 0;
  return (
    <div className="streak-chip">
      <Flame size={20} color={FLAME_COLOR} fill={FLAME_FILL} aria-hidden="true" />
      <span className="streak-chip-text">
        <strong>{current > 0 ? streakLabel(current) : 'No streak yet'}</strong>
        <span>{current > 0 ? bestLabel(streak.longestStreak) : 'Study today to start'}</span>
      </span>
    </div>
  );
}

// Streak summary for the Home daily panel, above the session button.
// Brand-new learners get the empty strip instead of a zero hero.
export function StreakHero({ streak }) {
  if (!streak) return null;
  const current = Number(streak.currentStreak) || 0;
  const best = Number(streak.longestStreak) || 0;

  if (current === 0 && best === 0) {
    return (
      <div className="streak-empty">
        <Flame className="flame-off" size={30} color={FLAME_COLOR} fill={FLAME_FILL} aria-hidden="true" />
        <div>
          <strong>No streak yet</strong>
          <span>Finish your first exercise today and day 1 is yours.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="streak-hero">
      <div className="streak-flame-badge">
        <Flame size={30} color={FLAME_COLOR} fill={FLAME_FILL} aria-hidden="true" />
      </div>
      <div className="streak-hero-main">
        <div className="streak-big">
          {current} <small>day streak</small>
        </div>
        <p className="streak-sub">
          Best streak <strong>{best} day{best === 1 ? '' : 's'}</strong>
          {streak.studiedToday ? ' · Keep it alive — any exercise counts.' : ' · Study today to keep it alive.'}
        </p>
      </div>
      {streak.studiedToday ? (
        <span className="streak-today-pill">
          <Check size={14} aria-hidden="true" /> Studied today
        </span>
      ) : null}
    </div>
  );
}

// GitHub-style activity heatmap: week columns, Sunday..Saturday rows,
// intensity buckets from the streak presenter.
export function StreakHeatmap({ days, today }) {
  const { columns, months } = buildHeatmap(days || [], today);
  const monthByColumn = new Map(months.map((month) => [month.column, month.label]));
  return (
    <div className="heat-wrap">
      <div className="heat-months" aria-hidden="true">
        {columns.map((_, column) => (
          <span key={column}>{monthByColumn.get(column) || ''}</span>
        ))}
      </div>
      <div className="heat-body">
        <div className="heat-days" aria-hidden="true">
          {HEATMAP_DAY_LABELS.map((label, row) => (
            <span key={row}>{label}</span>
          ))}
        </div>
        <div className="heat-grid">
          {columns.flatMap((column) =>
            column.map((cell) => (
              <span
                key={cell.date}
                className={`heat-cell l${cell.level}${cell.isToday ? ' today' : ''}${cell.isFuture ? ' future' : ''}`}
                title={cell.isFuture ? undefined : `${cell.count} attempt${cell.count === 1 ? '' : 's'} · ${cell.date}`}
              />
            ))
          )}
        </div>
      </div>
      <div className="heat-legend" aria-hidden="true">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className={`heat-cell l${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// Full consistency panel for the Progress view: streak stats + heatmap,
// or the empty state for learners with no activity yet.
export function StreakPanel({ streak }) {
  if (!streak) return null;
  const hasActivity = (Number(streak.totalAttempts) || 0) > 0;
  return (
    <Panel>
      <PanelHeader eyebrow="Your learning" title="Consistency" aside={<Flame size={20} aria-hidden="true" />} />
      {hasActivity ? (
        <>
          <div className="streak-stats4">
            <StatGroup>
              <RecordCount count={streak.currentStreak} label="current streak (days)" />
              <RecordCount count={streak.longestStreak} label="longest streak (days)" />
              <RecordCount count={streak.activeDays} label="active days" />
              <RecordCount count={streak.totalAttempts} label="total attempts" />
            </StatGroup>
          </div>
          <StreakHeatmap days={streak.days} today={streak.today} />
          <Text variant="muted" size="sm" className="streak-note">
            Heatmap: the last 12 months. Any day with at least one exercise counts toward your streak.
          </Text>
        </>
      ) : (
        <EmptyState
          icon={Flame}
          title="No streak yet"
          text="Finish your first exercise today and day 1 is yours."
        />
      )}
    </Panel>
  );
}
