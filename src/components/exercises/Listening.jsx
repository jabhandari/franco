import React from 'react';
import { getErrorMessage, reportAttempt } from '../../api/client.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  AudioPlayer,
  Feedback,
  ErrorMessage,
  Button,
  Text,
} from '../ui';

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
    <ExerciseShell answered={result && !result.error ? (result.correct ? 'correct' : 'wrong') : null}>
      <ExerciseEyebrow level={entry.level} kind="pronunciation drill" />
      <h2>{entry.prompt}</h2>
      <AudioPlayer
        src={audio?.url}
        transcript={audio?.transcript ? 'Transcript available after self-marking.' : undefined}
        emptyText="No audio attached to this drill yet."
      />
      <Text variant="muted">Listen, then say it aloud.</Text>
      {!revealed ? (
        <Button variant="primary" onClick={() => setRevealed(true)}>Reveal the word</Button>
      ) : (
        <p className="reveal-word">{entry.expected}</p>
      )}
      {revealed && !result && (
        <div className="self-mark-row">
          <Button variant="primary" onClick={() => selfMark(true)}>I said it right</Button>
          <Button variant="retry" onClick={() => selfMark(false)}>Not quite</Button>
        </div>
      )}
      {result && !result.error && (
        <Feedback
          tone={result.correct ? 'correct' : 'incorrect'}
          title={result.correct ? 'Nice — logged as correct.' : 'Logged. Keep practising.'}
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
