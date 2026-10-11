import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export type NavButtonProps = {
  icon?: LucideIcon | null;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  key?: React.Key;
};

// Sidebar navigation button. Thin wrapper over Button variant="nav"
// that keeps the icon-before-label convention.
export function NavButton({ icon, active = false, onClick, children }: NavButtonProps) {
  return (
    <Button variant="nav" active={active} onClick={onClick} icon={icon} iconSize={18}>
      <span>{children}</span>
    </Button>
  );
}

export type BrandProps = {
  large?: boolean;
  onClick?: () => void;
  label?: string;
  key?: React.Key;
};

// Brand mark. Renders a button when onClick is given, otherwise a div.
export function Brand({ large = false, onClick, label = 'Franco' }: BrandProps) {
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
