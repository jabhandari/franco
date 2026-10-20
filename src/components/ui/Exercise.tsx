import React from 'react';
import { Check, X } from 'lucide-react';
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
  // Key of the right option: after a wrong pick it is highlighted
  // .correct alongside the selected option's .incorrect.
  correctKey?: string;
  disabled?: boolean;
  onSelect: (key: string) => void;
  key?: React.Key;
};

// Choice buttons: div.mcq-options. After answering, the selected option
// gets .correct / .incorrect based on the `correct` result; when
// `correctKey` is given, the right option is also marked .correct after
// a wrong pick so the learner sees the answer.
export function OptionList({ options = [], selectedKey, answered = false, correct = false, correctKey, disabled = false, onSelect }: OptionListProps) {
  return (
    <div className="mcq-options">
      {options.map((option, index) => {
        const isSelected = selectedKey === option.key;
        const showCorrect = answered && (correctKey ? option.key === correctKey : isSelected && correct);
        const showIncorrect = answered && isSelected && !correct;
        const tone = showCorrect ? 'correct' : showIncorrect ? 'incorrect' : '';
        return (
          <button
            key={option.key}
            type="button"
            className={tone}
            disabled={disabled}
            onClick={() => onSelect(option.key)}
          >
            <span className="mcq-option-index" aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <span className="mcq-option-label">{option.label}</span>
            {tone ? <span className="mcq-option-state" aria-hidden="true">{tone === 'correct' ? <Check size={17} /> : <X size={17} />}</span> : null}
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
