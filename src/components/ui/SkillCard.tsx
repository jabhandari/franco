import React from 'react';
import { ProgressRing } from './ProgressRing';

export type SkillCardProps = {
  title: string;
  gloss: string;
  description: string;
  done: number;
  total: number;
  percent: number;
  loading?: boolean;
  onStart?: () => void;
  key?: React.Key;
};

export function SkillCard({ title,gloss,description,done,total,percent,loading=false,onStart }: SkillCardProps) {
  return (
    <section className="skill-card">
      <div className="skill-card-heading"><div><h3>{title}</h3><span>{gloss}</span></div>
        {!loading && <ProgressRing percent={percent} size={52} label={`${gloss}: ${done} of ${total} done`} />}
      </div>
      <p>{description}</p>
      <small>{loading ? 'Progress loading…' : total ? `${done} of ${total} done` : 'No exercises yet'}</small>
      {onStart && <button type="button" className="text-button" onClick={onStart} disabled={loading || !total}>Start →</button>}
    </section>
  );
}
