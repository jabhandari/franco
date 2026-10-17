import React from 'react';
import {Check,Flag,LockKeyhole,MapPin,SkipForward} from 'lucide-react';
import type {StoryStop} from '../../types';
import {storyStateLabel} from '../../presenters/stories.presenter';
export function StoryPath({stops,onSelect}:{stops:StoryStop[];onSelect:(id:string)=>void}) {
  return <ol className="story-path" aria-label="Story adventure path">{stops.map(stop=>{
    const Icon=stop.state==='completed'?Check:stop.state==='skipped'?SkipForward:stop.state==='locked'?LockKeyhole:MapPin;
    return <li className={`story-stop ${stop.state}`} key={stop.id}>
      <button type="button" className="story-stop-button" disabled={stop.state==='locked'} aria-label={`${stop.order_index}. ${stop.title}. ${storyStateLabel(stop)}`} aria-current={stop.state==='current'?'step':undefined} onClick={()=>onSelect(stop.id)}>
        <span className="story-stop-marker"><Icon size={22} aria-hidden="true"/></span>
        <span className="story-stop-copy"><small>{String(stop.order_index).padStart(2,'0')} · {stop.level}</small><strong>{stop.title}</strong><span>{stop.title_en}</span><small>{storyStateLabel(stop)}</small></span>
        {stop.order_index===stops.length && <Flag size={18} aria-label="Final story"/>}
      </button>
    </li>;
  })}</ol>;
}
