import React from 'react';
import { Award, BookOpen, CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { PanelHeading, RecordCount } from './ui.jsx';

// Concepts come from the server's canonical store (seeded from
// scripts/concept-data.mjs). Edges are derived from prerequisite data,
// never from hardcoded array indices.
function levelNodes(concepts, level) {
  const nodes = concepts.filter((concept) => concept.level_code === level);
  const index = new Map(nodes.map((node, i) => [node.slug, i]));
  const edges = [];
  for (const node of nodes) {
    for (const prereq of node.prerequisites || []) {
      if (index.has(prereq) && index.has(node.slug)) {
        edges.push([index.get(prereq), index.get(node.slug)]);
      }
    }
  }
  return { nodes, edges };
}

export function RoadmapConnectors({ nodes, edges }) {
  const rows = 3;
  const cols = Math.ceil(nodes.length / rows);
  const cardWidth = 220;
  const cardHeight = 110;
  const padding = 50;
  const position = (index) => {
    const row = index % rows;
    const col = Math.floor(index / rows);
    return { x: padding + col * (cardWidth + 60), y: padding + row * (cardHeight + 50) };
  };
  const width = Math.max(300, padding * 2 + (cols - 1) * (cardWidth + 60) + cardWidth);
  const height = padding * 2 + rows * cardHeight + (rows - 1) * 50;

  const pathFor = ([from, to]) => {
    const start = position(from);
    const end = position(to);
    const x1 = start.x + cardWidth / 2;
    const y1 = start.y;
    const x2 = end.x + cardWidth / 2;
    const y2 = end.y;
    const dx = Math.abs(x2 - x1);
    const curve = Math.min(60, dx / 2);
    const startDir = y2 > y1 ? 1 : -1;
    const endDir = y2 > y1 ? -1 : 1;
    return `M ${x1} ${y1} C ${x1} ${y1 + startDir * curve}, ${x2} ${y2 + endDir * curve}, ${x2} ${y2}`;
  };

  return (
    <svg className="roadmap-connectors" width={width} height={height} aria-hidden="true">
      <defs>
        <marker id="roadmap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
        </marker>
      </defs>
      {edges.map(([from, to]) => (
        <path key={`${from}-${to}`} d={pathFor([from, to])} className="roadmap-edge" markerEnd="url(#roadmap-arrow)" />
      ))}
      {nodes.map((node, index) => {
        const { x, y } = position(index);
        return <circle key={node.slug} cx={x + cardWidth / 2} cy={y} r="5" className="roadmap-anchor" />;
      })}
    </svg>
  );
}

export function ConceptMap({ concepts, level, selectedId, onSelect, completedIds = [] }) {
  const { nodes, edges } = levelNodes(concepts, level);

  return (
    <div className="concept-map-scroll">
      <div className="concept-map">
        <RoadmapConnectors nodes={nodes} edges={edges} />
        {nodes.map((concept) => {
          const completed = completedIds.includes(concept.slug);
          return (
            <button
              key={concept.slug}
              className={`concept-card ${selectedId === concept.slug ? 'selected' : ''} ${concept.metadata?.stub ? 'stub' : ''}`}
              onClick={() => onSelect(concept.slug === selectedId ? null : concept.slug)}
            >
              <div className="concept-icon">
                {completed ? <CheckCircle size={22} /> : <Circle size={22} />}
              </div>
              <h3>{concept.title}</h3>
              <p>{concept.description}</p>
              {concept.metadata?.stub && <span className="stub-badge">Stub</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RoadmapTable({ concepts, level, onSelect }) {
  const { nodes, edges } = levelNodes(concepts, level);
  const index = new Map(nodes.map((node, i) => [node.slug, i]));

  return (
    <div className="panel roadmap-table">
      <h2>{level} curriculum roadmap</h2>
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Concept</th>
            <th>Focus</th>
            <th>Prerequisites</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {nodes.map((concept, i) => (
            <tr key={concept.slug}>
              <td>{i + 1}</td>
              <td>
                <strong>{concept.title}</strong>
                {concept.metadata?.stub && <span className="stub-badge">Stub</span>}
              </td>
              <td>{concept.concept_type}</td>
              <td>{(concept.prerequisites || []).length ? concept.prerequisites.join(', ') : '—'}</td>
              <td>
                <button className="link-button" onClick={() => onSelect(concept.slug)}>
                  View <ChevronRight size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">{nodes.length} concepts · {edges.length} prerequisite links</p>
    </div>
  );
}

export function ConceptDetail({ concept, onClose }) {
  if (!concept) return null;
  const meta = concept.metadata || {};

  return (
    <section className="concept-detail panel">
      <div className="concept-detail-head">
        <div>
          <p className="eyebrow">{concept.level_code} · {concept.concept_type}</p>
          <h2>{concept.title}</h2>
          <p className="lede">{concept.description}</p>
          {meta.stub && <span className="stub-badge">Stub — full lesson not yet authored</span>}
        </div>
        <button className="retry-button" onClick={onClose}>Close</button>
      </div>

      {(meta.theory || []).map(([kind, text], index) => (
        <div key={index} className={`theory-block theory-${kind}`}>
          {kind === 'idea' && <Award size={16} />}
          {kind === 'tip' && <BookOpen size={16} />}
          <p>{text}</p>
        </div>
      ))}

      {(meta.vocabulary || []).length > 0 && (
        <div className="vocab-grid">
          <h3>Vocabulary</h3>
          <div className="vocab-cards">
            {meta.vocabulary.map((item) => (
              <div key={item.word} className="vocab-card">
                <strong>{item.word}</strong>
                <span>{item.meaning}</span>
                {item.note && <em>{item.note}</em>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(meta.examples || []).length > 0 && (
        <div>
          <h3>Examples</h3>
          <ul className="example-list">
            {meta.examples.map((example, index) => (
              <li key={index}>
                <strong>{example.french}</strong>
                <span>{example.english}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(meta.sources || []).length > 0 && (
        <p className="muted small">Sources: {meta.sources.join(', ')}</p>
      )}
    </section>
  );
}

// Fetches canonical concepts once and renders the roadmap for a level.
export function ConceptRoadmap({ level, token }) {
  const { data, loading, error } = useApiResource('/api/content/v1/concepts', token);
  const [selectedId, setSelectedId] = React.useState(null);
  const concepts = data?.concepts || [];
  const selected = concepts.find((c) => c.slug === selectedId) || null;

  return (
    <div>
      {loading && <p className="muted">Loading curriculum…</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && (
        <>
          <PanelHeading title={`${level} concept map`} />
          <ConceptMap concepts={concepts} level={level} selectedId={selectedId} onSelect={setSelectedId} />
          <ConceptDetail concept={selected} onClose={() => setSelectedId(null)} />
          <RoadmapTable concepts={concepts} level={level} onSelect={setSelectedId} />
        </>
      )}
    </div>
  );
}

// Vocabulary topics for a CEFR section, backed by the server.
export function TopicTracks({ section }) {
  const { data, loading, error } = useApiResource(`/api/content/topics?section=${section}`);
  const topics = data?.topics || [];

  if (loading) return <p className="muted">Loading topics…</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!topics.length) return <p className="muted">No vocabulary topics yet for {section}.</p>;

  return (
    <div className="panel">
      <PanelHeading title={`${section} vocabulary`} />
      <RecordCount count={topics.length} label="topics" />
      <div className="topic-list">
        {topics.map((topic) => (
          <div key={topic.id} className="topic-card">
            <h3>{topic.topic}</h3>
            <p className="muted">{topic.category} · {topic.cefr_section}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
