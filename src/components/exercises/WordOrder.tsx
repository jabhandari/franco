import React from 'react';
import type { AttemptItemKind } from '../../api/client';
import { reportAttempt } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { shuffle } from '../../presenters/collections.presenter.js';
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

type ButtonProps = {
  variant?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
};

type TextProps = {
  as?: string;
  variant?: string;
  children?: React.ReactNode;
};

type WordTokenProps = {
  placed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
};

type TokenTrayProps = {
  variant?: string;
  label?: string;
  emptyHint?: string;
  children?: React.ReactNode;
};

// Interim ui/ bridge (deleted once FRA-63 lands): src/components/ui is still
// .jsx, so its exports resolve as `any` under allowJs and precise prop types
// are unknowable from this file. Justification for each `as` below: the
// assertion restores a minimal typed surface — only the props this file
// passes — until the library converts to TSX, when this block is removed.
const ExerciseShell = UIRaw.ExerciseShell as React.ComponentType<ExerciseShellProps>;
const ExerciseEyebrow = UIRaw.ExerciseEyebrow as React.ComponentType<ExerciseEyebrowProps>;
const Feedback = UIRaw.Feedback as React.ComponentType<FeedbackProps>;
const ErrorMessage = UIRaw.ErrorMessage as React.ComponentType<ErrorMessageProps>;
const Button = UIRaw.Button as React.ComponentType<ButtonProps>;
const Text = UIRaw.Text as React.ComponentType<TextProps>;
const WordToken = UIRaw.WordToken as React.ComponentType<WordTokenProps>;
const TokenTray = UIRaw.TokenTray as React.ComponentType<TokenTrayProps>;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export type WordOrderItem = {
  id: string;
  item_kind: AttemptItemKind;
  level?: string;
  prompt?: string;
  tokens?: string[];
};

// Attempt rows returned by POST /api/me/attempts (server/index.js):
// { attempt, correct, score, reveal, next_due_at }. For word_order the
// server sets reveal to the tokens joined in the correct order; error is set
// locally when reportAttempt throws.
export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type WordOrderProps = {
  entry: WordOrderItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
  simulateSubmit?: SimulateSubmit;
};

// Tap-to-order sentence builder for word_order items.
export function WordOrder({ entry, token, onResult, simulateSubmit }: WordOrderProps) {
  const [bank, setBank] = React.useState<string[]>(() => shuffle(entry.tokens || []));
  const [answer, setAnswer] = React.useState<string[]>([]);
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const startRef = React.useRef<number>(Date.now());

  function take(index: number) {
    if (result) return;
    setBank((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      setAnswer((prevAnswer) => [...prevAnswer, moved]);
      return next;
    });
  }

  function giveBack(index: number) {
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
      const res: AttemptResult = simulateSubmit
        ? await simulateSubmit(entry, answer)
        : await reportAttempt(entry, answer, token, { durationMs: elapsedMs(startRef.current) });
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
    <ExerciseShell answered={answeredState(result)}>
      <ExerciseEyebrow level={entry.level} kind="word order" />
      <Text as="h2">{entry.prompt}</Text>
      <Text variant="muted">Tap the words in order to build the sentence. Tap a placed word to remove it.</Text>
      <Text as="strong" className="practice-tray-label">Your sentence</Text>
      <TokenTray variant="answer" label="Your sentence" emptyHint="Tap a word below to begin.">
        {answer.map((word, index) => (
          <WordToken key={`a-${index}`} placed disabled={Boolean(result)} onClick={() => giveBack(index)}>
            {word}
          </WordToken>
        ))}
      </TokenTray>
      <Text as="strong" className="practice-tray-label">Word bank</Text>
      <TokenTray variant="bank" label="Word bank">
        {bank.map((word, index) => (
          <WordToken key={`b-${index}-${word}`} disabled={Boolean(result)} onClick={() => take(index)}>
            {word}
          </WordToken>
        ))}
      </TokenTray>
      {!result && (
        <Button variant="primary" onClick={submit} disabled={!answer.length}>
          Check answer
        </Button>
      )}
      {hasResult(result) && (
        <Feedback
          tone={feedbackTone(result)}
          title={feedbackTitle(result)}
          reveal={result.correct ? undefined : result.reveal}
          revealLabel="Correct order:"
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
