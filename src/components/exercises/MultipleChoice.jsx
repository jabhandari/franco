import React from 'react';
import { getErrorMessage, reportAttempt, shuffle } from '../../api/client.js';

function typeLabel(entry) {
  return [entry.level, entry.skill || (entry.type || '').replace(/_/g, ' ')].filter(Boolean).join(' · ');
}

export function MultipleChoice({ entry, token, onResult }) {
  const [selected, setSelected] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [options] = React.useState(() => shuffle(entry.choices || []));
  const startRef = React.useRef(Date.now());

  async function choose(choice) {
    if (result) return;
    setSelected(choice.key);
    try {
      const res = await reportAttempt(entry, choice.key, token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  function retry() {
    setSelected(null);
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <article className={`exercise-preview mcq-card ${result && !result.error ? (result.correct ? 'answered-correct' : 'answered-wrong') : ''}`}>
      <span>{typeLabel(entry)}</span>
      {entry.context && (
        <div className="reading-passage">
          <strong>Read the passage</strong>
          <p>{entry.context}</p>
        </div>
      )}
      <h2>{entry.prompt}</h2>
      <div className="mcq-options">
        {options.map((option) => (
          <button
            key={option.key}
            className={selected === option.key ? (result && !result.error ? (result.correct ? 'correct' : 'incorrect') : '') : ''}
            onClick={() => choose(option)}
            disabled={Boolean(result)}
          >
            {option.key}. {option.text}
          </button>
        ))}
      </div>
      {result && !result.error && (
        <div className={`mcq-feedback ${result.correct ? 'correct' : 'incorrect'}`}>
          <strong>{result.correct ? 'Correct!' : 'Not quite.'}</strong>
          {!result.correct && result.reveal && <span>Correct answer: {result.reveal}</span>}
          {!result.correct && (
            <button className="retry-button" onClick={retry}>Try again</button>
          )}
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </article>
  );
}
