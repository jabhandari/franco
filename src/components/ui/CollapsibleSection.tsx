import React from 'react';

export interface CollapsibleSectionProps {
  title?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  key?: React.Key;
}

// Expandable section: details.content-module + summary with title + badge.
export function CollapsibleSection({ title, badge, defaultOpen = false, children }: CollapsibleSectionProps) {
  return (
    <details className="content-module" open={defaultOpen || undefined}>
      <summary>
        <span>{title}</span>
        {badge != null ? <small>{badge}</small> : null}
      </summary>
      {children}
    </details>
  );
}
