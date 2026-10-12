import React from 'react';

export type ProgressRingProps = {
  percent?: number;
  size?: number;
  label?: string;
  key?: React.Key;
};

// FRA-47: SVG progress ring for the Learn level cards. Geometry is
// data-driven and owned by this component — callers pass a percent (0-100),
// never widths or dash arrays. The track/fill styling lives in styles.css.
export function ProgressRing({ percent = 0, size = 76, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (circumference * clamped) / 100;

  return (
    <div className="progress-ring" role="img" aria-label={label ?? `${clamped}% complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="ring-track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className="ring-fill"
          opacity={clamped === 0 ? 0 : 1}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <strong className="ring-label">{clamped}%</strong>
    </div>
  );
}
