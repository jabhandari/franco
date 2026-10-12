import React from 'react';
import { LoaderCircle } from 'lucide-react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg';

const ICON_SIZE_PX: Record<LoadingSpinnerSize, number> = {
  sm: 18,
  md: 28,
  lg: 40,
};

type LoadingSpinnerProps = {
  /** Icon size. Defaults to 'md'. */
  size?: LoadingSpinnerSize;
  /** Visible status text under the spinner. When omitted, "Loading" is exposed to assistive tech only. */
  label?: string;
  /** Center the spinner in its container. Defaults to true. */
  centered?: boolean;
};

// Animated loading spinner with an accessible status role. Use this wherever
// the app waits on data — never a static "Loading…" string or an EmptyState
// box repurposed as a loader.
export function LoadingSpinner({ size = 'md', label, centered = true }: LoadingSpinnerProps) {
  return (
    <div
      className={`loading-spinner${centered ? ' loading-spinner--centered' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={label ? undefined : 'Loading'}
    >
      <LoaderCircle
        className={`loading-spinner__icon loading-spinner__icon--${size}`}
        size={ICON_SIZE_PX[size]}
        aria-hidden="true"
      />
      {label ? <p className="loading-spinner__label">{label}</p> : null}
    </div>
  );
}

// Full-screen loading splash (auth shell + card).
export function LoadingScreen() {
  return (
    <main className="auth-shell single">
      <section className="auth-card">
        <p className="eyebrow">Franco</p>
        <LoadingSpinner size="lg" label="Loading your account" />
        <p className="lede">Preparing your learning space.</p>
      </section>
    </main>
  );
}
