import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { EmptyState, PanelHeading, RecordCount, SkeletonBar } from '../components/ui.jsx';

function MasteryBars({ rows }) {
  if (!rows.length) return <p className="muted">Answer exercises to start building concept mastery.</p>;
  const sorted = [...rows].sort((a, b) => Number(b.mastery) - Number(a.mastery)).slice(0, 12);
  return (
    <div>
      {sorted.map((row) => (
        <div className="skill-row" key={row.concept_id}>
          <span>{row.concept_id}</span>
          <div className="bar"><div className="fill" style={{ width: `${Math.round(Number(row.mastery) * 100)}%` }} /></div>
          <strong>{Math.round(Number(row.mastery) * 100)}%</strong>
        </div>
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
    <section className="page-stack">
      <p className="eyebrow">Progress</p>
      <h1 className="page-title">Your learning, measured</h1>
      <p className="lede">Spaced-repetition state and concept mastery update with every answered exercise.</p>

      {loading && <SkeletonBar label="Loading progress" />}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <div className="stack">
          <section className="panel compact">
            <PanelHeading title="Review queue" />
            <div className="session-stats">
              <RecordCount count={reviewsDue} label="reviews due" />
              <RecordCount count={items.length} label="items tracked" />
              <RecordCount count={attempts.length} label="recent attempts" />
            </div>
          </section>
          <section className="panel">
            <PanelHeading title="Concept mastery" />
            <MasteryBars rows={concepts} />
          </section>
          {!attempts.length && !concepts.length && (
            <EmptyState
              icon={TrendingUp}
              title="No progress yet"
              text="Complete a session to see your progress here."
            />
          )}
        </div>
      )}
    </section>
  );
}
