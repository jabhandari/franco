import React from 'react';
import { Check, Circle } from 'lucide-react';
import type { RoadmapState } from '../../presenters/roadmap.presenter';

type RoadmapLesson = { slug: string; title: string; kind: string; stub: boolean; state: RoadmapState; percent: number; row: number; column: number };
type RoadmapProps = { lessons: RoadmapLesson[]; edges: [string,string][]; selected: string | null; onSelect: (slug: string) => void };

export function Roadmap({ lessons, edges, selected, onSelect }: RoadmapProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [shape,setShape] = React.useState<{width:number;height:number;paths:{d:string;complete:boolean}[]}>({width:0,height:0,paths:[]});
  React.useLayoutEffect(() => {
    const canvas=canvasRef.current;
    if (!canvas) return;
    function update() {
      if (!canvas) return;
      const base=canvas.getBoundingClientRect();
      const cards: HTMLElement[]=Array.from(canvas.querySelectorAll<HTMLElement>('[data-lesson]'));
      const points=new Map(cards.map(card => { const r=card.getBoundingClientRect();return [card.dataset.lesson,{x:r.left-base.left+r.width/2,top:r.top-base.top,bottom:r.bottom-base.top}]; }));
      const paths=edges.flatMap(([a,b]) => {
        const from=points.get(a),to=points.get(b);
        if (!from || !to) return [];
        const mid=(from.bottom+to.top)/2;
        return [{d:`M ${from.x} ${from.bottom} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.top}`,complete:lessons.find(lesson=>lesson.slug===a)?.state==='completed'}];
      });
      setShape({width:base.width,height:base.height,paths});
    }
    update();
    const observer=new ResizeObserver(update);observer.observe(canvas);
    return () => observer.disconnect();
  },[lessons,edges]);
  return <div className="learn-roadmap" ref={canvasRef}>
    {shape.width>0 && <svg className="learn-connectors" width={shape.width} height={shape.height} aria-hidden="true">{shape.paths.map((path,index)=><path key={index} d={path.d} className={path.complete ? 'complete' : ''}/>)}</svg>}
    {lessons.map((lesson,index) => <button type="button" key={lesson.slug} data-lesson={lesson.slug}
      className={`learn-node ${lesson.state}${lesson.stub ? ' stub' : ''}${selected===lesson.slug ? ' selected' : ''}`}
      style={{gridRow:lesson.row,gridColumn:`${lesson.column} / span 2`}}
      aria-label={`${index+1}. ${lesson.title}. ${lesson.stub ? 'In preparation' : lesson.state.replace('_',' ')}`}
      aria-haspopup="dialog" aria-expanded={selected===lesson.slug} onClick={()=>onSelect(lesson.slug)}>
      <span className="learn-node-number">{String(index+1).padStart(2,'0')}</span>
      <strong>{lesson.title}</strong><small>{lesson.kind}</small>
      <span className="learn-node-state">{lesson.state==='completed' ? <><Check size={14} aria-hidden="true"/> Completed</> : lesson.state==='in_progress' ? <><Circle size={12} aria-hidden="true"/> {lesson.percent}% · In progress</> : lesson.state==='not_started' ? 'Start →' : 'Progress unavailable'}</span>
      {lesson.stub && <span className="learn-node-preparation">In preparation</span>}
      <span className="learn-node-track" aria-hidden="true"><span style={{width:`${lesson.state==='completed' ? 100 : lesson.percent}%`}}/></span>
    </button>)}
  </div>;
}
