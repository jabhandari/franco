import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage, humanize } from '../../presenters/format.presenter.js';
import {
  answeredState,
  hasResult,
  feedbackTone,
  feedbackTitle,
  elapsedMs,
} from '../../presenters/attempt.presenter.js';
import * as UIRaw from '../ui';

// delete once FRA-63 lands: unconverted JS UI components don't resolve as
// plain `any` for JSX props under allowJs, so alias them loose here.
const {
  ExerciseShell,
  ExerciseEyebrow,
  AnswerForm,
  Feedback,
  ErrorMessage,
  AudioPlayer,
  Text,
}: Record<string, React.ComponentType<any>> = UIRaw;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export interface SpellingItem {
  level?: string;
  type?: string;
  prompt?: string;
  [key: string]: unknown;
}

export interface AttemptResult {
  correct?: boolean;
  reveal?: unknown;
  error?: string;
  [key: string]: unknown;
}

interface SpellingProps {
  entry: SpellingItem;
  token?: string | null;
  audioUrl?: string;
  onResult?: (result: AttemptResult) => void;
}

// Typed-answer renderer for spelling / cloze / free-text items, and dictation
// when an audioUrl is provided.
export function Spelling({ entry, token, audioUrl, onResult }: SpellingProps) {
  const [value, setValue] = React.useState<string>('');
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const startRef = React.useRef<number>(Date.now());
  const isDictation = Boolean(audioUrl);

  async function submit(event?: React.SyntheticEvent) {
    event?.preventDefault();
    if (result || !value.trim()) return;
    try {
      const res: AttemptResult = await reportAttempt(entry, value, token, { durationMs: elapsedMs(startRef.current) });
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
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value)}
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
