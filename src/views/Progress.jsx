import React from 'react';
import { Database, TrendingUp } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import {
  EmptyState,
  ErrorMessage,
  Page,
  PageHeader,
  Panel,
  PanelHeader,
  ProgressBar,
  RecordCount,
  StatGroup,
  Text,
} from '../components/ui';

function MasteryBars({ rows }) {
  if (!rows.length) return <Text variant="muted">Answer exercises to start building concept mastery.</Text>;
  const sorted = [...rows].sort((a, b) => Number(b.mastery) - Number(a.mastery)).slice(0, 12);
  return (
    <div>
      {sorted.map((row) => (
        <ProgressBar key={row.concept_id} label={row.concept_id} percent={Math.round(Number(row.mastery) * 100)} />
      ))}
    </div>
  );
}

export function Progress({ token }) {
  const { data, loading, error } = useApiResource('/api/me/progress', token);
  const { data: reviewData } = useApiResource('/api/me/review-due', token);

  const concepts = data?.concepts || [];
  const attempts = data?.attempts || [];
  const items = data?.items || [];
  const reviewsDue = reviewData?.items?.length ?? 0;

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
        <div className="stack">
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
          {!attempts.length && !concepts.length && (
            <EmptyState
              icon={TrendingUp}
              title="No progress yet"
              text="Complete a session to see your progress here."
            />
          )}
        </div>
      )}
    </Page>
  );
}
