import React from 'react';

// Expandable section: details.content-module + summary with title + badge.
export function CollapsibleSection({ title, badge, defaultOpen = false, children }) {
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
