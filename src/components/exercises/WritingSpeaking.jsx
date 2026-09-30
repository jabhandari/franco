import React from 'react';
import { getErrorMessage, reportAttempt } from '../../api/client.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  AnswerForm,
  Feedback,
  ErrorMessage,
  RubricBox,
  Button,
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
      const res = await reportAttempt(entry, value, token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  return (
    <ExerciseShell>
      <ExerciseEyebrow level={entry.level} kind="writing" />
      <h2>{entry.title || 'Writing prompt'}</h2>
      <Text>{entry.prompt}</Text>
      {entry.instructions && <Text variant="muted">{entry.instructions}</Text>}
      {Object.keys(rubric).length > 0 && (
        <RubricBox
          title="Grading rubric"
          items={Object.entries(rubric).map(([criterion, description]) => (
            <React.Fragment key={criterion}>
              <strong>{criterion.replace(/_/g, ' ')}</strong>: {description}
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
      {result && !result.error && (
        <Feedback tone="correct" title="Submitted.">
          <span>Compare your text against the rubric above — completion has been logged.</span>
        </Feedback>
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}

// Speaking prompt: topic + follow-up questions, marked complete when done.
export function SpeakingPrompt({ entry, token, onResult }) {
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());
  const points = entry.expectedPoints || [];
  const followUps = entry.followUpQuestions || [];

  async function markComplete() {
    if (result) return;
    try {
      const res = await reportAttempt(entry, 'completed', token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  return (
    <ExerciseShell>
      <ExerciseEyebrow level={entry.level} kind="speaking" />
      <h2>{entry.title || 'Speaking practice'}</h2>
      <Text>{entry.prompt}</Text>
      {entry.instructions && <Text variant="muted">{entry.instructions}</Text>}
      {followUps.length > 0 && (
        <RubricBox
          title="Follow-up questions"
          items={followUps.map((question, index) => (
            <React.Fragment key={index}>{question}</React.Fragment>
          ))}
        />
      )}
      {!result && (
        <>
          <Text variant="muted">Speak your answer aloud, then mark it complete.</Text>
          <Button variant="primary" onClick={markComplete}>Mark complete</Button>
        </>
      )}
      {result && !result.error && (
        <Feedback tone="correct" title="Logged.">
          {points.length > 0 && (
            <ul>
              {points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          )}
        </Feedback>
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
