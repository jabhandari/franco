import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage, humanize } from '../../presenters/format.presenter.js';
import { hasResult, elapsedMs } from '../../presenters/attempt.presenter.js';
import * as UIRaw from '../ui';

// delete once FRA-63 lands: unconverted JS UI components don't resolve as
// plain `any` for JSX props under allowJs, so alias them loose here.
const {
  ExerciseShell,
  ExerciseEyebrow,
  AnswerForm,
  Feedback,
  ErrorMessage,
  RubricBox,
  Text,
}: Record<string, React.ComponentType<any>> = UIRaw;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export interface WritingPromptItem {
  level?: string;
  title?: string;
  prompt?: string;
  instructions?: string;
  rubric?: Record<string, string>;
  [key: string]: unknown;
}

export interface AttemptResult {
  error?: string;
  [key: string]: unknown;
}

interface WritingPromptProps {
  entry: WritingPromptItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
}

// Writing prompt: free-form text graded against the server-side rubric.
export function WritingPrompt({ entry, token, onResult }: WritingPromptProps) {
  const [value, setValue] = React.useState<string>('');
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const startRef = React.useRef<number>(Date.now());
  const rubric: Record<string, string> = entry.rubric || {};

  async function submit(event?: React.SyntheticEvent) {
    event?.preventDefault();
    if (result || value.trim().length < 10) return;
    try {
      const res: AttemptResult = await reportAttempt(entry, value, token, { durationMs: elapsedMs(startRef.current) });
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
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value)}
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

export { SpeakingPrompt } from './SpeakingPrompt';
