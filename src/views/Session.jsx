import React from 'react';
import { BookOpen, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard.jsx';
import { CEFR_LEVELS } from '../presenters/levels.presenter.js';
import { Box, Button, EmptyState, Page, PageHeader, Tabs, Toolbar } from '../components/ui';

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
    <Page>
      <PageHeader
        eyebrow="Daily session"
        title={`${selectedSection} session queue`}
        lede="Work through the list in order — reviews first, then new material at your level."
      />
      <Tabs
        variant="section"
        compact
        options={CEFR_LEVELS.map((section) => ({ id: section, label: section }))}
        value={selectedSection}
        onChange={setSelectedSection}
        ariaLabel="Choose session level"
      />
      {loading && <EmptyState icon={Database} title="Preparing your session" text="Loading questions for this level." />}
      {error && <EmptyState icon={Database} title="Couldn't load this session" text={error} />}
      {!loading && !error && !queue.length && (
        <EmptyState icon={BookOpen} title="No exercises yet" text="Nothing is queued for this level yet. Try another level or check back after your next review window." />
      )}
      {!loading && !error && queue.length > 0 && (
        <>
          <Toolbar
            meta={<>{queue.length} questions{(data?.reviewsDue ?? 0) > 0 && ` · ${data.reviewsDue} reviews due`}</>}
            actions={<Button variant="reset" onClick={() => setResetKey((value) => value + 1)}>Reset all</Button>}
          />
          <Box className="exercise-list">
            {queue.map((entry) => (
              <ExerciseCard key={`${resetKey}-${entry.item_kind}-${entry.id}`} entry={entry} token={token} />
            ))}
          </Box>
        </>
      )}
    </Page>
  );
}
