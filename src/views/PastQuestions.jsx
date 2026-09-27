import React from 'react';
import { FileQuestion } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { normalizeChoices } from '../api/client.js';
import { ExerciseCard } from '../components/exercises/ExerciseCard.jsx';
import { EmptyState, RecordCount } from '../components/ui.jsx';

const SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILLS = ['all', 'reading', 'listening', 'language structures'];
const PAGE_SIZE = 12;

function toEntry(question, section) {
  const skill = (question.skill || 'reading').toLowerCase();
  return {
    item_kind: 'exam_question',
    id: question.id,
    type: skill === 'listening' ? 'listening' : skill === 'language structures' ? 'grammar_focus' : 'reading',
    level: section,
    skill,
    prompt: question.prompt,
    context: question.context,
    choices: normalizeChoices(question.choices),
  };
}

export function PastQuestions({ token }) {
  const [section, setSection] = React.useState('A1');
  const [skill, setSkill] = React.useState('all');
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  const { data, loading, error } = useApiResource(`/api/exam/questions?section=${section}`, token);
  const all = data?.questions || [];
  const filtered = skill === 'all' ? all : all.filter((q) => (q.skill || 'reading').toLowerCase() === skill);
  const shown = filtered.slice(0, visible);

  React.useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [section, skill]);

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">Exam bank</p>
            <h2>Past questions</h2>
          </div>
          <FileQuestion size={20} aria-hidden="true" />
        </div>
        <div className="section-tabs">
          {SECTIONS.map((s) => (
            <button key={s} className={`section-tab ${section === s ? 'active' : ''}`} onClick={() => setSection(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="tab-row">
          {SKILLS.map((s) => (
            <button key={s} className={`section-tab ${skill === s ? 'active' : ''}`} onClick={() => setSkill(s)}>
              {s === 'all' ? 'All skills' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <RecordCount count={filtered.length} label="questions" />
      </div>

      {loading && <p className="muted">Loading questions…</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && !filtered.length && (
        <EmptyState
          icon={FileQuestion}
          title="No questions yet"
          text={`Nothing in the bank for ${section} ${skill === 'all' ? '' : `· ${skill}`} — try another skill or level.`}
        />
      )}

      {!loading && !error && shown.map((q) => (
        <ExerciseCard key={q.id} entry={toEntry(q, section)} token={token} />
      ))}

      {!loading && !error && visible < filtered.length && (
        <button className="primary-button" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
          Show more
        </button>
      )}
    </div>
  );
}
