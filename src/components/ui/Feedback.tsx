import React from 'react';
import { CheckCircle2, Info, RotateCcw, XCircle } from 'lucide-react';
import { Button } from './Button';

export type FeedbackTone = 'info' | 'correct' | 'incorrect';

export type FeedbackProps = {
  tone?: FeedbackTone;
  title?: React.ReactNode;
  message?: React.ReactNode;
  revealLabel?: string;
  reveal?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
  key?: React.Key;
};

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
    <div className={`mcq-feedback${toneClass}`} role="status">
      <span className="mcq-feedback-icon" aria-hidden="true">{tone === 'correct' ? <CheckCircle2 size={22} /> : tone === 'incorrect' ? <XCircle size={22} /> : <Info size={22} />}</span>
      <div className="mcq-feedback-copy">
        {title ? <strong>{title}</strong> : null}
        {message ? <span>{message}</span> : null}
        {reveal ? (
          <span>
            {revealLabel ? `${revealLabel} ` : ''}
            <strong>{reveal}</strong>
          </span>
        ) : null}
        {children}
      </div>
      {onRetry ? (
        <Button variant="retry" icon={RotateCcw} onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export type ErrorMessageProps = {
  message?: React.ReactNode;
  children?: React.ReactNode;
  key?: React.Key;
};

// Block-level error text: p.error-message.
export function ErrorMessage({ message, children }: ErrorMessageProps) {
  if (!message && !children) return null;
  return <p className="error-message">{message || children}</p>;
}

export type SuccessMessageProps = { message: string };

export function SuccessMessage({ message }: SuccessMessageProps) {
  return <div role="status" className="ui-success-message"><CheckCircle2 size={20} aria-hidden="true"/><p>{message}</p></div>;
}
