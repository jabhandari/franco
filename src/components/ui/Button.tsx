import React from 'react';
import type { LucideIcon } from 'lucide-react';

// App buttons. variant maps 1:1 to the existing button classes:
// primary -> .primary-button, text -> .text-button, retry -> .retry-button,
// reset -> .reset-button, nav -> .nav-button, report -> .report-button.
// wide stretches full width; centered shrinks to content and centers
// (the old .module-action treatment).
// No className/style escape hatches.
export type ButtonVariant = 'primary' | 'text' | 'retry' | 'reset' | 'nav' | 'report';

// Aria attribute values are caller-provided primitives by definition.
type AriaValue = string | number | boolean | undefined;

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'primary-button',
  text: 'text-button',
  retry: 'retry-button',
  reset: 'reset-button',
  nav: 'nav-button',
  report: 'report-button',
};

export interface ButtonProps {
  variant?: ButtonVariant;
  wide?: boolean;
  centered?: boolean;
  active?: boolean;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon | null;
  iconSize?: number;
  iconPosition?: 'before' | 'after';
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  key?: React.Key;
  // Extra props spread onto the <button> (e.g. aria-label), but only
  // aria-* attributes are part of the contract.
  [ariaProp: `aria-${string}`]: AriaValue;
}

export function Button({
  variant = 'primary',
  wide = false,
  centered = false,
  active = false,
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon = null,
  iconSize = 18,
  iconPosition = 'before',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    wide ? 'wide' : '',
    centered ? 'button-centered' : '',
    active ? 'active' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const iconNode = Icon ? <Icon size={iconSize} aria-hidden="true" /> : null;
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {iconPosition === 'before' && iconNode}
      {children}
      {iconPosition === 'after' && iconNode}
    </button>
  );
}
