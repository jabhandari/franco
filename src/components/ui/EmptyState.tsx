import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon | null;
  title?: React.ReactNode;
  text?: React.ReactNode;
  action?: React.ReactNode;
  key?: React.Key;
}

// Dashed placeholder panel for empty/loading/error states.
export function EmptyState({ icon: Icon, title, text, action = null }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={24} aria-hidden="true" /> : null}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
