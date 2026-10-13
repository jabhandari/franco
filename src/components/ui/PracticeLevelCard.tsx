import React from 'react';
import { ProgressRing } from './ProgressRing';

type PracticeLevelCardProps = {key?:React.Key;level:string;clb:string;description:string;done:number;total:number;percent:number;selected:boolean;yourLevel:boolean;onSelect:()=>void;onStart:()=>void};
export function PracticeLevelCard({level,clb,description,done,total,percent,selected,yourLevel,onSelect,onStart}:PracticeLevelCardProps) {
  return <section className={`practice-level-card${selected ? ' selected' : ''}`}>
    {yourLevel && <span className="practice-your-level">Your level</span>}
    <button type="button" className="practice-level-select" aria-pressed={selected} aria-label={`Choose ${level}`} onClick={onSelect}>
      <span><strong>{level}</strong><small>CLB {clb}</small></span><ProgressRing size={54} percent={percent} label={`${level}: ${done} of ${total} done`}/>
      <p>{description}</p><small>{total ? `${done} of ${total} done` : 'No exercises yet'}</small>
    </button>
    <button type="button" className="text-button" disabled={!total} onClick={onStart} aria-label={`Start ${level} exercises`}>{total ? 'Start →' : 'No exercises yet'}</button>
  </section>;
}
