import React from 'react';
import { getErrorMessage, reportAttempt, shuffle } from '../../api/client.js';

// Tap-to-order sentence builder for word_order items.
export function WordOrder({ entry, token, onResult }) {
  const [bank, setBank] = React.useState(() => shuffle(entry.tokens || []));
  const [answer, setAnswer] = React.useState([]);
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());

  function take(index) {
    if (result) return;
    setBank((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      setAnswer((prevAnswer) => [...prevAnswer, moved]);
      return next;
    });
  }

  function giveBack(index) {
    if (result) return;
    setAnswer((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      setBank((prevBank) => [...prevBank, moved]);
      return next;
    });
  }

  async function submit() {
    if (result || !answer.length) return;
    try {
      const res = await reportAttempt(entry, answer, token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  function retry() {
    setBank(shuffle(entry.tokens || []));
    setAnswer([]);
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <article className={`exercise-preview mcq-card ${result && !result.error ? (result.correct ? 'answered-correct' : 'answered-wrong') : ''}`}>
      <span>{[entry.level, 'word order'].filter(Boolean).join(' · ')}</span>
      <h2>{entry.prompt}</h2>
      <p className="muted">Tap the words in order to build the sentence. Tap a placed word to remove it.</p>
      <div className="word-order-answer" aria-label="Your sentence">
        {answer.map((word, index) => (
          <button key={`a-${index}`} className="word-token placed" onClick={() => giveBack(index)} disabled={Boolean(result)}>
            {word}
          </button>
        ))}
        {!answer.length && <span className="muted">Your sentence appears here…</span>}
      </div>
      <div className="word-order-bank" aria-label="Word bank">
        {bank.map((word, index) => (
          <button key={`b-${index}-${word}`} className="word-token" onClick={() => take(index)} disabled={Boolean(result)}>
            {word}
          </button>
        ))}
      </div>
      {!result && (
        <button className="primary-button" onClick={submit} disabled={!answer.length}>
          Check answer
        </button>
      )}
      {result && !result.error && (
        <div className={`mcq-feedback ${result.correct ? 'correct' : 'incorrect'}`}>
          <strong>{result.correct ? 'Correct!' : 'Not quite.'}</strong>
          {!result.correct && result.reveal && <span>Correct order: {result.reveal}</span>}
          {!result.correct && (
            <button className="retry-button" onClick={retry}>Try again</button>
          )}
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </article>
  );
}
