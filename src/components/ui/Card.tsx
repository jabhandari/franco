import React from 'react';

export interface CardProps {
  onClick?: () => void;
  ariaLabel?: string;
  children?: React.ReactNode;
  key?: React.Key;
}

// Card — themed content card for grid layouts (e.g. level picker).
// Renders a <button> when onClick is given (full keyboard semantics),
// otherwise a <div>. Styling (light/dark, hover, radius) lives in
// styles.css under .card; this component owns its classes and exposes
// only explicit props (FRA-16).
export function Card({ onClick, ariaLabel, children }: CardProps) {
  if (onClick) {
    return (
      <button type="button" className="card card-clickable" onClick={onClick} aria-label={ariaLabel}>
        {children}
      </button>
    );
  }
  return <div className="card">{children}</div>;
}
