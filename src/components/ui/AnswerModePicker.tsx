import React from 'react';
import { Keyboard, Mic } from 'lucide-react';

export type AnswerMode = 'spoken' | 'typed';

type Props = {
  value: AnswerMode;
  onChange: (value: AnswerMode) => void;
  onSpokenAction?: () => void;
  spokenLabel?: string;
  disabled?: boolean;
};

// Both exercise types use the same two input choices and visual hierarchy.
export function AnswerModePicker({ value, onChange, onSpokenAction, spokenLabel = 'Record yourself', disabled = false }: Props) {
  return <div className="answer-mode-picker" role="group" aria-label="How to answer">
    <button type="button" aria-pressed={value === 'spoken'} disabled={disabled} onClick={() => onSpokenAction ? onSpokenAction() : onChange('spoken')}><Mic size={16} aria-hidden="true" /> {spokenLabel}</button>
    <button type="button" aria-pressed={value === 'typed'} disabled={disabled} onClick={() => onChange('typed')}><Keyboard size={16} aria-hidden="true" /> Type answer</button>
  </div>;
}
