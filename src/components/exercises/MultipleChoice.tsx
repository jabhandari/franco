import React from 'react';
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

// delete once FRA-63 lands: unconverted JS UI components don't resolve as
// plain `any` for JSX props under allowJs, so alias them loose here.
const {
  ExerciseShell,
  ExerciseEyebrow,
  ReadingPassage,
  OptionList,
  Feedback,
  ErrorMessage,
  Text,
}: Record<string, React.ComponentType<any>> = UIRaw;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export interface MultipleChoiceOption {
  key: string;
  [key: string]: unknown;
}

export interface MultipleChoiceItem {
  level?: string;
  skill?: string;
  type?: string;
  prompt?: string;
  context?: string;
  choices?: MultipleChoiceOption[];
  [key: string]: unknown;
}

export interface AttemptResult {
  correct?: boolean;
  reveal?: unknown;
  error?: string;
  [key: string]: unknown;
}

interface MultipleChoiceProps {
  entry: MultipleChoiceItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
}

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
