import React from 'react';
import { BookOpen, PenLine, Mic, Library } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard';
import { ConceptRoadmap, LevelGuide, TopicTracks } from '../components/concepts';
import { CEFR_LEVELS as SECTIONS } from '../presenters/levels.presenter.js';
import { humanize } from '../presenters/format.presenter.js';
import type { ContentItemChoice } from '../api/client.js';
import {
  Box,
  EmptyState,
  ErrorMessage,
  LoadingSpinner,
  Panel,
  PanelHeader,
  Tabs,
} from '../components/ui';

// FRA-67: local types for the GET /api/content/v1/items payload. Shaped by
// shapeContentItem() in server/index.js plus the list extras (status,
// external_id, source, batch_id, report_count). Canonical ownership of the
// content-item shape belongs to a later ticket (see "Notes for FRA-68").
// Media kind is narrowed to the renderer's union: the ingest schema
// restricts authored media to these four kinds (see ContentMediaAsset in
// src/api/client.ts); this is what ExerciseCard's ExerciseItem expects.
type MediaAsset = {
  kind: 'audio' | 'image' | 'video' | 'document';
  url: string;
  duration_seconds: number | null;
  transcript: string | null;
};

// Choices as forwarded verbatim by shapeContentItem() (server/index.js):
// the stored response_json.choices — id-bearing {id,text} pairs for
// published multiple-choice items. Canonical type imported from the API
// client (never redefined).
type ChoicesInput = ContentItemChoice[] | null | undefined;

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
  const { data, loading, error } = useApiResource<{ items: ContentListItem[] }>(
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
