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
// and tsc infers required-any props from allowJs sources. Cast to untyped
// components so JSX usage isn't checked against those inferred props.
// Delete this block once FRA-63 ships real component prop types.
const Box: React.ComponentType<any> = BoxJsx;
const EmptyState: React.ComponentType<any> = EmptyStateJsx;
const ErrorMessage: React.ComponentType<any> = ErrorMessageJsx;
const Page: React.ComponentType<any> = PageJsx;
const PageHeader: React.ComponentType<any> = PageHeaderJsx;
const Panel: React.ComponentType<any> = PanelJsx;
const PanelHeader: React.ComponentType<any> = PanelHeaderJsx;
const ProgressBar: React.ComponentType<any> = ProgressBarJsx;
const RecordCount: React.ComponentType<any> = RecordCountJsx;
const StatGroup: React.ComponentType<any> = StatGroupJsx;
const StreakPanel: React.ComponentType<any> = StreakPanelJsx;
const Text: React.ComponentType<any> = TextJsx;
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

  const progress = data as ProgressResponse | null;
  const concepts: ConceptMasteryRow[] = progress?.concepts || [];
  const attempts = progress?.attempts || [];
  const items = progress?.items || [];
  const reviewsDue = (reviewData as ReviewDueResponse | null)?.items?.length ?? 0;

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
