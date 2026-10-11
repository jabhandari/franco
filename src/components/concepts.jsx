import React from 'react';
import { Database, Search, X } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { safeText, padNumber } from '../presenters/format.presenter.js';
import { CEFR_LEVELS, formatLevelWithClb } from '../presenters/levels.presenter.js';
import { describeWord } from '../presenters/words.presenter.js';
import { Badge, Box, EmptyState, ErrorMessage, Modal, Panel, Tabs, Text, TextInput } from './ui';

// Restored original roadmap display: the interactive concept tree with a
// spine, SVG connectors, numbered nodes, and a click-to-open lesson modal.
// Data now comes from /api/content/v1/concepts (DB-backed) instead of the
// hardcoded frontend file, and edges are derived from prerequisite slugs —
// never from hardcoded array indices. Node order follows the curated seed
// order (list_order), which the hand-tuned roadmap-node-N grid positions
// were designed around.

// Keep the LEVELS export working for any importer; the list itself lives in
// src/presenters/levels.presenter.js (single source of truth).
export const LEVELS = CEFR_LEVELS;

export const levelGuides = {
  A1: { label: 'Breakthrough', goal: 'Handle familiar words and simple everyday phrases.', focus: 'Greetings, identity, numbers, time, articles, and present-tense verbs.', read: 'Short notices, messages, menus, and simple personal descriptions.' },
  A2: { label: 'Waystage', goal: 'Understand the main point in predictable everyday situations.', focus: 'Routine tasks, past events, descriptions, directions, and common connectors.', read: 'Short emails, schedules, advertisements, and straightforward stories.' },
  B1: { label: 'Threshold', goal: 'Follow the essential meaning of clear speech and texts on familiar topics.', focus: 'Opinions, experiences, explanations, narrative tenses, and paragraph structure.', read: 'Articles, interviews, personal accounts, and practical workplace texts.' },
  B2: { label: 'Vantage', goal: 'Understand detailed arguments and communicate with growing precision.', focus: 'Nuance, register, cohesion, complex grammar, and topic-specific vocabulary.', read: 'Longer articles, reports, editorials, and interviews with implicit meaning.' },
  C1: { label: 'Effective proficiency', goal: 'Use French flexibly and effectively for social, academic, and professional purposes.', focus: 'Implicit meaning, stylistic control, complex argumentation, and precise vocabulary.', read: 'Long demanding texts, literature, and specialised articles.' },
  C2: { label: 'Mastery', goal: 'Understand virtually everything with ease and express yourself with precision.', focus: 'Fine shades of meaning, idiomatic control, and effortless adaptation to context.', read: 'Anything: abstract, literary, and technically dense material.' },
};

export function LevelGuide({ section }) {
  const guide = levelGuides[section];
  if (!guide) return null;
  return (
    <Box as="section" className="level-guide panel">
      <Box><Text as="span" variant="eyebrow">{formatLevelWithClb(section)} · {guide.label}</Text><Text as="h2">{guide.goal}</Text></Box>
      <Box className="guide-columns"><Box><Text as="strong">Focus</Text><Text>{guide.focus}</Text></Box><Box><Text as="strong">Reading practice</Text><Text>{guide.read}</Text></Box></Box>
      <Text as="small">Level descriptors adapted from the <Box as="a" href="https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors" target="_blank" rel="noreferrer">Council of Europe CEFR descriptors</Box>.</Text>
    </Box>
  );
}

// Adapt an API concept to the node shape the roadmap components render.
function toNode(concept) {
  const meta = concept.metadata || {};
  return {
    id: safeText(concept.slug),
    title: safeText(concept.title),
    category: safeText(concept.concept_type),
    level: safeText(concept.level_code),
    shortDescription: safeText(concept.description),
    theory: meta.theory || [],
    vocabulary: meta.vocabulary || [],
    examples: meta.examples || [],
    sources: meta.sources || [],
    stub: Boolean(meta.stub),
  };
}

