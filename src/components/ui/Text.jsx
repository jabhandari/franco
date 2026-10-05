import React from 'react';

// Typography. variant maps to the app's existing text classes.
const VARIANT_CLASS = {
  body: '',
  muted: 'muted',
  eyebrow: 'eyebrow',
  lede: 'lede',
  note: 'form-note',
};

export function Text({ variant = 'body', size, nowrap = false, as: Tag = 'p', className, children, ...rest }) {
  const classes = [VARIANT_CLASS[variant] || '', size === 'sm' ? 'small' : '', nowrap ? 'nowrap' : '', className || '']
    .filter(Boolean)
    .join(' ');
  return <Tag className={classes || undefined} {...rest}>{children}</Tag>;
}

// Standard page header: kicker + title + intro paragraph.
export function PageHeader({ eyebrow, title, lede }) {
  return (
    <>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
    </>
  );
}
