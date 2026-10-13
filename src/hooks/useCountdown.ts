import React from 'react';

export function useCountdown(seconds = 120) {
  const [remaining,setRemaining]=React.useState(seconds);
  const [phase,setPhase]=React.useState<'ready'|'speaking'|'paused'|'done'>('ready');
  const left=React.useRef(seconds*1000);
  const deadline=React.useRef(0);
  const phaseRef=React.useRef(phase);
  phaseRef.current=phase;
  React.useEffect(()=>{
    if(phase!=='speaking') return;
    function tick() {
      if(phaseRef.current!=='speaking') return;
      left.current=Math.max(0,deadline.current-performance.now());
      setRemaining(Math.ceil(left.current/1000));
      if(left.current===0) {phaseRef.current='done';setPhase('done');}
    }
    const interval=setInterval(tick,100);tick();return()=>clearInterval(interval);
  },[phase]);
  function start() {
    if(phase==='done' || phase==='speaking') return;
    deadline.current=performance.now()+left.current;phaseRef.current='speaking';setPhase('speaking');
  }
  function pause() {
    if(phase!=='speaking') return;
    left.current=Math.max(0,deadline.current-performance.now());setRemaining(Math.ceil(left.current/1000));
    phaseRef.current=left.current ? 'paused' : 'done';setPhase(phaseRef.current);
  }
  function reset() {left.current=seconds*1000;phaseRef.current='ready';setPhase('ready');setRemaining(seconds);}
  return {remaining,phase,start,pause,reset};
}
