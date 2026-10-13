import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

export type NavButtonProps = {
  icon?: LucideIcon | null;
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  key?: React.Key;
};

// One accessible navigation control for the sidebar and phone tab bar.
export function NavButton({ icon, active = false, onClick, children }: NavButtonProps) {
  const Icon = icon;
  return (
    <button type="button" className={`nav-button${active ? ' active' : ''}`} onClick={onClick}
      aria-label={typeof children === 'string' ? children : undefined} aria-current={active ? 'page' : undefined}
      title={typeof children === 'string' ? children : undefined}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <span className="nav-label">{children}</span>
    </button>
  );
}

export type UserMenuProps = {
  name: string;
  active?: boolean;
  level?: string | null;
  onClick: () => void;
};

export function UserMenu({ name, level, onClick, active = false }: UserMenuProps) {
  return (
    <button type="button" className={`user-menu${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick} aria-label={`Open profile for ${name}`} title={`${name} · ${level || 'Not placed yet'}`}>
      <span className="user-avatar" aria-hidden="true">{Array.from(name.trim())[0]?.toUpperCase() || 'F'}</span>
      <span className="user-details"><strong>{name}</strong><small>{level ? `${level} · French learner` : 'Not placed yet'}</small></span>
      <ChevronRight className="user-chevron" size={16} aria-hidden="true" />
    </button>
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