// Nodes for one level in curated seed order; edges derived from the
// prerequisite DAG (slug -> index pairs).
// Canonical A1 teaching order (matches scripts/seed-concepts.mjs). Used as the
// roadmap fallback when the server has no list_order yet (pre-reseed rows),
// so the hand-tuned node positions never show a scrambled map.
const CANONICAL_ORDER = [
  'basic-sentence-structure',
  'subject-pronouns',
  'noun-gender',
  'definite-articles',
  'indefinite-articles',
  'singular-plural',
  'what-is-conjugation',
  'present-tense',
  'regular-er-verbs',
  'etre',
  'avoir',
  'aller',
  'adjective-agreement',
  'negation',
  'asking-questions',
];
const canonicalIndex = new Map(CANONICAL_ORDER.map((slug, index) => [slug, index]));

function levelNodes(concepts, level) {
  const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;
  const raw = concepts
    .filter((concept) => concept.level_code === level)
    .sort((a, b) => {
      const orderA = a.list_order ?? canonicalIndex.get(a.slug) ?? FALLBACK_ORDER;
      const orderB = b.list_order ?? canonicalIndex.get(b.slug) ?? FALLBACK_ORDER;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title, 'fr');
    });
  const nodes = raw.map(toNode);
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const edges = [];
  for (const concept of raw) {
    for (const prereq of concept.prerequisites || []) {
      if (index.has(prereq) && index.has(concept.slug)) {
        edges.push([index.get(prereq), index.get(concept.slug)]);
      }
    }
  }
  return { nodes, edges };
}

