import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface ChipProps {
  icon?: LucideIcon | null;
  iconSize?: number;
  children?: React.ReactNode;
  key?: React.Key;
}

// Small pill, e.g. the conversation timer: span.timer-chip with an icon,
// a space, then the label.
export function Chip({ icon: Icon = null, iconSize = 14, children }: ChipProps) {
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
