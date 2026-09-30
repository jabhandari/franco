import React from 'react';

// Pills and badges.
//   queue   -> .queue-kind .queue-kind-{kind}  (kind: review|new|weak|exam|drill)
//   stub    -> .stub-badge
//   timer   -> .timer-chip
//   roadmap -> .roadmap-badge
const QUEUE_LABELS = {
  review: 'Due review',
  new: 'New',
  weak: 'Weak point',
  exam: 'Exam practice',
  drill: 'Drill',
};

const VARIANT_CLASS = {
  queue: 'queue-kind',
  stub: 'stub-badge',
  timer: 'timer-chip',
  roadmap: 'roadmap-badge',
};

export function Badge({ variant = 'queue', kind, icon: Icon = null, iconSize = 14, children }) {
  const base = VARIANT_CLASS[variant] || VARIANT_CLASS.queue;
  const classes = variant === 'queue' && kind ? `${base} ${base}-${kind}` : base;
  const label = variant === 'queue' ? (QUEUE_LABELS[kind] || kind) : children;
  return (
    <span className={classes}>
      {Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

// Legacy alias for the queue-kind pill.
export function QueueKindLabel({ kind }) {
  return <Badge variant="queue" kind={kind} />;
}
