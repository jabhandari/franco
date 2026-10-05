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
import {
  Box,
  ExerciseShell,
  ExerciseEyebrow,
  ReadingPassage,
  OptionList,
  Feedback,
  ErrorMessage,
  Text,
} from '../ui';

export function MultipleChoice({ entry, token, onResult }) {
  const [selected, setSelected] = React.useState(null);
  const [result, setResult] = React.useState(null);
  const [options] = React.useState(() => shuffle(entry.choices || []));
  const startRef = React.useRef(Date.now());

  async function choose(choice) {
    if (result) return;
    setSelected(choice.key);
    try {
      const res = await reportAttempt(entry, choice.key, token, { durationMs: elapsedMs(startRef.current) });
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
        onSelect={(key) => choose(options.find((option) => option.key === key))}
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
