import React from 'react';
import { BookOpen, PenLine, Mic, Library } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard.jsx';
import { ConceptRoadmap, LevelGuide, TopicTracks } from '../components/concepts.jsx';
import { CEFR_LEVELS as SECTIONS } from '../presenters/levels.js';
import { humanize } from '../presenters/format.js';
import { Box, EmptyState, ErrorMessage, Panel, PanelHeader, Tabs, Text } from '../components/ui';

const LIBRARY_TABS = [
  { id: 'writing', label: 'Writing', icon: PenLine },
  { id: 'speaking', label: 'Speaking', icon: Mic },
  { id: 'vocabulary', label: 'Vocabulary', icon: Library },
];

function CanonicalList({ type, section, token }) {
  const { data, loading, error } = useApiResource(
    `/api/content/v1/items?type=${type}&level=${section}&limit=20`,
    token
  );
  const items = data?.items || [];

  if (loading) return <Text variant="muted">Loading {humanize(type)}…</Text>;
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

export function Content({ token }) {
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
