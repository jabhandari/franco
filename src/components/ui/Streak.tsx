import React from 'react';
import { Check, Flame } from 'lucide-react';
import { Box } from './Box';
import { Panel, PanelHeader } from './Panel';
import { RecordCount, StatGroup } from './Data';
import { EmptyState } from './EmptyState';
import { Text } from './Text';
import { buildHeatmap, streakLabel, HEATMAP_DAY_LABELS } from '../../presenters/streak.presenter.js';

// FRA-44 streak UI. All three placements read the GET /api/me/streak
// payload ({ currentStreak, longestStreak, studiedToday, activeDays,
// totalAttempts, today, days }) and render nothing until it arrives.

const FLAME_COLOR = '#d94836';
const FLAME_FILL = '#f4604e';

// Minimal local view of the streak payload.
// (Canonical streak types belong to the API-client ticket — FRA-61.)
export type StreakDay = {
  date: string;
  attempts: number;
};

export type StreakPayload = {
  currentStreak?: number | null;
  longestStreak?: number | null;
  studiedToday?: boolean;
  activeDays?: number | null;
  totalAttempts?: number | null;
  today?: string;
  days?: StreakDay[];
};

function bestLabel(longestStreak: number | null | undefined) {
  const best = Number(longestStreak) || 0;
  return `Best: ${best} day${best === 1 ? '' : 's'}`;
}

export type StreakChipProps = {
  streak?: StreakPayload | null;
  key?: React.Key;
};

// Compact flame chip for the sidebar, under the nav. In the collapsed
// icon rail only the flame is visible (see .streak-chip in styles.css),
// so the full label also goes on the title for hover discovery.
export function StreakChip({ streak }: StreakChipProps) {
  if (!streak) return null;
  const current = Number(streak.currentStreak) || 0;
  const title = current > 0 ? `${streakLabel(current)} · ${bestLabel(streak.longestStreak)}` : 'No streak yet · Study today to start';
  return (
    <Box className="streak-chip" title={title}>
      <Flame size={20} color={FLAME_COLOR} fill={FLAME_FILL} aria-hidden="true" />
      <Box as="span" className="streak-chip-text">
        <Text as="strong">{current > 0 ? streakLabel(current) : 'No streak yet'}</Text>
        <Box as="span">{current > 0 ? bestLabel(streak.longestStreak) : 'Study today to start'}</Box>
      </Box>
    </Box>
  );
}

export type StreakHeroProps = {
  streak?: StreakPayload | null;
  key?: React.Key;
};

// Streak summary for the Home daily panel, above the session button.
// Brand-new learners get the empty strip instead of a zero hero.
export function StreakHero({ streak }: StreakHeroProps) {
  if (!streak) return null;
  const current = Number(streak.currentStreak) || 0;
  const best = Number(streak.longestStreak) || 0;

  if (current === 0 && best === 0) {
    return (
      <Box className="streak-empty">
        <Flame className="flame-off" size={30} color={FLAME_COLOR} fill={FLAME_FILL} aria-hidden="true" />
        <Box>
          <Text as="strong">No streak yet</Text>
          <Box as="span">Finish your first exercise today and day 1 is yours.</Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="streak-hero">
      <Box className="streak-flame-badge">
        <Flame size={30} color={FLAME_COLOR} fill={FLAME_FILL} aria-hidden="true" />
      </Box>
      <Box className="streak-hero-main">
        <Box className="streak-big">
          {current} <Text as="small">day streak</Text>
        </Box>
        <Text as="p" className="streak-sub">
          Best streak <Text as="strong">{best} day{best === 1 ? '' : 's'}</Text>
          {streak.studiedToday ? ' · Keep it alive — any exercise counts.' : ' · Study today to keep it alive.'}
        </Text>
      </Box>
      {streak.studiedToday ? (
        <Box as="span" className="streak-today-pill">
          <Check size={14} aria-hidden="true" /> Studied today
        </Box>
      ) : null}
    </Box>
  );
}

export type StreakHeatmapProps = {
  days?: StreakDay[];
  today?: string;
  key?: React.Key;
};

// GitHub-style activity heatmap: week columns, Sunday..Saturday rows,
// intensity buckets from the streak presenter.
export function StreakHeatmap({ days, today }: StreakHeatmapProps) {
  // FRA-81: buildHeatmap requires a real YYYY-MM-DD string (an invalid date
  // throws, same as before); the optional prop stays for API-shape honesty.
  const { columns, months } = buildHeatmap(days || [], today ?? '');
  const monthByColumn = new Map(months.map((month) => [month.column, month.label]));
  return (
    <Box className="heat-wrap">
      <Box className="heat-months" aria-hidden="true">
        {columns.map((_, column) => (
          <Box as="span" key={column}>{monthByColumn.get(column) || ''}</Box>
        ))}
      </Box>
      <Box className="heat-body">
        <Box className="heat-days" aria-hidden="true">
          {HEATMAP_DAY_LABELS.map((label, row) => (
            <Box as="span" key={row}>{label}</Box>
          ))}
        </Box>
        <Box className="heat-grid">
          {columns.flatMap((column) =>
            column.map((cell) => (
              <Box
                as="span"
                key={cell.date}
                className={`heat-cell l${cell.level}${cell.isToday ? ' today' : ''}${cell.isFuture ? ' future' : ''}`}
                title={cell.isFuture ? undefined : `${cell.count} attempt${cell.count === 1 ? '' : 's'} · ${cell.date}`}
              />
            ))
          )}
        </Box>
      </Box>
      <Box className="heat-legend" aria-hidden="true">
        <Box as="span">Less</Box>
        {[0, 1, 2, 3, 4].map((level) => (
          <Box as="span" key={level} className={`heat-cell l${level}`} />
        ))}
        <Box as="span">More</Box>
      </Box>
    </Box>
  );
}

export type StreakPanelProps = {
  streak?: StreakPayload | null;
  key?: React.Key;
};

// Full consistency panel for the Progress view: streak stats + heatmap,
// or the empty state for learners with no activity yet.
export function StreakPanel({ streak }: StreakPanelProps) {
  if (!streak) return null;
  const hasActivity = (Number(streak.totalAttempts) || 0) > 0;
  return (
    <Panel>
      <PanelHeader eyebrow="Your learning" title="Consistency" aside={<Flame size={20} aria-hidden="true" />} />
      {hasActivity ? (
        <>
          <Box className="streak-stats4">
            <StatGroup>
              <RecordCount count={streak.currentStreak} label="current streak (days)" />
              <RecordCount count={streak.longestStreak} label="longest streak (days)" />
              <RecordCount count={streak.activeDays} label="active days" />
              <RecordCount count={streak.totalAttempts} label="total attempts" />
            </StatGroup>
          </Box>
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
