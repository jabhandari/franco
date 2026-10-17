import React from 'react';
import {Check,Flag,MapPin} from 'lucide-react';
import type {StoryStop} from '../../types';
import {storyStateLabel} from '../../presenters/stories.presenter';
export function StoryPath({stops,onSelect}:{stops:StoryStop[];onSelect:(id:string)=>void}) {
  return <ol className="story-path" aria-label="Story adventure path">{stops.map(stop=>{
    const Icon=stop.state==='completed'?Check:MapPin;
    return <li className={`story-stop ${stop.state}`} key={stop.id}>
      <button type="button" className="story-stop-button" aria-label={`${stop.order_index}. ${stop.title}. ${storyStateLabel(stop)}`} onClick={()=>onSelect(stop.id)}>
        <span className="story-stop-marker"><Icon size={22} aria-hidden="true"/></span>
        <span className="story-stop-copy"><small>{String(stop.order_index).padStart(2,'0')} · {stop.level}</small><strong>{stop.title}</strong><span>{stop.title_en}</span><small>{storyStateLabel(stop)}</small></span>
        {stop.order_index===stops.length && <Flag size={18} aria-label="Final story"/>}
      </button>
    </li>;
  })}</ol>;
}
