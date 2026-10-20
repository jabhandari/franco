import React from 'react';

export type ProgressRingProps = {
  percent?: number;
  size?: number;
  label?: string;
  animate?: boolean;
  key?: React.Key;
};

// FRA-47: SVG progress ring for the Learn level cards. Geometry is
// data-driven and owned by this component — callers pass a percent (0-100),
// never widths or dash arrays. The track/fill styling lives in styles.css.
// With `animate`, the ring sweeps from 0 to `percent` once on mount (FRA-176);
// otherwise it renders the final value immediately. Reduced-motion users
// always get the final value with no sweep.
export function ProgressRing({ percent = 0, size = 76, label, animate = false }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const [shown, setShown] = React.useState(animate ? 0 : clamped);
  const swept = React.useRef(false);
  React.useEffect(() => {
    if (!animate || swept.current) {
      setShown(clamped);
      return;
    }
    swept.current = true;
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(clamped);
      return;
    }
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(clamped * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, clamped]);
  const filled = (circumference * shown) / 100;

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
          opacity={shown === 0 ? 0 : 1}
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <strong className="ring-label">{shown}%</strong>
    </div>
  );
}
