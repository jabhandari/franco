import React from 'react';

// Meta row with trailing actions: div.session-toolbar.
export function Toolbar({ meta, actions = null }) {
  return (
    <div className="session-toolbar">
      <span>{meta}</span>
      {actions}
    </div>
  );
}
