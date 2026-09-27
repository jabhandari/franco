import React from 'react';
import { Database } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import { normalizeChoices } from '../api/client.js';
import { EmptyState } from '../components/ui.jsx';

const SECTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SKILLS = ['all', 'reading', 'listening', 'language structures'];
const PAGE_SIZE = 12;

// Restored original exam archive display: the collapsible "Exam practice"
// module with the reading-passage card, correct/incorrect states, and retry.
// Skill tabs are new (the original was reading-only).

function ExamQuestionCard({ question, selected, onSelect, onRetry }) {
  const choices = React.useMemo(() => normalizeChoices(question.choices ?? question.choices_json), [question.choices, question.choices_json]);
  const correct = question.answer ? String(question.answer).trim().toLowerCase() : null;
  const selectedChoice = choices.find((choice) => choice.key === selected || choice.text === selected);
  const isCorrect = Boolean(selected && correct && (String(selected).trim().toLowerCase() === correct || selectedChoice?.key?.toLowerCase() === correct));
  const prompt = String(question.prompt || '').trim();
  let passage = String(question.context || '').trim();
  if (passage && prompt && passage.toLowerCase().startsWith(prompt.toLowerCase())) passage = passage.slice(prompt.length).trim();
  return (
    <article className={`exercise-preview mcq-card ${selected && correct ? (isCorrect ? 'answered-correct' : 'answered-wrong') : ''}`}>
      <span>{question.exam_name} - {question.skill}</span>
      {passage && passage.toLowerCase() !== prompt.toLowerCase() && <div className="reading-passage"><strong>Read the passage</strong><p>{passage}</p></div>}
      <h2>{prompt}</h2>
      {choices.length > 0 && (
        <div className="mcq-options">
          {choices.map((choice) => (
            <button
              key={choice.key}
              className={selected === choice.key && correct ? (choice.key.toLowerCase() === correct ? 'correct' : 'incorrect') : ''}
              onClick={() => onSelect(choice.key)}
              disabled={Boolean(selected)}
            >
              {choice.key}. {choice.text}
            </button>
          ))}
        </div>
      )}
      {selected && correct && (
        <div className={`mcq-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
          <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
          <span>{isCorrect ? (question.explanation || 'Well done.') : `Correct answer: ${question.answer}`}</span>
          {!isCorrect && <button className="retry-button" onClick={onRetry}>Try again</button>}
        </div>
      )}
      {!correct && <small>{question.explanation}</small>}
    </article>
  );
}

function ExamQuestionList({ data }) {
  const [showAll, setShowAll] = React.useState(false);
  const [answers, setAnswers] = React.useState({});
  const visible = showAll ? data.questions : data.questions.slice(0, PAGE_SIZE);
  const reset = () => setAnswers({});
  React.useEffect(() => { setShowAll(false); setAnswers({}); }, [data.section]);
  return (
    <details className="content-module" open>
      <summary><span>Exam practice</span><small>{data.questions.length} questions</small></summary>
      <section className="panel">
        <div className="session-toolbar">
          <h2>{data.section} past questions</h2>
          <button className="reset-button" onClick={reset}>Reset all</button>
        </div>
        <p className="muted">{data.questions.length} questions loaded.</p>
      </section>
      <div className="exercise-list">
        {visible.map((question) => (
          <ExamQuestionCard
            key={question.id}
            question={question}
            selected={answers[question.id] || null}
            onSelect={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
            onRetry={() => setAnswers(({ [question.id]: _removed, ...rest }) => rest)}
          />
        ))}
      </div>
      {data.questions.length > PAGE_SIZE && (
        <button className="text-button module-action" onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer questions' : `Show all ${data.questions.length} questions`}
        </button>
      )}
    </details>
  );
}

export function PastQuestions({ token }) {
  const [section, setSection] = React.useState('A1');
  const [skill, setSkill] = React.useState('all');

  const { data, loading, error } = useApiResource(`/api/exam/questions?section=${section}`, token);
  const all = data?.questions || [];
  const filtered = skill === 'all' ? all : all.filter((q) => (q.skill || 'reading').toLowerCase() === skill);
  const skillLabel = skill === 'all' ? 'All skills' : skill[0].toUpperCase() + skill.slice(1);

  return (
    <section className="page-stack">
      <p className="eyebrow">Exam archive</p>
      <h1 className="page-title">Past questions</h1>
      <p className="lede">Real exam-format questions from the archive. Pick an answer to check yourself — retry any you miss.</p>
      <div className="section-tabs" role="group" aria-label="Choose a level">
        {SECTIONS.map((s) => (
          <button key={s} className={section === s ? 'selected' : ''} onClick={() => setSection(s)}>
            <strong>{s}</strong>
          </button>
        ))}
      </div>
      <div className="section-tabs compact" role="group" aria-label="Choose a skill">
        {SKILLS.map((s) => (
          <button key={s} className={skill === s ? 'selected' : ''} onClick={() => setSkill(s)}>
            {s === 'all' ? 'All skills' : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {loading && <EmptyState icon={Database} title="Loading past questions" text="Fetching the exam archive." />}
      {error && <EmptyState icon={Database} title="Past questions fetch failed" text={error} />}
      {!loading && !error && (
        <ExamQuestionList data={{ questions: filtered, section: `${section} · ${skillLabel}` }} />
      )}
    </section>
  );
}
