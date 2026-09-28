import React from 'react';
import { getErrorMessage, reportAttempt, shuffle } from '../../api/client.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  ReadingPassage,
  OptionList,
  Feedback,
  ErrorMessage,
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
      const res = await reportAttempt(entry, choice.key, token, { durationMs: Date.now() - startRef.current });
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
    <ExerciseShell answered={result && !result.error ? (result.correct ? 'correct' : 'wrong') : null}>
      <ExerciseEyebrow level={entry.level} kind={entry.skill || (entry.type || '').replace(/_/g, ' ')} />
      {entry.context && <ReadingPassage text={entry.context} />}
      <h2>{entry.prompt}</h2>
      <OptionList
        options={options.map((option) => ({ key: option.key, label: <>{option.key}. {option.text}</> }))}
        selectedKey={selected}
        answered={Boolean(result && !result.error)}
        correct={Boolean(result?.correct)}
        disabled={Boolean(result)}
        onSelect={(key) => choose(options.find((option) => option.key === key))}
      />
      {result && !result.error && (
        <Feedback
          tone={result.correct ? 'correct' : 'incorrect'}
          title={result.correct ? 'Correct!' : 'Not quite.'}
          reveal={result.correct ? undefined : result.reveal}
          revealLabel="Correct answer:"
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
