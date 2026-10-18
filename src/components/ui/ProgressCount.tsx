import React from 'react';
import { Check } from 'lucide-react';

export type ProgressCountProps = { done: number; total: number };

// A completed count stays meaningful when a large catalog rounds progress to 0%.
export function ProgressCount({ done, total }: ProgressCountProps) {
  return <span className="practice-progress-count" aria-label={`${done} of ${total} exercises complete`}>
    <Check size={15} aria-hidden="true" />
    <strong>{done.toLocaleString()}</strong>
    <span>done</span>
  </span>;
}
