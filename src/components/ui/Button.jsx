import React from 'react';

// App buttons. variant maps 1:1 to the existing button classes:
// primary -> .primary-button, text -> .text-button, retry -> .retry-button,
// reset -> .reset-button, nav -> .nav-button, report -> .report-button.
// wide stretches full width; centered shrinks to content and centers
// (the old .module-action treatment).
// No className/style escape hatches.
const VARIANT_CLASS = {
  primary: 'primary-button',
  text: 'text-button',
  retry: 'retry-button',
  reset: 'reset-button',
  nav: 'nav-button',
  report: 'report-button',
};

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
}) {
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
