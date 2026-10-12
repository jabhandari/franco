import React from 'react';

// Typography. variant maps to the app's existing text classes.
export type TextVariant = 'body' | 'muted' | 'eyebrow' | 'lede' | 'note';

// Aria attribute values are caller-provided primitives by definition.
type AriaValue = string | number | boolean | undefined;

const VARIANT_CLASS: Record<TextVariant, string> = {
  body: '',
  muted: 'muted',
  eyebrow: 'eyebrow',
  lede: 'lede',
  note: 'form-note',
};

export type TextProps = {
  variant?: TextVariant;
  size?: string;
  nowrap?: boolean;
  as?: React.ElementType;
  className?: string;
  role?: string;
  children?: React.ReactNode;
  key?: React.Key;
  // Extra props pass through to the tag (this component spreads ...rest),
  // but only aria-* attributes are part of the contract.
  [ariaProp: `aria-${string}`]: AriaValue;
};

export function Text({ variant = 'body', size, nowrap = false, as: Tag = 'p', className, children, ...rest }: TextProps) {
  const classes = [VARIANT_CLASS[variant] || '', size === 'sm' ? 'small' : '', nowrap ? 'nowrap' : '', className || '']
    .filter(Boolean)
    .join(' ');
  return <Tag className={classes || undefined} {...rest}>{children}</Tag>;
}

export type PageHeaderProps = {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  key?: React.Key;
};

// Standard page header: kicker + title + intro paragraph.
export function PageHeader({ eyebrow, title, lede }: PageHeaderProps) {
  return (
    <>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
    </>
  );
}
