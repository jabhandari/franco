import React from 'react';
import { Button } from './Button';

export type FeedbackTone = 'info' | 'correct' | 'incorrect';

export interface FeedbackProps {
  tone?: FeedbackTone;
  title?: React.ReactNode;
  message?: React.ReactNode;
  revealLabel?: string;
  reveal?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
  key?: React.Key;
}

// Answer feedback box: .mcq-feedback.correct | .mcq-feedback.incorrect.
// tone 'info' renders the box without a tone class.
export function Feedback({
  tone = 'info',
  title,
  message,
  revealLabel,
  reveal,
  onRetry,
  retryLabel = 'Try again',
  children,
}: FeedbackProps) {
  const toneClass = tone === 'correct' || tone === 'incorrect' ? ` ${tone}` : '';
  return (
    <div className={`mcq-feedback${toneClass}`}>
      {title ? <strong>{title}</strong> : null}
      {message ? <span>{message}</span> : null}
      {reveal ? (
        <span>
          {revealLabel ? `${revealLabel} ` : ''}
          {reveal}
        </span>
      ) : null}
      {onRetry ? (
        <Button variant="retry" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
      {children}
    </div>
  );
}

export interface ErrorMessageProps {
  message?: React.ReactNode;
  children?: React.ReactNode;
  key?: React.Key;
}

// Block-level error text: p.error-message.
export function ErrorMessage({ message, children }: ErrorMessageProps) {
  if (!message && !children) return null;
  return <p className="error-message">{message || children}</p>;
}
