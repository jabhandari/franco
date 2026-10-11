import React from 'react';

// Structural primitive — the ONE non-semantic escape hatch in the library.
// Box exists to carry the app's existing styles.css hooks: it renders the
// tag given by `as` with a caller-supplied className, nothing else. Every
// other component owns its classes internally; Box (with Text and TextInput)
// is the only public API that accepts className.
//
// Rules: NO `style` prop, NO arbitrary props. Layout props (display,
// direction, gap, align, justify, wrap) map to an inline style owned by this
// component, computed ONLY when at least one is set — otherwise no style
// attribute is rendered at all. All visual layout in the app still comes
// from styles.css classes, so layout props are rarely needed.
//
// gap scale (same tokens as Stack — do not invent a second scale):
// xs=4, sm=8, md=16, lg=24, xl=32
const GAP_SCALE: Record<string, number> = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export type BoxGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface BoxProps {
  as?: React.ElementType;
  className?: string;
  display?: React.CSSProperties['display'];
  direction?: React.CSSProperties['flexDirection'];
  gap?: BoxGap;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
  wrap?: boolean;
  children?: React.ReactNode;
  id?: string;
  role?: string;
  title?: string;
  type?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
  onSubmit?: React.FormEventHandler;
  href?: string;
  target?: string;
  rel?: string;
  viewBox?: string;
  preserveAspectRatio?: string;
  d?: string;
  key?: React.Key;
  // Only aria-* attributes pass through from any extra props.
  [ariaProp: `aria-${string}`]: unknown;
}

export function Box({
  as: Tag = 'div',
  className,
  display,
  direction,
  gap,
  align,
  justify,
  wrap,
  children,
  id,
  role,
  title,
  type,
  disabled,
  onClick,
  onSubmit,
  href,
  target,
  rel,
  viewBox,
  preserveAspectRatio,
  d,
  ...rest
}: BoxProps) {
  // Explicit allowlist: only aria-* passes through from the rest props.
  // Anything else a caller sneaks in is dropped, never spread onto the DOM.
  const ariaProps: Record<string, unknown> = {};
  for (const key of Object.keys(rest)) {
    if (key.startsWith('aria-')) ariaProps[key] = rest[key];
  }

  let style: React.CSSProperties | undefined;
  if (display || direction || gap || align || justify || wrap) {
    style = {};
    const effectiveDisplay = display || (direction ? 'flex' : undefined);
    if (effectiveDisplay) style.display = effectiveDisplay;
    if (effectiveDisplay === 'flex') {
      if (direction) style.flexDirection = direction;
      if (wrap) style.flexWrap = 'wrap';
    }
    if (gap) style.gap = typeof gap === 'number' ? gap : (GAP_SCALE[gap] ?? 16);
    if (align) style.alignItems = align;
    if (justify) style.justifyContent = justify;
  }

  return (
    <Tag
      className={className}
      id={id}
      role={role}
      title={title}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onSubmit={onSubmit}
      href={href}
      target={target}
      rel={rel}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      d={d}
      style={style}
      {...ariaProps}
    >
      {children}
    </Tag>
  );
}
