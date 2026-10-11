import React from 'react';
import { Database, TrendingUp } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { streakPath } from '../presenters/streak.presenter.js';
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
// so these imports carry no prop types. Each is pinned to the minimal prop
// subset this view passes via an explicit annotation (no `as`) so JSX is
// checked against real props instead of the inferred ones.
// Justification: proper component typing is impossible until FRA-63 ships
// real prop types for src/components/ui — delete this block then. Box's
// props vary too widely for a minimal interface, so it bridges on the
// per-view prop subset only.
type BoxProps = {
  as?: string;
  className?: string;
  children?: React.ReactNode;
};
type EmptyStateProps = {
  icon?: React.ElementType;
  title?: string;
  text?: string;
};
type ErrorMessageProps = {
  message?: string;
};
type PageProps = {
  children?: React.ReactNode;
};
type PageHeaderProps = {
  eyebrow?: string;
  title?: string;
  aside?: React.ReactNode;
};
type PanelProps = {
  compact?: boolean;
  children?: React.ReactNode;
};
type PanelHeaderProps = {
  eyebrow?: string;
  title?: string;
  aside?: React.ReactNode;
};
type ProgressBarProps = {
  label?: string;
  percent?: number;
  skeleton?: boolean;
};
type RecordCountProps = {
  count?: number;
  label?: string;
};
type StatGroupProps = {
  children?: React.ReactNode;
};
type StreakPanelProps = {
  streak?: StreakSummary | null;
};
type TextProps = {
  as?: string;
  variant?: string;
  size?: string;
  children?: React.ReactNode;
};
const Box: React.ComponentType<BoxProps> = BoxJsx;
const EmptyState: React.ComponentType<EmptyStateProps> = EmptyStateJsx;
const ErrorMessage: React.ComponentType<ErrorMessageProps> = ErrorMessageJsx;
const Page: React.ComponentType<PageProps> = PageJsx;
const PageHeader: React.ComponentType<PageHeaderProps> = PageHeaderJsx;
const Panel: React.ComponentType<PanelProps> = PanelJsx;
const PanelHeader: React.ComponentType<PanelHeaderProps> = PanelHeaderJsx;
const ProgressBar: React.ComponentType<ProgressBarProps> = ProgressBarJsx;
const RecordCount: React.ComponentType<RecordCountProps> = RecordCountJsx;
const StatGroup: React.ComponentType<StatGroupProps> = StatGroupJsx;
const StreakPanel: React.ComponentType<StreakPanelProps> = StreakPanelJsx;
const Text: React.ComponentType<TextProps> = TextJsx;

// --- Local types (FRA-66; for FRA-68: centralize into shared API types) ---

/** Recursive JSON value for jsonb-backed learner rows (attempt payloads). */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** One learner_concept_mastery row from GET /api/me/progress. */
type ConceptMasteryRow = {
  user_id?: string;
  concept_id: string;
  mastery?: number | null;
  confidence?: number | null;
  evidence_count?: number;
  model_version?: string;
  updated_at?: string;
  total_attempts?: number;
  correct_attempts?: number;
  consecutive_correct?: number;
  consecutive_incorrect?: number;
  last_practiced_at?: string | null;
  last_correct_at?: string | null;
  last_incorrect_at?: string | null;
};

/** One learner_item_state row (SM-2 state) from GET /api/me/progress. */
type LearnerItemStateRow = {
  user_id?: string;
  item_id: string;
  due_at?: string;
  interval_days?: number;
  ease?: number;
  repetitions?: number;
  lapses?: number;
  last_result?: string | null;
  last_attempt_at?: string | null;
};

/** One learning_attempts row from GET /api/me/progress. */
type LearningAttemptRow = {
  id: string;
  user_id?: string;
  item_id?: string;
  revision?: number;
  response_json?: JsonValue;
  evaluation_json?: JsonValue;
  score?: number | null;
  duration_ms?: number | null;
  created_at?: string;
  correct?: boolean | null;
  attempt_number?: number | null;
  session_id?: string | null;
  hint_used?: boolean;
};

/** GET /api/me/progress response. */
type ProgressResponse = {
  items?: LearnerItemStateRow[];
  concepts?: ConceptMasteryRow[];
  attempts?: LearningAttemptRow[];
};

/** One due-review row from GET /api/me/review-due (item state + item + revision). */
type ReviewDueRow = {
  id: string;
  external_id?: string;
  item_type?: string;
  cefr_level?: string;
  difficulty_score?: number | null;
  status?: string;
  created_at?: string;
  title?: string | null;
  prompt?: string | null;
  response_json?: JsonValue;
  evaluation_json?: JsonValue;
  metadata_json?: JsonValue;
  due_at?: string;
};

/** GET /api/me/review-due response. */
type ReviewDueResponse = {
  items?: ReviewDueRow[];
};

/** One day in the streak activity window (server/streak.js summarizeActivity). */
type StreakDay = {
  date: string;
  attempts: number;
};

/** Streak read model from GET /api/me/streak (consumed by StreakPanel). */
type StreakSummary = {
  currentStreak?: number | null;
  longestStreak?: number | null;
  studiedToday?: boolean;
  activeDays?: number;
  totalAttempts?: number;
  today?: string;
  days?: StreakDay[];
};

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

type ProgressProps = {
  token?: string | null;
};

export function Progress({ token }: ProgressProps) {
  const { data, loading, error } = useApiResource('/api/me/progress', token);
  const { data: reviewData } = useApiResource('/api/me/review-due', token);
  const { data: streakData } = useApiResource(streakPath(), token);

  // useApiResource is still untyped .js (typed by FRA-65); the locally
  // declared response shapes are captured by annotation (no `as`) at the
  // boundary.
  const progress: ProgressResponse | null = data;
  const concepts: ConceptMasteryRow[] = progress?.concepts || [];
  const attempts: LearningAttemptRow[] = progress?.attempts || [];
  const items: LearnerItemStateRow[] = progress?.items || [];
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
