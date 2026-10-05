import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage, humanize } from '../../presenters/format.js';
import {
  answeredState,
  hasResult,
  feedbackTone,
  feedbackTitle,
  elapsedMs,
} from '../../presenters/attempt.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  AnswerForm,
  Feedback,
  ErrorMessage,
  AudioPlayer,
  Text,
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
      const res = await reportAttempt(entry, value, token, { durationMs: elapsedMs(startRef.current) });
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
    <ExerciseShell answered={answeredState(result)}>
      <ExerciseEyebrow
        level={entry.level}
        kind={isDictation ? 'dictation' : humanize(entry.type || 'spelling')}
      />
      {audioUrl && <AudioPlayer src={audioUrl} />}
      <Text as="h2">{entry.prompt}</Text>
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
      {hasResult(result) && (
        <Feedback
          tone={feedbackTone(result)}
          title={feedbackTitle(result)}
          reveal={result.correct ? undefined : result.reveal}
          revealLabel="Expected:"
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
