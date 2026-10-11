import React from 'react';
import { reportAttempt } from '../../api/client.js';
import { getErrorMessage, humanize } from '../../presenters/format.presenter.js';
import { hasResult, elapsedMs } from '../../presenters/attempt.presenter.js';
import * as UIRaw from '../ui';

interface ExerciseShellProps {
  children?: React.ReactNode;
}

interface ExerciseEyebrowProps {
  level?: string;
  kind?: string;
}

interface AnswerFormProps {
  rows?: number;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  hideSubmit?: boolean;
  submitLabel?: string;
  onSubmit?: (event?: React.SyntheticEvent) => void;
}

interface FeedbackProps {
  tone?: 'correct' | 'incorrect' | 'info';
  title?: string;
  children?: React.ReactNode;
}

interface ErrorMessageProps {
  message?: string;
}

interface RubricBoxProps {
  title?: string;
  items?: React.ReactNode;
}

interface TextProps {
  as?: string;
  variant?: string;
  children?: React.ReactNode;
}

// Interim ui/ bridge (deleted once FRA-63 lands): src/components/ui is still
// .jsx, so its exports resolve as `any` under allowJs and precise prop types
// are unknowable from this file. Justification for each `as` below: the
// assertion restores a minimal typed surface — only the props this file
// passes — until the library converts to TSX, when this block is removed.
const ExerciseShell = UIRaw.ExerciseShell as React.ComponentType<ExerciseShellProps>;
const ExerciseEyebrow = UIRaw.ExerciseEyebrow as React.ComponentType<ExerciseEyebrowProps>;
const AnswerForm = UIRaw.AnswerForm as React.ComponentType<AnswerFormProps>;
const Feedback = UIRaw.Feedback as React.ComponentType<FeedbackProps>;
const ErrorMessage = UIRaw.ErrorMessage as React.ComponentType<ErrorMessageProps>;
const RubricBox = UIRaw.RubricBox as React.ComponentType<RubricBoxProps>;
const Text = UIRaw.Text as React.ComponentType<TextProps>;

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
