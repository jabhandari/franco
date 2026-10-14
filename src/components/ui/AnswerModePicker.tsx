import React from 'react';
import { Keyboard, Mic } from 'lucide-react';

export type AnswerMode = 'spoken' | 'typed';

type Props = {
  value: AnswerMode;
  onChange: (value: AnswerMode) => void;
  disabled?: boolean;
};

// Both exercise types use the same two input choices and visual hierarchy.
export function AnswerModePicker({ value, onChange, disabled = false }: Props) {
  return <div className="answer-mode-picker" role="group" aria-label="How to answer">
    <button type="button" aria-pressed={value === 'spoken'} disabled={disabled} onClick={() => onChange('spoken')}><Mic size={16} aria-hidden="true" /> Record yourself</button>
    <button type="button" aria-pressed={value === 'typed'} disabled={disabled} onClick={() => onChange('typed')}><Keyboard size={16} aria-hidden="true" /> Type answer</button>
  </div>;
}
