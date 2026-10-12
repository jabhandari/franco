import React from 'react';
import { Button } from './Button';
import { Textarea } from './Field';

export type ExerciseEyebrowProps = {
  level?: React.ReactNode;
  kind?: React.ReactNode;
  key?: React.Key;
};

// Kicker line for exercise cards: "A1 · dictation".
export function ExerciseEyebrow({ level, kind }: ExerciseEyebrowProps) {
  return <span>{[level, kind].filter(Boolean).join(' · ')}</span>;
}

export type AnsweredState = 'correct' | 'wrong';

export type ExerciseShellProps = {
  eyebrow?: React.ReactNode;
  answered?: AnsweredState | null;
  variant?: 'default' | 'pronunciation';
  children?: React.ReactNode;
  key?: React.Key;
};

// Standard exercise card wrapper: article.exercise-preview.mcq-card with
// an optional answered-correct / answered-wrong state class.
export function ExerciseShell({ eyebrow, answered = null, variant = 'default', children }: ExerciseShellProps) {
  const stateClass =
    answered === 'correct' ? ' answered-correct' : answered === 'wrong' ? ' answered-wrong' : '';
  const variantClass = variant === 'pronunciation' ? ' pronunciation-card' : '';
  return (
    <article className={`exercise-preview mcq-card${variantClass}${stateClass}`}>
      {eyebrow ? <span>{eyebrow}</span> : null}
      {children}
    </article>
  );
}

export type ExerciseOption = {
  key: string;
  label: React.ReactNode;
};

export type OptionListProps = {
  options?: ExerciseOption[];
  selectedKey?: string;
  answered?: boolean;
  correct?: boolean;
  disabled?: boolean;
  onSelect: (key: string) => void;
  key?: React.Key;
};

// Choice buttons: div.mcq-options. After answering, the selected option
// gets .correct / .incorrect based on the `correct` result.
export function OptionList({ options = [], selectedKey, answered = false, correct = false, disabled = false, onSelect }: OptionListProps) {
  return (
    <div className="mcq-options">
      {options.map((option) => {
        const isSelected = selectedKey === option.key;
        const tone = isSelected && answered ? (correct ? 'correct' : 'incorrect') : '';
        return (
          <button
            key={option.key}
            type="button"
            className={tone}
            disabled={disabled}
            onClick={() => onSelect(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type AnswerFormProps = {
  rows?: number;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  disabled?: boolean;
  submitDisabled?: boolean;
  hideSubmit?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  submitting?: boolean;
  onSubmit: () => void;
  key?: React.Key;
};

// Free-text answer form: textarea + primary submit button.
export function AnswerForm({
  rows = 3,
  value,
  onChange,
  placeholder,
  disabled = false,
  submitDisabled = false,
  hideSubmit = false,
  submitLabel = 'Check answer',
  submittingLabel,
  submitting = false,
  onSubmit,
}: AnswerFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled || submitting} />
      {!hideSubmit ? (
        <Button type="submit" variant="primary" disabled={submitDisabled || submitting}>
          {submitting && submittingLabel ? submittingLabel : submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
