import React from 'react';
import { BookOpen, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard.jsx';
import { EmptyState } from '../components/ui.jsx';

const SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Restored original session display: the full question list under the level
// tabs, instead of the one-at-a-time stepper. The queue itself is still the
// adaptive server-ordered one (due reviews, new items, weak concepts — never
// client-side random), and every card reports its answer to /api/me/attempts.
export function Session({ token }) {
  const [selectedSection, setSelectedSection] = React.useState('A1');
  const [resetKey, setResetKey] = React.useState(0);
  const { data, loading, error } = useApiResource(`/api/me/session-plan?section=${selectedSection}`, token);
  const queue = data?.queue || [];

  return (
    <section className="page-stack">
      <p className="eyebrow">Daily session</p>
      <h1 className="page-title">{selectedSection} session queue</h1>
      <p className="lede">
        Work through the list in order — reviews first, then new material at your level.
      </p>
      <div className="section-tabs compact" role="group" aria-label="Choose session level">
        {SECTIONS.map((section) => (
          <button key={section} className={selectedSection === section ? 'selected' : ''} onClick={() => setSelectedSection(section)}>
            <strong>{section}</strong>
          </button>
        ))}
      </div>
      {loading && <EmptyState icon={Database} title="Preparing your session" text="Loading questions for this level." />}
      {error && <EmptyState icon={Database} title="Couldn't load this session" text={error} />}
      {!loading && !error && !queue.length && (
        <EmptyState icon={BookOpen} title="No exercises yet" text="Nothing is queued for this level yet. Try another level or check back after your next review window." />
      )}
      {!loading && !error && queue.length > 0 && (
        <>
          <div className="session-toolbar">
            <span>{queue.length} questions{(data?.reviewsDue ?? 0) > 0 && ` · ${data.reviewsDue} reviews due`}</span>
            <button className="reset-button" onClick={() => setResetKey((value) => value + 1)}>Reset all</button>
          </div>
          <div className="exercise-list">
            {queue.map((entry) => (
              <ExerciseCard key={`${resetKey}-${entry.item_kind}-${entry.id}`} entry={entry} token={token} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
