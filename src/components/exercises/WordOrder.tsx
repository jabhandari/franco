import React from 'react';
import { reportAttempt } from '../../api/client.js';
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

// delete once FRA-63 lands: unconverted JS UI components don't resolve as
// plain `any` for JSX props under allowJs, so alias them loose here.
const {
  ExerciseShell,
  ExerciseEyebrow,
  Feedback,
  ErrorMessage,
  Button,
  Text,
  WordToken,
  TokenTray,
}: Record<string, React.ComponentType<any>> = UIRaw;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export interface WordOrderItem {
  level?: string;
  prompt?: string;
  tokens?: string[];
  [key: string]: unknown;
}

export interface AttemptResult {
  correct?: boolean;
  reveal?: unknown;
  error?: string;
  [key: string]: unknown;
}

interface WordOrderProps {
  entry: WordOrderItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
}

// Tap-to-order sentence builder for word_order items.
export function WordOrder({ entry, token, onResult }: WordOrderProps) {
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
      const res: AttemptResult = await reportAttempt(entry, answer, token, { durationMs: elapsedMs(startRef.current) });
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
      <TokenTray variant="answer" label="Your sentence" emptyHint="Your sentence appears here…">
        {answer.map((word, index) => (
          <WordToken key={`a-${index}`} placed disabled={Boolean(result)} onClick={() => giveBack(index)}>
            {word}
          </WordToken>
        ))}
      </TokenTray>
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
