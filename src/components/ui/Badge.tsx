import React from 'react';
import type { LucideIcon } from 'lucide-react';

// Pills and badges.
//   queue   -> .queue-kind .queue-kind-{kind}  (kind: review|new|weak|exam|drill)
//   stub    -> .stub-badge
//   timer   -> .timer-chip
//   roadmap -> .roadmap-badge
const QUEUE_LABELS: Record<string, string> = {
  review: 'Due review',
  new: 'New',
  weak: 'Weak point',
  exam: 'Exam practice',
  drill: 'Drill',
};

export type BadgeVariant = 'queue' | 'stub' | 'timer' | 'roadmap';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  queue: 'queue-kind',
  stub: 'stub-badge',
  timer: 'timer-chip',
  roadmap: 'roadmap-badge',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  kind?: string;
  icon?: LucideIcon | null;
  iconSize?: number;
  children?: React.ReactNode;
  key?: React.Key;
}

export function Badge({ variant = 'queue', kind, icon: Icon = null, iconSize = 14, children }: BadgeProps) {
  const base = VARIANT_CLASS[variant] || VARIANT_CLASS.queue;
  const classes = variant === 'queue' && kind ? `${base} ${base}-${kind}` : base;
  const label = variant === 'queue' ? (QUEUE_LABELS[kind ?? ''] || kind) : children;
  return (
    <span className={classes}>
      {Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

export interface QueueKindLabelProps {
  kind?: string;
  key?: React.Key;
}

// Legacy alias for the queue-kind pill.
export function QueueKindLabel({ kind }: QueueKindLabelProps) {
  return <Badge variant="queue" kind={kind} />;
}
