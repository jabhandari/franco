import React from 'react';
import { Database, Search, X } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { safeText } from '../api/client.js';
import { Badge, EmptyState, ErrorMessage, Modal, Panel, Tabs, Text } from './ui';

// Restored original roadmap display: the interactive concept tree with a
// spine, SVG connectors, numbered nodes, and a click-to-open lesson modal.
// Data now comes from /api/content/v1/concepts (DB-backed) instead of the
// hardcoded frontend file, and edges are derived from prerequisite slugs —
// never from hardcoded array indices. Node order follows the curated seed
// order (list_order), which the hand-tuned roadmap-node-N grid positions
// were designed around.

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

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
    <section className="level-guide panel">
      <div><span className="eyebrow">{section} · {guide.label}</span><h2>{guide.goal}</h2></div>
      <div className="guide-columns"><div><strong>Focus</strong><p>{guide.focus}</p></div><div><strong>Reading practice</strong><p>{guide.read}</p></div></div>
      <small>Level descriptors adapted from the <a href="https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors" target="_blank" rel="noreferrer">Council of Europe CEFR descriptors</a>.</small>
    </section>
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
    <svg className="roadmap-connectors" viewBox={`0 0 ${shape.width} ${shape.height}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={shape.paths.join(' ')} />
    </svg>
  );
}

export function ConceptMap({ section, nodes, edges, activeConceptId, onSelectConcept, onSelectSection }) {
  const active = nodes.find((node) => node.id === activeConceptId);
  return (
    <section className={`concept-map panel ${active ? 'has-modal' : ''}`}>
      <div className="roadmap-heading">
        <Tabs
          variant="roadmap"
          options={LEVELS.map((level) => ({ id: level, label: level }))}
          value={section}
          onChange={onSelectSection}
        />
        <Badge variant="roadmap">{nodes.length} concepts</Badge>
      </div>
      <div className={`roadmap-canvas roadmap-${section.toLowerCase()}`}>
        <div className="roadmap-spine" />
        <RoadmapConnectors section={section} edges={edges} />
        {nodes.map((node, index) => (
          <button
            className={`roadmap-node roadmap-node-${index + 1} ${activeConceptId === node.id ? 'active' : ''}`}
            key={node.id}
            onClick={() => onSelectConcept(activeConceptId === node.id ? null : node.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{node.title}</strong>
            <small>{node.category}</small>
            <i />
          </button>
        ))}
      </div>
      {active && (
        <Modal closeLabel="Close lesson" onClose={() => onSelectConcept(null)}>
          <ConceptDetail concept={active} />
        </Modal>
      )}
    </section>
  );
}

export function RoadmapTable({ section, nodes, onSelectSection, activeConceptId, onSelectConcept }) {
  const active = nodes.find((node) => node.id === activeConceptId);
  return (
    <section className="roadmap-table-page">
      <Tabs
        variant="roadmap"
        options={LEVELS.map((level) => ({ id: level, label: level }))}
        value={section}
        onChange={onSelectSection}
      />
      <div className="roadmap-table">
        <div className="roadmap-table-head"><span>Concept</span><span>Area</span><span>What you will learn</span></div>
        {nodes.map((node, index) => (
          <button
            type="button"
            className={`roadmap-table-row${activeConceptId === node.id ? ' active' : ''}`}
            key={node.id}
            aria-expanded={activeConceptId === node.id}
            onClick={() => onSelectConcept(activeConceptId === node.id ? null : node.id)}
          >
            <span><b>{String(index + 1).padStart(2, '0')}</b>{node.title}</span>
            <small>{node.category}</small>
            <p>{node.shortDescription}</p>
          </button>
        ))}
      </div>
      {active && (
        <Modal closeLabel="Close lesson" onClose={() => onSelectConcept(null)}>
          <ConceptDetail concept={active} />
        </Modal>
      )}
    </section>
  );
}

export function ConceptDetail({ concept }) {
  if (!concept) return null;
  return (
    <article className="concept-detail">
      <div>
        <span className="eyebrow">{concept.category} · {concept.level}</span>
        <h2>{safeText(concept.title)}</h2>
        <p className="concept-subtitle">{concept.shortDescription}</p>
        {concept.stub && <Text variant="muted" size="sm">Full lesson content for this concept is still being authored.</Text>}
      </div>
      <div className="theory-blocks">
        {concept.theory.map((block, index) => block[0] === 'table' ? (
          <div className="theory-table" key={index}>
            {block.slice(1).map((cell, cellIndex) => <span key={cellIndex}>{safeText(cell)}</span>)}
          </div>
        ) : (
          <div className={`theory-card ${block[0]}`} key={index}>
            <strong>{block[0] === 'idea' ? 'The idea' : block[0] === 'rule' ? safeText(block[1]) : block[0] === 'tip' ? 'Tip' : 'Example'}</strong>
            <p>{safeText(block[0] === 'rule' ? block[2] : block[0] === 'example' ? block[2] : block[1])}</p>
          </div>
        ))}
      </div>
      {concept.vocabulary.length > 0 && (
        <div className="related-vocab">
          <strong>Vocabulary</strong>
          <div>{concept.vocabulary.map((word, index) => <span key={index}>{safeText(word)}</span>)}</div>
        </div>
      )}
      {concept.examples.length > 0 && (
        <div className="related-examples">
          <strong>Examples</strong>
          {concept.examples.map(([french, english], index) => (
            <p key={index}><strong>{safeText(french)}</strong>{safeText(english) ? <span> — {safeText(english)}</span> : null}</p>
          ))}
        </div>
      )}
      {concept.sources.length > 0 && (
        <div className="concept-footer">
          <small>Further reading: {concept.sources.map(([label, url]) => <a href={url} target="_blank" rel="noreferrer" key={url}>{label}</a>)}</small>
        </div>
      )}
    </article>
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
      <div className="map-toolbar">
        <span>{layoutMode === 'roadmap' ? 'Roadmap view' : 'Table view'}</span>
        <button onClick={() => setLayoutMode((mode) => mode === 'roadmap' ? 'table' : 'roadmap')}>
          {layoutMode === 'roadmap' ? 'Show table' : 'Show roadmap'}
        </button>
      </div>
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

// Learner-facing labels for Lexique part-of-speech codes stored in the
// vocabulary topic rows (e.g. {"lemma":"accord","pos":"NOM","gender":"m",...}).
const POS_LABELS = {
  NOM: 'noun', VER: 'verb', AUX: 'auxiliary verb', ADJ: 'adjective',
  ADV: 'adverb', PRE: 'preposition', PRO: 'pronoun', CON: 'conjunction',
  ART: 'article', DET: 'determiner', NUM: 'number',
  INT: 'interjection', ONO: 'interjection',
};

// Turn a vocabulary topic's item value into a short human-readable
// description. Vocabulary rows store Lexique metadata as a JSON string;
// render it as "noun · masculine · very common (#145)" instead of raw JSON.
// Plain-text topics (e.g. "le / la / l’ / les") render unchanged.
function describeWord(item) {
  if (typeof item !== 'string') return safeText(item);
  let parsed = null;
  try { parsed = JSON.parse(item); } catch { parsed = null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.pos) {
    return safeText(item);
  }
  const posKey = String(parsed.pos).split(':')[0].toUpperCase();
  const parts = [POS_LABELS[posKey] || posKey.toLowerCase()];
  if (parsed.gender === 'm') parts.push('masculine');
  if (parsed.gender === 'f') parts.push('feminine');
  if (parsed.number === 's') parts.push('singular');
  if (parsed.number === 'p') parts.push('plural');
  const rank = Number(parsed.freq_rank);
  if (Number.isFinite(rank) && rank > 0) {
    const bucket = rank <= 100 ? 'very common' : rank <= 1000 ? 'common' : 'less common';
    parts.push(`${bucket} (#${rank})`);
  }
  return parts.join(' · ');
}

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
    <div className={`topic-group${topics.length > 8 ? ' topic-group--wide' : ''}`}>
      <div className="topic-group-head">
        <h3>{safeText(category)}</h3>
        {searchable && (
          <div className="topic-search">
            {searchOpen ? (
              <>
                <input
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
                <button type="button" className="topic-search-btn" onClick={closeSearch} aria-label="Close search" title="Close search">
                  <X size={15} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button type="button" className="topic-search-btn" onClick={() => setSearchOpen(true)} aria-label="Search vocabulary words" title="Search">
                <Search size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
      {visible.length === 0 ? (
        <Text variant="muted">No words match your search.</Text>
      ) : (
        <div className="topic-words">
          {visible.map((topic) => (
            <div className="topic-word" key={topic.id}>
              <strong>{safeText(topic.title)}</strong>
              <span>{describeWord(topic.item)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
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
      <h2>{section} learning tracks</h2>
      <Text variant="muted">Vocabulary, spelling, and practical topics from the {section} study plan.</Text>
      <div className="topic-grid">
        {categories.map((category) => (
          <TopicGroup
            key={category}
            category={category}
            topics={topics.filter((topic) => topic.category === category)}
          />
        ))}
      </div>
    </Panel>
  );
}
