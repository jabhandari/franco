import React from 'react';

export interface ToolbarProps {
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  key?: React.Key;
}

// Meta row with trailing actions: div.session-toolbar.
export function Toolbar({ meta, actions = null }: ToolbarProps) {
  return (
    <div className="session-toolbar">
      <span>{meta}</span>
      {actions}
    </div>
  );
}
