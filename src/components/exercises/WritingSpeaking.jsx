import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage, humanize } from '../../presenters/format.presenter.js';
import { hasResult, elapsedMs } from '../../presenters/attempt.presenter.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  AnswerForm,
  Feedback,
  ErrorMessage,
  RubricBox,
  Text,
} from '../ui';

// Writing prompt: free-form text graded against the server-side rubric.
export function WritingPrompt({ entry, token, onResult }) {
  const [value, setValue] = React.useState('');
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());
  const rubric = entry.rubric || {};

  async function submit(event) {
    event?.preventDefault();
    if (result || value.trim().length < 10) return;
    try {
      const res = await reportAttempt(entry, value, token, { durationMs: elapsedMs(startRef.current) });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  return (
    <ExerciseShell>
      <ExerciseEyebrow level={entry.level} kind="writing" />
      <Text as="h2">{entry.title || 'Writing prompt'}</Text>
      <Text>{entry.prompt}</Text>
      {entry.instructions && <Text variant="muted">{entry.instructions}</Text>}
      {Object.keys(rubric).length > 0 && (
        <RubricBox
          title="Grading rubric"
          items={Object.entries(rubric).map(([criterion, description]) => (
            <React.Fragment key={criterion}>
              <Text as="strong">{humanize(criterion)}</Text>: {description}
            </React.Fragment>
          ))}
        />
      )}
      <AnswerForm
        rows={6}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Write your answer in French…"
        disabled={Boolean(result)}
        submitDisabled={value.trim().length < 10}
        hideSubmit={Boolean(result)}
        submitLabel="Submit writing"
        onSubmit={submit}
      />
      {hasResult(result) && (
        <Feedback tone="correct" title="Submitted.">
          <Text as="span">Compare your text against the rubric above — completion has been logged.</Text>
        </Feedback>
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}

export { SpeakingPrompt } from './SpeakingPrompt.jsx';
