import React from 'react';
import { Button } from './Button.jsx';

// Sidebar navigation button. Thin wrapper over Button variant="nav"
// that keeps the icon-before-label convention.
export function NavButton({ icon, active = false, onClick, children }) {
  return (
    <Button variant="nav" active={active} onClick={onClick} icon={icon} iconSize={18}>
      <span>{children}</span>
    </Button>
  );
}

// Brand mark. Renders a button when onClick is given, otherwise a div.
export function Brand({ large = false, onClick, label = 'Franco · preview test' }) {
  const classes = `brand${large ? ' large' : ''}`;
  const inner = (
    <>
      <span className="brand-mark">fr</span>
      <span>{label}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={`${label} home`}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}
