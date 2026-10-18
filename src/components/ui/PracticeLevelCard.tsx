import React from 'react';
import { ProgressRing } from './ProgressRing';

type PracticeLevelCardProps = {key?:React.Key;level:string;clb:string;description:string;done:number;total:number;percent:number;selected:boolean;yourLevel:boolean;onStart:()=>void};
export function PracticeLevelCard({level,clb,description,done,total,percent,selected,yourLevel,onStart}:PracticeLevelCardProps) {
  return <section className={`practice-level-card${selected ? ' selected' : ''}`}>
    <button type="button" className="practice-level-action" disabled={!total} onClick={onStart} aria-label={`Start ${level} exercises`}>
      {yourLevel && <span className="practice-your-level">Your level</span>}
      <span className="practice-level-heading"><strong>{level}</strong><small>CLB {clb}</small></span>
      <ProgressRing size={64} percent={percent} label={`${level}: ${done} of ${total} done`}/>
      <span className="practice-level-description">{description}</span>
      <small>{total ? `${done} of ${total} done` : 'No exercises yet'}</small>
      <span className="practice-level-start">{total ? 'Start →' : 'No exercises yet'}</span>
    </button>
  </section>;
}
