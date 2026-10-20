import React from 'react';
import { Text } from './Text';

// Decorative typewriter: reveals `text` one character at a time, starting
// after `startDelayMs`. Renders the full text instantly when the user prefers
// reduced motion. The aria-label carries the full text so screen readers
// announce it once; the animated characters are hidden from them.
export type TypewriterTextProps = {
  text: string;
  startDelayMs?: number;
  charMs?: number;
  className?: string;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TypewriterText({ text, startDelayMs = 500, charMs = 110, className }: TypewriterTextProps) {
  const [count, setCount] = React.useState(() => (prefersReducedMotion() ? text.length : 0));
  React.useEffect(() => {
    if (count >= text.length) return;
    const delay = count === 0 ? startDelayMs : charMs;
    const id = window.setTimeout(() => setCount((c) => Math.min(text.length, c + 1)), delay);
    return () => window.clearTimeout(id);
  }, [count, text, startDelayMs, charMs]);
  return (
    <Text as="span" className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
    </Text>
  );
}
