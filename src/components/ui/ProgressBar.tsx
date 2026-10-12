import React from 'react';

export type ProgressBarProps = {
  label?: React.ReactNode;
  percent?: number;
  skeleton?: boolean;
  key?: React.Key;
};

// Mastery/progress meter: div.skill-row > span + div.bar > div.fill + strong.
// The fill width is data-driven and owned by this component (the only
// dynamic width in the app); callers pass a percent, never a style.
export function ProgressBar({ label, percent = 0, skeleton = false }: ProgressBarProps) {
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

export type SkeletonBarProps = {
  label?: React.ReactNode;
  key?: React.Key;
};

// Legacy alias for the loading-state meter row.
export function SkeletonBar({ label }: SkeletonBarProps) {
  return <ProgressBar label={label} skeleton />;
}
