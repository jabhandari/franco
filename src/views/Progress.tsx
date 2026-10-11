import React from 'react';
import { Database, TrendingUp } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import {
  Box as BoxJsx,
  EmptyState as EmptyStateJsx,
  ErrorMessage as ErrorMessageJsx,
  Page as PageJsx,
  PageHeader as PageHeaderJsx,
  Panel as PanelJsx,
  PanelHeader as PanelHeaderJsx,
  ProgressBar as ProgressBarJsx,
  RecordCount as RecordCountJsx,
  StatGroup as StatGroupJsx,
  StreakPanel as StreakPanelJsx,
  Text as TextJsx,
} from '../components/ui';

// FRA-66 interim bridge: src/components/ui/ is still .jsx (typed by FRA-63),
// and tsc infers required-any props from allowJs sources. Each import is
// pinned to the minimal prop subset this view passes, so JSX is checked
// against real props instead of the inferred ones.
// Justification: proper component typing is impossible until FRA-63 ships
// real prop types for src/components/ui — delete this block then. Box's
// props vary too widely for a minimal interface, so it bridges as
// ComponentType<Record<string, unknown>>.
interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  text?: string;
}
interface ErrorMessageProps {
  message?: string;
}
interface PageProps {
  children?: React.ReactNode;
}
interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  aside?: React.ReactNode;
}
interface PanelProps {
  compact?: boolean;
  children?: React.ReactNode;
}
interface PanelHeaderProps {
  eyebrow?: string;
  title?: string;
  aside?: React.ReactNode;
}
interface ProgressBarProps {
  label?: string;
  percent?: number;
  skeleton?: boolean;
}
interface RecordCountProps {
  count?: number;
  label?: string;
}
interface StatGroupProps {
  children?: React.ReactNode;
}
interface StreakPanelProps {
  streak?: StreakSummary | null;
}
interface TextProps {
  as?: string;
  variant?: string;
  size?: string;
  children?: React.ReactNode;
}
const Box = BoxJsx as React.ComponentType<Record<string, unknown>>;
const EmptyState = EmptyStateJsx as React.ComponentType<EmptyStateProps>;
const ErrorMessage = ErrorMessageJsx as React.ComponentType<ErrorMessageProps>;
const Page = PageJsx as React.ComponentType<PageProps>;
const PageHeader = PageHeaderJsx as React.ComponentType<PageHeaderProps>;
const Panel = PanelJsx as React.ComponentType<PanelProps>;
const PanelHeader = PanelHeaderJsx as React.ComponentType<PanelHeaderProps>;
const ProgressBar = ProgressBarJsx as React.ComponentType<ProgressBarProps>;
const RecordCount = RecordCountJsx as React.ComponentType<RecordCountProps>;
const StatGroup = StatGroupJsx as React.ComponentType<StatGroupProps>;
const StreakPanel = StreakPanelJsx as React.ComponentType<StreakPanelProps>;
const Text = TextJsx as React.ComponentType<TextProps>;
import { streakPath } from '../presenters/streak.presenter.js';

// --- Local interfaces (FRA-66; for FRA-68: centralize into shared API types) ---

/** One concept mastery row from GET /api/me/progress (learner_concept_mastery). */
interface ConceptMasteryRow {
  concept_id: string;
  mastery?: number | string | null;
  [key: string]: unknown;
}

/** GET /api/me/progress response. */
interface ProgressResponse {
  concepts?: ConceptMasteryRow[];
  attempts?: unknown[];
  items?: unknown[];
}

/** GET /api/me/review-due response. */
interface ReviewDueResponse {
  items?: unknown[];
}

/** Streak read model from GET /api/me/streak (consumed by StreakPanel). */
interface StreakSummary {
  [key: string]: unknown;
}

function MasteryBars({ rows }: { rows: ConceptMasteryRow[] }) {
  if (!rows.length) return <Text variant="muted">Answer exercises to start building concept mastery.</Text>;
  const sorted = [...rows].sort((a, b) => Number(b.mastery) - Number(a.mastery)).slice(0, 12);
  return (
    <Box>
      {sorted.map((row) => (
        <ProgressBar key={row.concept_id} label={row.concept_id} percent={Math.round(Number(row.mastery) * 100)} />
      ))}
    </Box>
  );
}

interface ProgressProps {
  token?: string | null;
}

export function Progress({ token }: ProgressProps) {
  const { data, loading, error } = useApiResource('/api/me/progress', token);
  const { data: reviewData } = useApiResource('/api/me/review-due', token);
  const { data: streakData } = useApiResource(streakPath(), token);

  // useApiResource is still untyped .js (typed by FRA-65); the locally
  // declared response shapes are assigned directly (no `as`) since the
  // hook's data is untyped at the boundary.
  const progress: ProgressResponse | null = data;
  const concepts: ConceptMasteryRow[] = progress?.concepts || [];
  const attempts = progress?.attempts || [];
  const items = progress?.items || [];
  const reviewProgress: ReviewDueResponse | null = reviewData;
  const reviewsDue = reviewProgress?.items?.length ?? 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Progress"
        title="Your learning, measured"
        lede="Your review queue and concept mastery update every time you answer an exercise."
      />

      {loading && <ProgressBar label="Loading progress" skeleton />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && (
        <Box className="stack">
          <Panel compact>
            <PanelHeader eyebrow="Your learning" title="Review queue" aside={<Database size={20} aria-hidden="true" />} />
            <StatGroup>
              <RecordCount count={reviewsDue} label="reviews due" />
              <RecordCount count={items.length} label="items tracked" />
              <RecordCount count={attempts.length} label="recent attempts" />
            </StatGroup>
          </Panel>
          <Panel>
            <PanelHeader eyebrow="Your learning" title="Concept mastery" aside={<Database size={20} aria-hidden="true" />} />
            <MasteryBars rows={concepts} />
          </Panel>
          <StreakPanel streak={streakData} />
          {!attempts.length && !concepts.length && (
            <EmptyState
              icon={TrendingUp}
              title="No progress yet"
              text="Complete a session to see your progress here."
            />
          )}
        </Box>
      )}
    </Page>
  );
}
