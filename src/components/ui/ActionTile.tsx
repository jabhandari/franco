import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

export type ActionTileProps = {
  icon: LucideIcon;
  tone: 'teal' | 'coral' | 'amber' | 'sky' | 'violet';
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  onClick: () => void;
};

export function ActionTile({ icon: Icon, tone, eyebrow, title, description, meta, onClick }: ActionTileProps) {
  return <button type="button" className={`action-tile action-tile-${tone}`} onClick={onClick}>
    <span className="action-tile-top"><span className="action-tile-icon"><Icon size={23} strokeWidth={2.1} aria-hidden="true" /></span><ArrowUpRight size={20} aria-hidden="true" /></span>
    <span className="action-tile-copy"><span className="action-tile-eyebrow">{eyebrow}</span><strong>{title}</strong><span className="action-tile-description">{description}</span></span>
    {meta && <span className="action-tile-meta">{meta}</span>}
  </button>;
}
