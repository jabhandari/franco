import React from 'react';
import { getErrorMessage, reportAttempt } from '../../api/client.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  AnswerForm,
  Feedback,
  ErrorMessage,
  AudioPlayer,
} from '../ui';

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
      setResult({ error: getErrorMessage(error) });
    }
  }

  function retry() {
    setValue('');
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <ExerciseShell answered={result && !result.error ? (result.correct ? 'correct' : 'wrong') : null}>
      <ExerciseEyebrow
        level={entry.level}
        kind={isDictation ? 'dictation' : (entry.type || 'spelling').replace(/_/g, ' ')}
      />
      {audioUrl && <AudioPlayer src={audioUrl} />}
      <h2>{entry.prompt}</h2>
      <AnswerForm
        rows={isDictation ? 4 : 2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={isDictation ? 'Type exactly what you hear…' : 'Type your answer…'}
        disabled={Boolean(result)}
        submitDisabled={!value.trim()}
        hideSubmit={Boolean(result)}
        submitLabel="Check answer"
        onSubmit={submit}
      />
      {result && !result.error && (
        <Feedback
          tone={result.correct ? 'correct' : 'incorrect'}
          title={result.correct ? 'Correct!' : 'Not quite.'}
          reveal={result.correct ? undefined : result.reveal}
          revealLabel="Expected:"
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
