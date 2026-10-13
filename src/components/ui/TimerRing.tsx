import React from 'react';

type TimerRingProps = {remaining:number;total?:number};
export function TimerRing({remaining,total=120}:TimerRingProps) {
  const radius=76,circumference=2*Math.PI*radius;
  const fraction=Math.max(0,Math.min(1,remaining/total));
  const label=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
  return <div className="conversation-timer" role="timer" aria-label={`${label} remaining`}>
    <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true"><circle className="timer-track" cx="85" cy="85" r={radius}/><circle className="timer-fill" cx="85" cy="85" r={radius} strokeDasharray={`${circumference*fraction} ${circumference}`} transform="rotate(-90 85 85)"/></svg>
    <div><strong>{label}</strong><small>Remaining</small></div>
  </div>;
}
