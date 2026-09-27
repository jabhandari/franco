import React from 'react';
import { getErrorMessage, reportAttempt } from '../../api/client.js';

// Pronunciation drill: listen, repeat aloud, then honestly self-mark.
export function PronunciationDrill({ entry, token, onResult }) {
  const [revealed, setRevealed] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());
  const audio = (entry.media || []).find((m) => m.kind === 'audio') || (entry.media || [])[0];

  async function selfMark(saidItRight) {
    if (result) return;
    try {
      // Self-assessment against the known word: confirming sends the expected
      // word itself, which the grader matches; "not quite" sends nothing.
      const res = await reportAttempt(entry, saidItRight ? entry.expected : '', token, {
        durationMs: Date.now() - startRef.current,
      });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  function retry() {
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <article className={`exercise-preview mcq-card ${result && !result.error ? (result.correct ? 'answered-correct' : 'answered-wrong') : ''}`}>
      <span>{[entry.level, 'pronunciation drill'].filter(Boolean).join(' · ')}</span>
      <h2>{entry.prompt}</h2>
      {audio?.url ? (
        <div className="audio-player">
          <audio controls src={audio.url} preload="metadata" />
          {audio.transcript && <p className="muted">Transcript available after self-marking.</p>}
        </div>
      ) : (
        <p className="muted">No audio attached to this drill yet.</p>
      )}
      <p className="muted">Listen, then say it aloud.</p>
      {!revealed ? (
        <button className="primary-button" onClick={() => setRevealed(true)}>Reveal the word</button>
      ) : (
        <p className="reveal-word">{entry.expected}</p>
      )}
      {revealed && !result && (
        <div className="self-mark-row">
          <button className="primary-button" onClick={() => selfMark(true)}>I said it right</button>
          <button className="retry-button" onClick={() => selfMark(false)}>Not quite</button>
        </div>
      )}
      {result && !result.error && (
        <div className={`mcq-feedback ${result.correct ? 'correct' : 'incorrect'}`}>
          <strong>{result.correct ? 'Nice — logged as correct.' : 'Logged. Keep practising.'}</strong>
          {!result.correct && (
            <button className="retry-button" onClick={retry}>Try again</button>
          )}
        </div>
      )}
      {result?.error && <p className="error-message">{result.error}</p>}
    </article>
  );
}
