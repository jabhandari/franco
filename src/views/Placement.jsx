import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { apiPost, shuffle } from '../api/client.js';
import { levelGuides } from '../components/concepts.jsx';

// Original 10-question placement quiz, A1 → B2 gradient. The resulting CEFR
// level is submitted to POST /api/me/placement and becomes the learner's
// current level for adaptive sessions.
const QUESTIONS = [
  { prompt: '___ livre est sur la table.', choices: [{ key: 'A', text: 'Le' }, { key: 'B', text: 'La' }, { key: 'C', text: 'Les' }, { key: 'D', text: 'Des' }], answer: 'A' },
  { prompt: '___ suis fatigué aujourd’hui.', choices: [{ key: 'A', text: 'Je' }, { key: 'B', text: 'Tu' }, { key: 'C', text: 'Il' }, { key: 'D', text: 'Nous' }], answer: 'A' },
  { prompt: 'Elle ___ à Paris.', choices: [{ key: 'A', text: 'habite' }, { key: 'B', text: 'habites' }, { key: 'C', text: 'habitent' }, { key: 'D', text: 'habiter' }], answer: 'A' },
  { prompt: 'Hier, nous ___ au cinéma.', choices: [{ key: 'A', text: 'allons' }, { key: 'B', text: 'sommes allés' }, { key: 'C', text: 'irons' }, { key: 'D', text: 'aller' }], answer: 'B' },
  { prompt: 'Je ne ___ pas.', choices: [{ key: 'A', text: 'comprends' }, { key: 'B', text: 'comprendre' }, { key: 'C', text: 'compris' }, { key: 'D', text: 'comprend' }], answer: 'A' },
  { prompt: 'C’est le livre ___ je t’ai parlé.', choices: [{ key: 'A', text: 'que' }, { key: 'B', text: 'qui' }, { key: 'C', text: 'dont' }, { key: 'D', text: 'où' }], answer: 'C' },
  { prompt: 'Si j’avais su, je ___ venu.', choices: [{ key: 'A', text: 'serais' }, { key: 'B', text: 'étais' }, { key: 'C', text: 'suis' }, { key: 'D', text: 'viendrais' }], answer: 'A' },
  { prompt: 'Il faut que tu ___ tes devoirs.', choices: [{ key: 'A', text: 'fais' }, { key: 'B', text: 'fasses' }, { key: 'C', text: 'faire' }, { key: 'D', text: 'fait' }], answer: 'B' },
  { prompt: 'Bien qu’il ___ tard, il a continué.', choices: [{ key: 'A', text: 'est' }, { key: 'B', text: 'soit' }, { key: 'C', text: 'était' }, { key: 'D', text: 'sera' }], answer: 'B' },
  { prompt: '___ d’efforts, il a réussi.', choices: [{ key: 'A', text: 'À force' }, { key: 'B', text: 'Par force' }, { key: 'C', text: 'Avec force' }, { key: 'D', text: 'En force' }], answer: 'A' },
];

function levelForScore(score) {
  if (score <= 3) return 'A1';
  if (score <= 5) return 'A2';
  if (score <= 7) return 'B1';
  return 'B2';
}

export function Placement({ token, onPlaced }) {
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState([]);
  const [options] = React.useState(() => QUESTIONS.map((q) => shuffle(q.choices)));
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState('');

  const question = QUESTIONS[index];

  async function choose(key) {
    if (result) return;
    const next = [...answers, key];
    setAnswers(next);
    if (next.length < QUESTIONS.length) {
      setIndex(index + 1);
      return;
    }
    const score = QUESTIONS.filter((q, i) => next[i] === q.answer).length;
    const level = levelForScore(score);
    try {
      const res = await apiPost('/api/me/placement', { level }, token);
      setResult({ score, level, placementStatus: res.placement_status });
      onPlaced?.();
    } catch (e) {
      setError(e.message);
    }
  }

  if (result) {
    const guide = levelGuides[result.level];
    return (
      <section className="page-stack">
        <p className="eyebrow">Placement complete</p>
        <h1 className="page-title">Your level: {result.level}{guide ? ` · ${guide.label}` : ''}</h1>
        <p className="lede">You scored {result.score} out of {QUESTIONS.length}. Your sessions will now target {result.level} content.</p>
        {guide && (
          <section className="level-guide panel">
            <div><span className="eyebrow">{result.level} · {guide.label}</span><h2>{guide.goal}</h2></div>
            <div className="guide-columns">
              <div><strong>What to focus on</strong><p>{guide.focus}</p></div>
              <div><strong>Reading practice</strong><p>{guide.read}</p></div>
            </div>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="page-stack">
      <p className="eyebrow">Placement</p>
      <h1 className="page-title">Find your starting level</h1>
      <p className="lede">Ten quick questions, A1 to B2. Question {index + 1} of {QUESTIONS.length}.</p>
      <article className="exercise-preview mcq-card">
        <span>placement</span>
        <h2>{question.prompt}</h2>
        <div className="mcq-options">
          {options[index].map((option) => (
            <button key={option.key} onClick={() => choose(option.key)}>
              {option.key}. {option.text}
            </button>
          ))}
        </div>
      </article>
      {error && <p className="error-message">{error}</p>}
      <p className="muted small"><ClipboardCheck size={14} aria-hidden="true" /> Your result sets your starting level — nothing is graded here.</p>
    </section>
  );
}
