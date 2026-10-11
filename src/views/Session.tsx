import React from 'react';
import { BookOpen, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard as ExerciseCardJsx } from '../components/exercises/ExerciseCard.jsx';
import { CEFR_LEVELS } from '../presenters/levels.presenter.js';
import { Box as BoxJsx, Button as ButtonJsx, EmptyState as EmptyStateJsx, Page as PageJsx, PageHeader as PageHeaderJsx, Tabs as TabsJsx, Toolbar as ToolbarJsx } from '../components/ui';

// FRA-66 interim bridge: these are still .jsx (ExerciseCard: FRA-65,
// src/components/ui: FRA-63), and tsc infers required-any props from allowJs
// sources. Cast to untyped components so JSX usage isn't checked against
// those inferred props. Delete this block once the owning tickets land.
const ExerciseCard: React.ComponentType<any> = ExerciseCardJsx;
const Box: React.ComponentType<any> = BoxJsx;
const Button: React.ComponentType<any> = ButtonJsx;
const EmptyState: React.ComponentType<any> = EmptyStateJsx;
const Page: React.ComponentType<any> = PageJsx;
const PageHeader: React.ComponentType<any> = PageHeaderJsx;
const Tabs: React.ComponentType<any> = TabsJsx;
const Toolbar: React.ComponentType<any> = ToolbarJsx;

// --- Local interfaces (FRA-66; for FRA-68: centralize into shared API types) ---

/** One queued exercise from GET /api/me/session-plan (ExerciseCard owns the full entry shape). */
interface SessionQueueEntry {
  id: string | number;
  item_kind: string;
  [key: string]: unknown;
}

/** GET /api/me/session-plan response. */
interface SessionPlanResponse {
  queue?: SessionQueueEntry[];
  reviewsDue?: number;
}

interface SessionProps {
  token?: string | null;
  /** Level preselected by the Learn view's quiz entry point (FRA-47). */
  initialLevel?: string | null;
}

// Restored original session display: the full question list under the level
// tabs, instead of the one-at-a-time stepper. The queue itself is still the
// adaptive server-ordered one (due reviews, new items, weak concepts — never
// client-side random), and every card reports its answer to /api/me/attempts.
// FRA-47: initialLevel preselects the level when the Learn view's quiz entry
// point navigates here.
export function Session({ token, initialLevel }: SessionProps) {
  const [selectedSection, setSelectedSection] = React.useState(initialLevel || 'A1');
  const [resetKey, setResetKey] = React.useState(0);
  const { data, loading, error } = useApiResource(`/api/me/session-plan?section=${selectedSection}`, token);
  const plan = data as SessionPlanResponse | null;
  const queue: SessionQueueEntry[] = plan?.queue || [];

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
            meta={<>{queue.length} questions{(plan?.reviewsDue ?? 0) > 0 && ` · ${plan?.reviewsDue} reviews due`}</>}
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