export function RoadmapConnectors({ section, edges }) {
  const [shape, setShape] = React.useState({ width: 0, height: 0, paths: [] });
  React.useLayoutEffect(() => {
    const update = () => {
      const canvas = document.querySelector(`.roadmap-${section.toLowerCase()}`);
      if (!canvas) return;
      const cards = [...canvas.querySelectorAll('.roadmap-node')];
      const base = canvas.getBoundingClientRect();
      const points = cards.map((card) => {
        const r = card.getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, top: r.top - base.top, bottom: r.bottom - base.top };
      });
      const paths = edges
        .filter(([a, b]) => points[a] && points[b])
        .map(([a, b]) => {
          const from = points[a];
          const to = points[b];
          const mid = from.bottom + (to.top - from.bottom) * 0.5;
          return `M ${from.x} ${from.bottom} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.top}`;
        });
      setShape({ width: base.width, height: base.height, paths });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [section, edges]);
  if (!shape.width) return null;
  return (
    <Box as="svg" className="roadmap-connectors" viewBox={`0 0 ${shape.width} ${shape.height}`} preserveAspectRatio="none" aria-hidden="true">
      <Box as="path" d={shape.paths.join(' ')} />
    </Box>
  );
}

export function ConceptMap({ section, nodes, edges, activeConceptId, onSelectConcept, onSelectSection }) {
  const active = nodes.find((node) => node.id === activeConceptId);
  return (
    <Box as="section" className={`concept-map panel ${active ? 'has-modal' : ''}`}>
      <Box className="roadmap-heading">
        <Tabs
          variant="roadmap"
          options={LEVELS.map((level) => ({ id: level, label: level }))}
          value={section}
          onChange={onSelectSection}
        />
        <Badge variant="roadmap">{nodes.length} concepts</Badge>
      </Box>
      <Box className={`roadmap-canvas roadmap-${section.toLowerCase()}`}>
        <Box className="roadmap-spine" />
        <RoadmapConnectors section={section} edges={edges} />
        {nodes.map((node, index) => (
          <Box
            as="button"
            className={`roadmap-node roadmap-node-${index + 1} ${activeConceptId === node.id ? 'active' : ''}`}
            key={node.id}
            onClick={() => onSelectConcept(activeConceptId === node.id ? null : node.id)}
          >
            <Text as="span">{padNumber(index + 1)}</Text>
            <Text as="strong">{node.title}</Text>
            <Text as="small">{node.category}</Text>
            <Text as="i" />
          </Box>
        ))}
      </Box>
      {active && (
        <Modal closeLabel="Close lesson" onClose={() => onSelectConcept(null)}>
          <ConceptDetail concept={active} />
        </Modal>
      )}
    </Box>
  );
}

export function RoadmapTable({ section, nodes, onSelectSection, activeConceptId, onSelectConcept }) {
  const active = nodes.find((node) => node.id === activeConceptId);
  return (
    <Box as="section" className="roadmap-table-page">
      <Tabs
        variant="roadmap"
        options={LEVELS.map((level) => ({ id: level, label: level }))}
        value={section}
        onChange={onSelectSection}
      />
      <Box className="roadmap-table">
        <Box className="roadmap-table-head"><Text as="span">Concept</Text><Text as="span">Area</Text><Text as="span">What you will learn</Text></Box>
        {nodes.map((node, index) => (
          <Box
            as="button"
            type="button"
            className={`roadmap-table-row${activeConceptId === node.id ? ' active' : ''}`}
            key={node.id}
            aria-expanded={activeConceptId === node.id}
            onClick={() => onSelectConcept(activeConceptId === node.id ? null : node.id)}
          >
            <Text as="span"><Text as="b">{padNumber(index + 1)}</Text>{node.title}</Text>
            <Text as="small">{node.category}</Text>
            <Text>{node.shortDescription}</Text>
          </Box>
        ))}
      </Box>
      {active && (
        <Modal closeLabel="Close lesson" onClose={() => onSelectConcept(null)}>
          <ConceptDetail concept={active} />
        </Modal>
      )}
    </Box>
  );
}

export function ConceptDetail({ concept }) {
  if (!concept) return null;
  return (
    <Box as="article" className="concept-detail">
      <Box>
        <Text as="span" variant="eyebrow">{concept.category} · {concept.level}</Text>
        <Text as="h2">{safeText(concept.title)}</Text>
        <Text className="concept-subtitle">{concept.shortDescription}</Text>
        {concept.stub && <Text variant="muted" size="sm">Full lesson content for this concept is still being authored.</Text>}
      </Box>
      <Box className="theory-blocks">
        {concept.theory.map((block, index) => block[0] === 'table' ? (
          <Box className="theory-table" key={index}>
            {block.slice(1).map((cell, cellIndex) => <Text as="span" key={cellIndex}>{safeText(cell)}</Text>)}
          </Box>
        ) : (
          <Box className={`theory-card ${block[0]}`} key={index}>
            <Text as="strong">{block[0] === 'idea' ? 'The idea' : block[0] === 'rule' ? safeText(block[1]) : block[0] === 'tip' ? 'Tip' : 'Example'}</Text>
            <Text>{safeText(block[0] === 'rule' ? block[2] : block[0] === 'example' ? block[2] : block[1])}</Text>
          </Box>
        ))}
      </Box>
      {concept.vocabulary.length > 0 && (
        <Box className="related-vocab">
          <Text as="strong">Vocabulary</Text>
          <Box>{concept.vocabulary.map((word, index) => <Text as="span" key={index}>{safeText(word)}</Text>)}</Box>
        </Box>
      )}
      {concept.examples.length > 0 && (
        <Box className="related-examples">
          <Text as="strong">Examples</Text>
          {concept.examples.map(([french, english], index) => (
            <Text key={index}><Text as="strong">{safeText(french)}</Text>{safeText(english) ? <Text as="span"> — {safeText(english)}</Text> : null}</Text>
          ))}
        </Box>
      )}
      {concept.sources.length > 0 && (
        <Box className="concept-footer">
          <Text as="small">Further reading: {concept.sources.map(([label, url]) => <Box as="a" href={url} target="_blank" rel="noreferrer" key={url}>{label}</Box>)}</Text>
        </Box>
      )}
    </Box>
  );
}

// Fetches canonical concepts once and renders the roadmap for a level,
// with the original roadmap/table view toggle.
export function ConceptRoadmap({ level, token, onSelectSection }) {
  const { data, loading, error } = useApiResource('/api/content/v1/concepts', token);
  const [activeConceptId, setActiveConceptId] = React.useState(null);
  const [layoutMode, setLayoutMode] = React.useState('roadmap');
  React.useEffect(() => setActiveConceptId(null), [level]);
  const concepts = data?.concepts || [];
  const { nodes, edges } = React.useMemo(() => levelNodes(concepts, level), [concepts, level]);

  if (loading) return <EmptyState icon={Database} title="Loading curriculum" text="Pulling up the lesson roadmap." />;
  if (error) return <EmptyState icon={Database} title="Couldn't load the curriculum" text={error} />;

  return (
    <>
      <Box className="map-toolbar">
        <Text as="span">{layoutMode === 'roadmap' ? 'Roadmap view' : 'Table view'}</Text>
        <Box as="button" onClick={() => setLayoutMode((mode) => mode === 'roadmap' ? 'table' : 'roadmap')}>
          {layoutMode === 'roadmap' ? 'Show table' : 'Show roadmap'}
        </Box>
      </Box>
      {layoutMode === 'roadmap' ? (
        <ConceptMap
          section={level}
          nodes={nodes}
          edges={edges}
          activeConceptId={activeConceptId}
          onSelectConcept={setActiveConceptId}
          onSelectSection={onSelectSection}
        />
      ) : (
        <RoadmapTable
          section={level}
          nodes={nodes}
          onSelectSection={onSelectSection}
          activeConceptId={activeConceptId}
          onSelectConcept={setActiveConceptId}
        />
      )}
    </>
  );
}

// describeWord + POS_LABELS moved to src/presenters/words.presenter.js (FRA-21).

// One category group inside the learning tracks. The vocabulary group gets a
// search button in its top-right corner; expanding it filters the group's
// words live as the learner types.
function TopicGroup({ category, topics }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const searchable = category === 'vocabulary';

  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };

  const term = query.trim().toLowerCase();
  const visible = !searchable || !term
    ? topics
    : topics.filter((topic) => {
        const haystack = `${safeText(topic.title)} ${describeWord(topic.item)}`.toLowerCase();
        return haystack.includes(term);
      });

  return (
    <Box className={`topic-group${topics.length > 8 ? ' topic-group--wide' : ''}`}>
      <Box className="topic-group-head">
        <Text as="h3">{safeText(category)}</Text>
        {searchable && (
          <Box className="topic-search">
            {searchOpen ? (
              <>
                <TextInput
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') closeSearch();
                  }}
                  placeholder="Search words"
                  aria-label="Search vocabulary words"
                />
                <Box as="button" type="button" className="topic-search-btn" onClick={closeSearch} aria-label="Close search" title="Close search">
                  <X size={15} aria-hidden="true" />
                </Box>
              </>
            ) : (
              <Box as="button" type="button" className="topic-search-btn" onClick={() => setSearchOpen(true)} aria-label="Search vocabulary words" title="Search">
                <Search size={15} aria-hidden="true" />
              </Box>
            )}
          </Box>
        )}
      </Box>
      {visible.length === 0 ? (
        <Text variant="muted">No words match your search.</Text>
      ) : (
        <Box className="topic-words">
          {visible.map((topic) => (
            <Box className="topic-word" key={topic.id}>
              <Text as="strong">{safeText(topic.title)}</Text>
              <Text as="span">{describeWord(topic.item)}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// Vocabulary topics for a CEFR section, backed by the server.
export function TopicTracks({ section }) {
  const { data, loading, error } = useApiResource(`/api/content/topics?section=${section}`);
  const topics = data?.topics || [];
  const categories = [...new Set(topics.map((topic) => topic.category))];

  if (loading) return <Text variant="muted">Loading topics…</Text>;
  if (error) return <ErrorMessage message={error} />;
  if (!topics.length) return <Text variant="muted">No vocabulary topics yet for {section}.</Text>;

  return (
    <Panel layout="grid">
      <Text as="h2">{section} learning tracks</Text>
      <Text variant="muted">Vocabulary, spelling, and practical topics from the {section} study plan.</Text>
      <Box className="topic-grid">
        {categories.map((category) => (
          <TopicGroup
            key={category}
            category={category}
            topics={topics.filter((topic) => topic.category === category)}
          />
        ))}
      </Box>
    </Panel>
  );
}
