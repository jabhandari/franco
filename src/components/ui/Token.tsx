import React from 'react';

export type WordTokenProps = {
  placed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onSwipe?: () => void;
  children?: React.ReactNode;
  key?: React.Key;
};

// Tappable word token: button.word-token (+ .placed when in the answer tray).
export function WordToken({ placed = false, disabled = false, onClick, onSwipe, children }: WordTokenProps) {
  const start = React.useRef<{ x: number; y: number; id: number } | null>(null);
  const swiped = React.useRef(false);
  return (
    <button
      type="button"
      className={`word-token${placed ? ' placed' : ''}${onSwipe ? ' swipeable' : ''}`}
      onPointerDown={event => {
        swiped.current = false;
        if (!onSwipe || disabled || !event.isPrimary || event.button !== 0) return;
        start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { start.current = null; }}
      onPointerUp={event => {
        const origin = start.current;
        start.current = null;
        if (!origin || origin.id !== event.pointerId || disabled) return;
        const dx = event.clientX - origin.x;
        const dy = event.clientY - origin.y;
        if (Math.abs(dx) >= 30 && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          onSwipe?.();
        }
      }}
      disabled={disabled}
      onClick={() => { if (!swiped.current) onClick?.(); swiped.current = false; }}
    >
      {children}
    </button>
  );
}

export type TokenTrayVariant = 'answer' | 'bank';

export type TokenTrayProps = {
  variant?: TokenTrayVariant;
  label?: string;
  emptyHint?: React.ReactNode;
  children?: React.ReactNode;
  key?: React.Key;
};

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
