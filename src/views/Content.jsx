import React from 'react';
import { BookOpen, PenLine, Mic, Library } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard.jsx';
import { ConceptRoadmap, LevelGuide, TopicTracks } from '../components/concepts.jsx';
import { EmptyState } from '../components/ui.jsx';

const SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
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

  if (loading) return <p className="muted">Loading {type.replace(/_/g, ' ')}…</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!items.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title={`No published ${type.replace(/_/g, ' ')} yet`}
        text="Items appear here once reviewed and published. Check back soon."
      />
    );
  }

  return (
    <div className="stack">
      {items.map((item) => (
        <ExerciseCard
          key={item.id}
          entry={{ ...item, item_kind: 'content_item' }}
          token={token}
        />
      ))}
    </div>
  );
}

export function Content({ token }) {
  const [selectedSection, setSelectedSection] = React.useState('A1');
  const [libraryTab, setLibraryTab] = React.useState('vocabulary');

  return (
    <section className="map-only-page">
      <ConceptRoadmap level={selectedSection} token={token} onSelectSection={setSelectedSection} />
      <LevelGuide section={selectedSection} />
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Study library</p>
            <h2>More {selectedSection} content</h2>
          </div>
        </div>
        <div className="tab-row">
          {LIBRARY_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`section-tab ${libraryTab === id ? 'active' : ''}`}
              onClick={() => setLibraryTab(id)}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </section>
      {libraryTab === 'writing' && <CanonicalList type="writing_prompt" section={selectedSection} token={token} />}
      {libraryTab === 'speaking' && <CanonicalList type="speaking_prompt" section={selectedSection} token={token} />}
      {libraryTab === 'vocabulary' && <TopicTracks section={selectedSection} />}
    </section>
  );
}
