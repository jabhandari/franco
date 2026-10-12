import React from 'react';
import type { AttemptItemKind } from '../../api/client';
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

type ExerciseShellProps = {
  answered?: 'correct' | 'wrong' | null;
  children?: React.ReactNode;
};

type ExerciseEyebrowProps = {
  level?: string;
  kind?: string;
};

type AnswerFormProps = {
  rows?: number;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  hideSubmit?: boolean;
  submitLabel?: string;
  onSubmit?: (event?: React.SyntheticEvent) => void;
};

type FeedbackProps = {
  tone?: 'correct' | 'incorrect' | 'info';
  title?: string;
  reveal?: React.ReactNode;
  revealLabel?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
};

type ErrorMessageProps = {
  message?: string;
};

type AudioPlayerProps = {
  src?: string;
};

type TextProps = {
  as?: string;
  children?: React.ReactNode;
};

// Interim ui/ bridge (deleted once FRA-63 lands): src/components/ui is still
// .jsx, so its exports resolve as `any` under allowJs and precise prop types
// are unknowable from this file. Justification for each `as` below: the
// assertion restores a minimal typed surface — only the props this file
// passes — until the library converts to TSX, when this block is removed.
const ExerciseShell = UIRaw.ExerciseShell as React.ComponentType<ExerciseShellProps>;
const ExerciseEyebrow = UIRaw.ExerciseEyebrow as React.ComponentType<ExerciseEyebrowProps>;
const AnswerForm = UIRaw.AnswerForm as React.ComponentType<AnswerFormProps>;
const Feedback = UIRaw.Feedback as React.ComponentType<FeedbackProps>;
const ErrorMessage = UIRaw.ErrorMessage as React.ComponentType<ErrorMessageProps>;
const AudioPlayer = UIRaw.AudioPlayer as React.ComponentType<AudioPlayerProps>;
const Text = UIRaw.Text as React.ComponentType<TextProps>;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export type SpellingItem = {
  id: string;
  item_kind: AttemptItemKind;
  level?: string;
  type?: string;
  prompt?: string;
};

// Attempt rows returned by POST /api/me/attempts (server/index.js):
// { attempt, correct, score, reveal, next_due_at }. For spelling the server
// sets reveal to the expected answer; error is set locally when
// reportAttempt throws.
export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type SpellingProps = {
  entry: SpellingItem;
  token?: string | null;
  audioUrl?: string;
  onResult?: (result: AttemptResult) => void;
};

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
