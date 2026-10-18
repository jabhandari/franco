import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ProgressRing } from './ProgressRing';

export type SkillCardProps = {
  title: string;
  gloss: string;
  description: string;
  done: number;
  total: number;
  percent: number;
  loading?: boolean;
  icon?: LucideIcon;
  onStart?: () => void;
  key?: React.Key;
};

export function SkillCard({ title,gloss,description,done,total,percent,loading=false,onStart,icon: Icon }: SkillCardProps) {
  return (
    <section className={onStart ? 'skill-card skill-card-action' : 'skill-card'}>
      <div className="skill-card-heading"><div>{Icon && <span className="skill-card-icon"><Icon size={20} aria-hidden="true" /></span>}<h3>{title}</h3><span>{gloss}</span></div>
        {!loading && <ProgressRing percent={percent} size={64} label={`${gloss}: ${done} of ${total} done`} />}
      </div>
      <p>{description}</p>
      <small>{loading ? 'Progress loading…' : total ? `${done} of ${total} done` : 'No exercises yet'}</small>
      {onStart && !loading && total > 0 && <span className="skill-card-invitation" aria-hidden="true">Explore levels <span>↗</span></span>}
      {onStart && !loading && total > 0 && <button type="button" className="skill-card-start" onClick={onStart} aria-label={`Open ${gloss} practice`}><span className="visually-hidden">Open {gloss} practice</span></button>}
    </section>
  );
}
