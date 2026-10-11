import React from 'react';

// Aria attribute values are caller-provided primitives by definition.
type AriaValue = string | number | boolean | undefined;

export interface PanelProps {
  compact?: boolean;
  layout?: 'grid';
  as?: React.ElementType;
  children?: React.ReactNode;
  key?: React.Key;
  // Extra props spread onto the tag, but only aria-* attributes are
  // part of the contract.
  [ariaProp: `aria-${string}`]: AriaValue;
}

// Card container. Renders section.panel (+ .compact). layout="grid" switches
// the panel body to the grid treatment (section.panel-grid).
export function Panel({ compact = false, layout, as: Tag = 'section', children, ...rest }: PanelProps) {
  const classes = ['panel', compact ? 'compact' : '', layout === 'grid' ? 'panel-grid' : '']
    .filter(Boolean)
    .join(' ');
  return <Tag className={classes} {...rest}>{children}</Tag>;
}

export interface PanelHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  aside?: React.ReactNode;
  key?: React.Key;
}

// Heading row used at the top of panels: eyebrow + title on the left,
// optional trailing node (icon, chip, meta text) on the right.
export function PanelHeader({ eyebrow, title, aside = null }: PanelHeaderProps) {
  return (
    <div className="panel-title">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {aside}
    </div>
  );
}
