import React from 'react';
import { BookOpen, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard as ExerciseCardJsx } from '../components/exercises/ExerciseCard.jsx';
import { CEFR_LEVELS } from '../presenters/levels.presenter.js';
import { Box as BoxJsx, Button as ButtonJsx, EmptyState as EmptyStateJsx, Page as PageJsx, PageHeader as PageHeaderJsx, Tabs as TabsJsx, Toolbar as ToolbarJsx } from '../components/ui';

// FRA-66 interim bridge: these are still .jsx (ExerciseCard: FRA-65,
// src/components/ui: FRA-63), and tsc infers required-any props from allowJs
// sources. Each import is pinned to the minimal prop subset this view
// passes, so JSX is checked against real props instead of the inferred ones.
// Justification: proper component typing is impossible until FRA-63/FRA-65
// ship real prop types — delete this block then. Box's props vary too
// widely for a minimal interface, so it bridges as
// ComponentType<Record<string, unknown>>.
interface ButtonProps {
  variant?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}
interface EmptyStateProps {
  icon?: React.ElementType;
  title?: string;
  text?: string;
}
interface ExerciseCardProps {
  entry: SessionQueueEntry;
  token?: string | null;
}
interface PageProps {
  children?: React.ReactNode;
}
interface PageHeaderProps {
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: string;
}
interface TabsOption {
  id: string;
  label: string;
}
interface TabsProps {
  variant?: string;
  compact?: boolean;
  options?: TabsOption[];
  value?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
}
interface TextProps {
  as?: string;
  variant?: string;
  size?: string;
  children?: React.ReactNode;
}
interface ToolbarProps {
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}
const ExerciseCard = ExerciseCardJsx as React.ComponentType<ExerciseCardProps>;
const Box = BoxJsx as React.ComponentType<Record<string, unknown>>;
const Button = ButtonJsx as React.ComponentType<ButtonProps>;
const EmptyState = EmptyStateJsx as React.ComponentType<EmptyStateProps>;
const Page = PageJsx as React.ComponentType<PageProps>;
const PageHeader = PageHeaderJsx as React.ComponentType<PageHeaderProps>;
const Tabs = TabsJsx as React.ComponentType<TabsProps>;
const Toolbar = ToolbarJsx as React.ComponentType<ToolbarProps>;

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
  // useApiResource is still untyped .js (typed by FRA-65); the locally
  // declared SessionPlanResponse is assigned directly (no `as`) since the
  // hook's data is untyped at the boundary.
  const plan: SessionPlanResponse | null = data;
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
