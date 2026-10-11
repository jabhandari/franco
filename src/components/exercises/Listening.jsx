import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import {
  answeredState,
  hasResult,
  feedbackTone,
  elapsedMs,
} from '../../presenters/attempt.presenter.js';
import {
  Box,
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
        durationMs: elapsedMs(startRef.current),
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
    <ExerciseShell answered={answeredState(result)}>
      <Box className="pronunciation-drill">
      <ExerciseEyebrow level={entry.level} kind="pronunciation drill" />
      <Text as="h2">{entry.prompt}</Text>
      <AudioPlayer
        src={audio?.url}
        transcript={audio?.transcript ? 'Transcript available after self-marking.' : undefined}
        emptyText="No audio attached to this drill yet."
      />
      <Text variant="muted">Listen, then say it aloud.</Text>
      {!revealed ? (
        <Button variant="primary" onClick={() => setRevealed(true)}>Reveal the word</Button>
      ) : (
        <Text className="reveal-word">{entry.expected}</Text>
      )}
      {revealed && !result && (
        <Box className="self-mark-row">
          <Button variant="primary" onClick={() => selfMark(true)}>I said it right</Button>
          <Button variant="retry" onClick={() => selfMark(false)}>Not quite</Button>
        </Box>
      )}
      {hasResult(result) && (
        <Feedback
          tone={feedbackTone(result)}
          title={result.correct ? 'Nice — logged as correct.' : 'Logged. Keep practising.'}
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
      </Box>
    </ExerciseShell>
  );
}
