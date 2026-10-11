import React from 'react';

export interface WordTokenProps {
  placed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  key?: React.Key;
}

// Tappable word token: button.word-token (+ .placed when in the answer tray).
export function WordToken({ placed = false, disabled = false, onClick, children }: WordTokenProps) {
  return (
    <button
      type="button"
      className={`word-token${placed ? ' placed' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export type TokenTrayVariant = 'answer' | 'bank';

export interface TokenTrayProps {
  variant?: TokenTrayVariant;
  label?: string;
  emptyHint?: React.ReactNode;
  children?: React.ReactNode;
  key?: React.Key;
}

// Token drop zone. variant picks the tray class:
//   answer -> .word-order-answer (shows emptyHint when no children)
//   bank   -> .word-order-bank
export function TokenTray({ variant = 'bank', label, emptyHint, children }: TokenTrayProps) {
  const hasChildren = React.Children.count(children) > 0;
  if (variant === 'answer') {
    return (
      <div className="word-order-answer" aria-label={label}>
        {hasChildren ? children : <span className="muted">{emptyHint}</span>}
      </div>
    );
  }
  return (
    <div className="word-order-bank" aria-label={label}>
      {children}
    </div>
  );
}
