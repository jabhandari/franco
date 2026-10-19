import React from 'react';
import {Check} from 'lucide-react';
import type {StoryQuestion} from '../../types';

export type StoryAnswerOptionsProps = {
  options: StoryQuestion['options'];
  selected: string;
  disabled: boolean;
  onSelect: (id: string) => void;
};

export function StoryAnswerOptions({options, selected, disabled, onSelect}: StoryAnswerOptionsProps) {
  return (
    <div className="story-answer-options" role="group" aria-label="Answer options">
      {options.map((option, index) => (
        <button
          key={option.id}
          type="button"
          className={`story-answer-option${selected === option.id ? ' selected' : ''}`}
          aria-pressed={selected === option.id}
          disabled={disabled}
          onClick={() => onSelect(option.id)}
        >
          <span className="story-answer-letter">{String.fromCharCode(65 + index)}</span>
          <span className="story-answer-label">{option.text}</span>
          <span className="story-answer-check" aria-hidden="true">{selected === option.id && <Check size={17} />}</span>
        </button>
      ))}
    </div>
  );
}
