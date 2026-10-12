import React from 'react';
import { BookOpen, Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard as ExerciseCardJsx } from '../components/exercises/ExerciseCard.jsx';
import { CEFR_LEVELS } from '../presenters/levels.presenter.js';
import { Box as BoxJsx, Button as ButtonJsx, EmptyState as EmptyStateJsx, Page as PageJsx, PageHeader as PageHeaderJsx, Tabs as TabsJsx, Toolbar as ToolbarJsx } from '../components/ui';

// FRA-66 interim bridge: these are still .jsx (ExerciseCard: FRA-65,
// src/components/ui: FRA-63), so these imports carry no prop types. Each is
// pinned to the minimal prop subset this view passes via an explicit
// annotation (no `as`) so JSX is checked against real props instead of the
// inferred ones.
// Justification: proper component typing is impossible until FRA-63/FRA-65
// ship real prop types — delete this block then. Box's props vary too
// widely for a minimal interface, so it bridges on the per-view prop
// subset only.
type BoxProps = {
  as?: string;
  className?: string;
  children?: React.ReactNode;
};
type ButtonProps = {
  variant?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};
type EmptyStateProps = {
  icon?: React.ElementType;
  title?: string;
  text?: string;
};
type ExerciseCardProps = {
  entry: SessionQueueEntry;
  token?: string | null;
};
type PageProps = {
  children?: React.ReactNode;
};
type PageHeaderProps = {
  eyebrow?: string;
  title?: React.ReactNode;
  lede?: string;
};
type TabsOption = {
  id: string;
  label: string;
};
type TabsProps = {
  variant?: string;
  compact?: boolean;
  options?: TabsOption[];
  value?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
};
type ToolbarProps = {
  meta?: React.ReactNode;
  actions?: React.ReactNode;
};
const ExerciseCard: React.ComponentType<ExerciseCardProps> = ExerciseCardJsx;
const Box: React.ComponentType<BoxProps> = BoxJsx;
const Button: React.ComponentType<ButtonProps> = ButtonJsx;
const EmptyState: React.ComponentType<EmptyStateProps> = EmptyStateJsx;
const Page: React.ComponentType<PageProps> = PageJsx;
const PageHeader: React.ComponentType<PageHeaderProps> = PageHeaderJsx;
const Tabs: React.ComponentType<TabsProps> = TabsJsx;
const Toolbar: React.ComponentType<ToolbarProps> = ToolbarJsx;

// --- Local types (FRA-66; for FRA-68: centralize into shared API types) ---

/** Grading rubric from evaluation_json: criterion name → description (WritingPrompt renders each entry). */
type EvaluationRubric = Record<string, string>;

/** Expected key points from evaluation_json (SpeakingPrompt "Ideas to include" list). */
type ExpectedPoints = string[];

/** Follow-up questions from evaluation_json (SpeakingPrompt "Try a follow-up" list). */
type FollowUpQuestions = string[];

/** One media attachment on a queue entry (media_assets). */
type SessionQueueMedia = {
  kind: string;
  url: string;
  duration_seconds?: number | null;
  transcript?: string | null;
};

/** One normalized MCQ choice (server normalizeChoices) — exam and drill entries only. */
type SessionChoice = {
  key: string;
  text: string;
};

/**
 * One MCQ choice on a content-track entry: shapeContentItem passes
 * resp.choices through raw, and the content contract stores choices as
 * {id, text} (schemas/content.v1.schema.json; content-contract.js).
 */
type SessionContentChoice = {
  id: string;
  text: string;
};

/**
 * Adaptive content entry from the server's shapeContentItem: due SM-2
 * reviews, new items at level, and weak-concept items.
 */
type SessionContentEntry = {
  external_id: string;
  queue_kind: 'review' | 'new' | 'weak';
  item_kind: 'content_item';
  id: string;
  level: string;
  type: string;
  title?: string | null;
  prompt?: string | null;
  instructions?: string | null;
  context?: string | null;
  media: SessionQueueMedia[];
  evaluation_mode?: string | null;
  choices?: SessionContentChoice[];
  tokens?: string[];
  rubric?: EvaluationRubric;
  expected_points?: ExpectedPoints;
  follow_up_questions?: FollowUpQuestions;
  expected?: string;
};

/** Exam-practice entry (legacy exam_questions track). */
type SessionExamEntry = {
  queue_kind: 'exam';
  item_kind: 'exam_question';
  id: string;
  level: string;
  type: 'multiple_choice';
  skill: string;
  title: string;
  prompt: string;
  context?: string | null;
  choices: SessionChoice[];
  media: SessionQueueMedia[];
};

/** Extra legacy drill entry (UD-generated exercise_items). */
type SessionDrillEntry = {
  queue_kind: 'drill';
  item_kind: 'exercise';
  id: string;
  level: string;
  type: string;
  prompt: string;
  media: SessionQueueMedia[];
  choices?: SessionChoice[];
  tokens?: string[];
};

/** One queued exercise from GET /api/me/session-plan (buildSessionPlan). */
type SessionQueueEntry = SessionContentEntry | SessionExamEntry | SessionDrillEntry;

/** GET /api/me/session-plan response. */
type SessionPlanResponse = {
  section?: string;
  reviewsDue?: number;
  queue?: SessionQueueEntry[];
  estimatedMinutes?: number;
  message?: string;
};

type SessionProps = {
  token?: string | null;
  /** Level preselected by the Learn view's quiz entry point (FRA-47). */
  initialLevel?: string | null;
};

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
  // useApiResource is still untyped .js (typed by FRA-65); the response
  // shape is captured by annotation (no `as`) at the boundary.
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
