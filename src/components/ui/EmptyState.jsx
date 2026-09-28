import React from 'react';

// Dashed placeholder panel for empty/loading/error states.
export function EmptyState({ icon: Icon, title, text, action = null }) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={24} aria-hidden="true" /> : null}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
