import React from 'react';

// Layout primitive. Props map to flex/grid CSS owned by this component —
// callers never pass custom styles.
//
// gap scale: xs=4, sm=8, md=16, lg=24, xl=32
const GAP_SCALE: Record<string, number> = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export type StackGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

// Aria attribute values are caller-provided primitives by definition.
type AriaValue = string | number | boolean | undefined;

export interface StackProps {
  as?: React.ElementType;
  display?: React.CSSProperties['display'];
  direction?: React.CSSProperties['flexDirection'];
  gap?: StackGap;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
  children?: React.ReactNode;
  key?: React.Key;
  // Extra props spread onto the tag, but only aria-* attributes are
  // part of the contract.
  [ariaProp: `aria-${string}`]: AriaValue;
}

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
}: StackProps) {
  const style: React.CSSProperties = { display };
  if (display === 'flex') {
    style.flexDirection = direction;
    if (wrap) style.flexWrap = 'wrap';
  }
  if (gap) style.gap = typeof gap === 'number' ? gap : (GAP_SCALE[gap] ?? 16);
  if (align) style.alignItems = align;
  if (justify) style.justifyContent = justify;
  return <Tag style={style} {...rest}>{children}</Tag>;
}

export interface PageProps {
  children?: React.ReactNode;
  key?: React.Key;
}

// Page-level container. Replaces <section className="page-stack">.
export function Page({ children }: PageProps) {
  return <section className="page-stack">{children}</section>;
}
