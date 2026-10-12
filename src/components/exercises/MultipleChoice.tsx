import React from 'react';
import type { AttemptItemKind } from '../../api/client';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage, humanize, choiceLabel } from '../../presenters/format.presenter.js';
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

type ReadingPassageProps = {
  text?: string;
};

type OptionListProps = {
  options?: Array<{ key: string; label: string }>;
  selectedKey?: string | null;
  answered?: boolean;
  correct?: boolean;
  disabled?: boolean;
  onSelect?: (key: string) => void;
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
const ReadingPassage = UIRaw.ReadingPassage as React.ComponentType<ReadingPassageProps>;
const OptionList = UIRaw.OptionList as React.ComponentType<OptionListProps>;
const Feedback = UIRaw.Feedback as React.ComponentType<FeedbackProps>;
const ErrorMessage = UIRaw.ErrorMessage as React.ComponentType<ErrorMessageProps>;
const Text = UIRaw.Text as React.ComponentType<TextProps>;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
//
// Choice shape after normalizeChoices() (src/presenters/collections.presenter.js):
// every choice is { key, text } — safeText guarantees both are strings.
export type MultipleChoiceOption = {
  key: string;
  text: string;
};

export type MultipleChoiceItem = {
  id: string;
  item_kind: AttemptItemKind;
  level?: string;
  skill?: string;
  type?: string;
  prompt?: string;
  context?: string;
  choices?: MultipleChoiceOption[];
};

// Attempt rows returned by POST /api/me/attempts (server/index.js):
// { attempt, correct, score, reveal, next_due_at }. For multiple-choice the
// server sets reveal to the correct choice's text (see the FRA-7 comment in
// the attempts route); error is set locally when reportAttempt throws.
export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type MultipleChoiceProps = {
  entry: MultipleChoiceItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
};

export function MultipleChoice({ entry, token, onResult }: MultipleChoiceProps) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [options] = React.useState<MultipleChoiceOption[]>(() => shuffle(entry.choices || []));
  const startRef = React.useRef<number>(Date.now());

  async function choose(choice: MultipleChoiceOption) {
    if (result) return;
    setSelected(choice.key);
    try {
      const res: AttemptResult = await reportAttempt(entry, choice.key, token, { durationMs: elapsedMs(startRef.current) });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  function retry() {
    setSelected(null);
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <ExerciseShell answered={answeredState(result)}>
      <ExerciseEyebrow level={entry.level} kind={entry.skill || humanize(entry.type)} />
      {entry.context && <ReadingPassage text={entry.context} />}
      <Text as="h2">{entry.prompt}</Text>
      <OptionList
        options={options.map((option) => ({ key: option.key, label: choiceLabel(option) }))}
        selectedKey={selected}
        answered={hasResult(result)}
        correct={Boolean(result?.correct)}
        disabled={Boolean(result)}
        onSelect={(key: string) => choose(options.find((option) => option.key === key))}
      />
      {hasResult(result) && (
        <Feedback
          tone={feedbackTone(result)}
          title={feedbackTitle(result)}
          reveal={result.correct ? undefined : result.reveal}
          revealLabel="Correct answer:"
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
