import React from 'react';
import { BookOpen, PenLine, Mic, Library } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard';
import { ConceptRoadmap, LevelGuide, TopicTracks } from '../components/concepts';
import { CEFR_LEVELS as SECTIONS } from '../presenters/levels.presenter.js';
import { humanize } from '../presenters/format.presenter.js';
import {
  Box,
  EmptyState,
  ErrorMessage,
  Panel,
  PanelHeader,
  Tabs,
  Text,
} from '../components/ui';

<<<<<<< HEAD
// FRA-67: local interface. Canonical ownership of the content-item shape
// belongs to a later ticket; kept minimal here (see "Notes for FRA-68").
interface ContentItem {
  id: string | number;
  [key: string]: unknown;
}
=======
// Interim bridge until FRA-63 converts the .jsx sources
// (src/components/ui/, src/components/concepts.jsx,
// src/components/exercises/ExerciseCard.jsx) to .tsx with real prop types.
// Under allowJs those .jsx imports expose no usable prop types to tsc, so
// each binding below pins the imported component to the minimal props this
// view passes. This uses a plain typed assignment — no `as` assertion is
// needed because the untyped .jsx exports assign cleanly to the declared
// component type. Delete the whole block once FRA-63 lands.

// Minimal props the views pass — kept local per the read-only window on
// src/types.ts (see "Notes for FRA-68").
type IconComponent = React.ComponentType<{ size?: number | string; className?: string }>;
// Prop-value kinds the views pass to the polymorphic primitives (Box,
// Text): strings, numbers, booleans, renderable children, and event
// handlers.
type LooseProps = Record<string, React.ReactNode | ((...args: never[]) => void)>;

// Input contract of normalizeChoices() in
// src/presenters/collections.presenter.js: a JSON string, an array of
// choice objects, a key->text map, or null.
type RawChoice = {
  key?: string | number;
  id?: string | number;
  text?: string | number | null;
};
type ChoicesInput = string | RawChoice[] | Record<string, string | number | null> | null | undefined;

type ExerciseCardProps = {
  entry: ContentListItem;
  token?: string | null;
};

type ConceptRoadmapProps = {
  level: string;
  token?: string | null;
  onSelectSection: (section: string) => void;
};

type LevelGuideProps = {
  section: string;
};

type TopicTracksProps = {
  section: string;
};

type EmptyStateProps = {
  icon?: IconComponent;
  title: string;
  text: string;
};

type ErrorMessageProps = {
  message: string;
};

type PanelProps = {
  children?: React.ReactNode;
};

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  aside?: React.ReactNode;
};

type TabOption = {
  id: string;
  label: string;
  icon?: IconComponent;
};

type TabsProps = {
  variant?: 'library' | 'section' | 'roadmap';
  options: TabOption[];
  value: string;
  onChange: (id: string) => void;
};

const ExerciseCard: React.ComponentType<ExerciseCardProps> = _ExerciseCard;
const ConceptRoadmap: React.ComponentType<ConceptRoadmapProps> = _ConceptRoadmap;
const LevelGuide: React.ComponentType<LevelGuideProps> = _LevelGuide;
const TopicTracks: React.ComponentType<TopicTracksProps> = _TopicTracks;
const Box: React.ComponentType<LooseProps> = _Box;
const EmptyState: React.ComponentType<EmptyStateProps> = _EmptyState;
const ErrorMessage: React.ComponentType<ErrorMessageProps> = _ErrorMessage;
const Panel: React.ComponentType<PanelProps> = _Panel;
const PanelHeader: React.ComponentType<PanelHeaderProps> = _PanelHeader;
const Tabs: React.ComponentType<TabsProps> = _Tabs;
const Text: React.ComponentType<LooseProps> = _Text;

// FRA-67: local types for the GET /api/content/v1/items payload. Shaped by
// shapeContentItem() in server/index.js plus the list extras (status,
// external_id, source, batch_id, report_count). Canonical ownership of the
// content-item shape belongs to a later ticket (see "Notes for FRA-68").
type MediaAsset = {
  kind: string;
  url: string;
  duration_seconds: number | null;
  transcript: string | null;
};
>>>>>>> 5ad6af1 (FRA-67: convention retrofit — type over interface, no as/any/unknown, real payload types)

type ContentListItem = {
  id: string;
  external_id: string | null;
  queue_kind: null;
  item_kind: 'content_item';
  level: string | null;
  type: string | null;
  title: string | null;
  prompt: string | null;
  instructions: string | null;
  context: string | null;
  media: MediaAsset[];
  evaluation_mode: string | null;
  choices?: ChoicesInput;
  tokens?: string[];
  rubric?: string | null;
  expected_points?: string[];
  follow_up_questions?: string[];
  expected?: string | null;
  status: string;
  source: string | null;
  batch_id: string | null;
  report_count: number;
};

type CanonicalListProps = {
  type: string;
  section: string;
  token?: string | null;
};

type ContentProps = {
  token?: string | null;
};

const LIBRARY_TABS = [
  { id: 'writing', label: 'Writing', icon: PenLine },
  { id: 'speaking', label: 'Speaking', icon: Mic },
  { id: 'vocabulary', label: 'Vocabulary', icon: Library },
];

function CanonicalList({ type, section, token }: CanonicalListProps) {
  const { data, loading, error } = useApiResource(
    `/api/content/v1/items?type=${type}&level=${section}&limit=20`,
    token
  );
  const items: ContentListItem[] = data?.items || [];

  if (loading) return <LoadingSpinner label={`Loading ${humanize(type)}…`} />;
  if (error) return <ErrorMessage message={error} />;
  if (!items.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title={`No published ${humanize(type)} yet`}
        text="Items appear here once reviewed and published. Check back soon."
      />
    );
  }

  return (
    <Box className="stack">
      {items.map((item) => (
        <ExerciseCard
          key={item.id}
          entry={{ ...item, item_kind: 'content_item' }}
          token={token}
        />
      ))}
    </Box>
  );
}

export function Content({ token }: ContentProps) {
  const [selectedSection, setSelectedSection] = React.useState('A1');
  const [libraryTab, setLibraryTab] = React.useState('vocabulary');

  return (
    <Box as="section" className="map-only-page">
      <ConceptRoadmap level={selectedSection} token={token} onSelectSection={setSelectedSection} />
      <LevelGuide section={selectedSection} />
      <Panel>
        <PanelHeader eyebrow="Study library" title={`More ${selectedSection} content`} />
        <Tabs variant="library" options={LIBRARY_TABS} value={libraryTab} onChange={setLibraryTab} />
      </Panel>
      {libraryTab === 'writing' && <CanonicalList type="writing_prompt" section={selectedSection} token={token} />}
      {libraryTab === 'speaking' && <CanonicalList type="speaking_prompt" section={selectedSection} token={token} />}
      {libraryTab === 'vocabulary' && <TopicTracks section={selectedSection} />}
    </Box>
  );
}
