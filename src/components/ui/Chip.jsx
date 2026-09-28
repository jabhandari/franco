import React from 'react';

// Small pill, e.g. the conversation timer: span.timer-chip with an icon,
// a space, then the label.
export function Chip({ icon: Icon = null, iconSize = 14, children }) {
  return (
    <span className="timer-chip">
      {Icon ? (
        <>
          <Icon size={iconSize} aria-hidden="true" />{' '}
        </>
      ) : null}
      {children}
    </span>
  );
}
