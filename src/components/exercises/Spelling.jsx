import React from 'react';
import { reportAttempt } from '../../api/client.js';

// Typed-answer renderer for spelling / cloze / free-text items, and dictation
// when an audioUrl is provided.
export function Spelling({ entry, token, audioUrl, onResult }) {
  const [value, setValue] = React.useState('');
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());
  const isDictation = Boolean(audioUrl);

  async function submit(event) {
    event?.preventDefault();
    if (result || !value.trim()) return;
    try {
      const res = await reportAttempt(entry, value, token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: error.message });
    }
  }

  function retry() {
    setValue('');
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <article className={`exercise-preview mcq-card ${result && !result.error ? (result.correct ? 'answered-correct' : 'answered-wrong') : ''}`}>
      <span>{entry.level} · {isDictation ? 'dictation' : (entry.type || 'spelling').replace(/_/g, ' ')}</span>
      {audioUrl && (
        <div className="audio-player">
          <audio controls src={audioUrl} preload="metadata" />
        </div>
      )}
      <h2>{entry.prompt}</h2>
      <form onSubmit={submit}>
        <textarea
          className="free-text-input"
          rows={isDictation ? 4 : 2}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={isDictation ? 'Type exactly what you hear…' : 'Type your answer…'}
          disabled={Boolean(result)}
        />
        {!result && (
          <button type="submit" className="primary-button" disabled={!value.trim()}>
            Check answer
          </button>
        )}
      </form>
      {result && !result.error && (
        <div className={`mcq-feedback ${result.correct ? 'correct' : 'incorrect'}`}>
          <strong>{result.correct ? 'Correct!' : 'Not quite.'}</strong>
          {!result.correct && result.reveal && <span>Expected: {result.reveal}</span>}
          {!result.correct && (
            <button className="retry-button" onClick={retry}>Try again</button>
          )}
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </article>
  );
}
