import React from 'react';

// Layout primitive. Props map to flex/grid CSS owned by this component —
// callers never pass custom styles.
//
// gap scale: xs=4, sm=8, md=16, lg=24, xl=32
const GAP_SCALE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export function Stack({
  as: Tag = 'div',
  display = 'flex',
  direction = 'column',
  gap = 'md',
  align,
  justify,
  wrap,
  children,
  ...rest
}) {
  const style = { display };
  if (display === 'flex') {
    style.flexDirection = direction;
    if (wrap) style.flexWrap = 'wrap';
  }
  if (gap) style.gap = typeof gap === 'number' ? gap : (GAP_SCALE[gap] ?? 16);
  if (align) style.alignItems = align;
  if (justify) style.justifyContent = justify;
  return <Tag style={style} {...rest}>{children}</Tag>;
}

// Page-level container. Replaces <section className="page-stack">.
export function Page({ children }) {
  return <section className="page-stack">{children}</section>;
}
