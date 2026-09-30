import React from 'react';
import { Button } from './Button.jsx';

// Call-to-action banner: icon + title/text + primary action.
export function Banner({ icon: Icon = null, iconSize = 20, title, text, actionLabel, onAction }) {
  return (
    <div className="placement-banner">
      {Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      <div>
        <strong>{title}</strong>
        {text ? <p>{text}</p> : null}
      </div>
      {actionLabel ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
