import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import {
  answeredState,
  hasResult,
  feedbackTone,
  elapsedMs,
} from '../../presenters/attempt.presenter.js';
import * as UIRaw from '../ui';

type BoxProps = {
  className?: string;
  children?: React.ReactNode;
};

type ExerciseShellProps = {
  answered?: 'correct' | 'wrong' | null;
  children?: React.ReactNode;
};

type ExerciseEyebrowProps = {
  level?: string;
  kind?: string;
};

type AudioPlayerProps = {
  src?: string;
  transcript?: string;
  emptyText?: string;
};

type FeedbackProps = {
  tone?: 'correct' | 'incorrect' | 'info';
  title?: string;
  onRetry?: () => void;
  children?: React.ReactNode;
};

type ErrorMessageProps = {
  message?: string;
};

type ButtonProps = {
  variant?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

type TextProps = {
  as?: string;
  className?: string;
  variant?: string;
  children?: React.ReactNode;
};

// Interim ui/ bridge (deleted once FRA-63 lands): src/components/ui is still
// .jsx, so its exports resolve as `any` under allowJs and precise prop types
// are unknowable from this file. Justification for each `as` below: the
// assertion restores a minimal typed surface — only the props this file
// passes — until the library converts to TSX, when this block is removed.
const Box = UIRaw.Box as React.ComponentType<BoxProps>;
const ExerciseShell = UIRaw.ExerciseShell as React.ComponentType<ExerciseShellProps>;
const ExerciseEyebrow = UIRaw.ExerciseEyebrow as React.ComponentType<ExerciseEyebrowProps>;
const AudioPlayer = UIRaw.AudioPlayer as React.ComponentType<AudioPlayerProps>;
const Feedback = UIRaw.Feedback as React.ComponentType<FeedbackProps>;
const ErrorMessage = UIRaw.ErrorMessage as React.ComponentType<ErrorMessageProps>;
const Button = UIRaw.Button as React.ComponentType<ButtonProps>;
const Text = UIRaw.Text as React.ComponentType<TextProps>;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
//
// Media asset shape per the content contract (schemas/content.v1.schema.json
// $.defs media): kind + url are required; listening items use `transcript`
// for the post-self-marking reveal text.
export type MediaAsset = {
  kind: 'audio' | 'image' | 'video' | 'document';
  url: string;
  duration_seconds?: number;
  transcript?: string;
  checksum?: string;
};

export type PronunciationDrillItem = {
  level?: string;
  prompt?: string;
  expected?: string;
  media?: MediaAsset[];
};

// Attempt rows returned by POST /api/me/attempts (server/index.js):
// { attempt, correct, score, reveal, next_due_at }. The drill reads
// correct/error; error is set locally when reportAttempt throws.
export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type PronunciationDrillProps = {
  entry: PronunciationDrillItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
};

// Pronunciation drill: listen, repeat aloud, then honestly self-mark.
export function PronunciationDrill({ entry, token, onResult }: PronunciationDrillProps) {
  const [revealed, setRevealed] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const startRef = React.useRef<number>(Date.now());
  const audio = (entry.media || []).find((m) => m.kind === 'audio') || (entry.media || [])[0];

  async function selfMark(saidItRight: boolean) {
    if (result) return;
    try {
      // Self-assessment against the known word: confirming sends the expected
      // word itself, which the grader matches; "not quite" sends nothing.
      const res: AttemptResult = await reportAttempt(entry, saidItRight ? entry.expected : '', token, {
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
