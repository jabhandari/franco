import React from 'react';

// Card container. Renders section.panel (+ .compact). layout="grid" switches
// the panel body to the grid treatment (section.panel-grid).
export function Panel({ compact = false, layout, as: Tag = 'section', children, ...rest }) {
  const classes = ['panel', compact ? 'compact' : '', layout === 'grid' ? 'panel-grid' : '']
    .filter(Boolean)
    .join(' ');
  return <Tag className={classes} {...rest}>{children}</Tag>;
}

// Heading row used at the top of panels: eyebrow + title on the left,
// optional trailing node (icon, chip, meta text) on the right.
export function PanelHeader({ eyebrow, title, aside = null }) {
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
