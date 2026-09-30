import React from 'react';

// Mastery/progress meter: div.skill-row > span + div.bar > div.fill + strong.
// The fill width is data-driven and owned by this component (the only
// dynamic width in the app); callers pass a percent, never a style.
export function ProgressBar({ label, percent = 0, skeleton = false }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`skill-row${skeleton ? ' skeleton-row' : ''}`}>
      <span>{label}</span>
      {skeleton ? (
        <div className="bar skeleton-bar" />
      ) : (
        <div className="bar">
          <div className="fill" style={{ width: `${clamped}%` }} />
        </div>
      )}
      <strong>{skeleton ? '--' : `${clamped}%`}</strong>
    </div>
  );
}

// Legacy alias for the loading-state meter row.
export function SkeletonBar({ label }) {
  return <ProgressBar label={label} skeleton />;
}
