import React from 'react';
import { Text } from './Text';

// Decorative typewriter line: reveals `text` one character at a time with a
// blinking caret. Renders the full text instantly when the user prefers
// reduced motion. The line reserves its height up front (see
// `.typewriter-text` in styles.css) so typing never shifts layout.
export type TypewriterTextProps = {
  text: string;
  speed?: number;
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TypewriterText({ text, speed = 45 }: TypewriterTextProps) {
  const [count, setCount] = React.useState(() => (prefersReducedMotion() ? text.length : 0));
  React.useEffect(() => {
    if (count >= text.length) return;
    const id = window.setTimeout(() => setCount((c) => Math.min(text.length, c + 1)), speed);
    return () => window.clearTimeout(id);
  }, [count, text, speed]);
  const done = count >= text.length;
  return (
    <Text as="p" className="typewriter-text" aria-label={text}>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {!done && <span className="typewriter-caret" aria-hidden="true" />}
      </span>
    </Text>
  );
}
