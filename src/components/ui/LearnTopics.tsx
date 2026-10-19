import React from 'react';
import { ArrowRight, BookOpen, Bookmark, Calendar, Check, ChevronDown, ChevronRight, ChevronUp, CircleUserRound, CircleMinus, Clock, Coffee, Copy, Flame, Heart, HelpCircle, ListOrdered, MapPin, MessageCircle, Palette, Tag, Users, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LearnTopicCard, CefrLevel } from '../../types';
const ICONS:Record<string,LucideIcon>={BookOpen,Bookmark,Calendar,CircleUserRound,CircleMinus,Clock,Coffee,Copy,Heart,HelpCircle,ListOrdered,MapPin,MessageCircle,Palette,Tag,Users,Zap};
export function LearnTopic({card,index,expanded,onToggle,onOpen}:{key?:React.Key;card:LearnTopicCard;index:number;expanded:boolean;onToggle:()=>void;onOpen:(id:string)=>void}) {
 const paint:React.CSSProperties & {'--topic-colour':string}={'--topic-colour':card.colour};
 const Icon=ICONS[card.icon] ?? BookOpen;const region=`subtopics-${card.topicId}`;
 return <article className="learn-topic" style={paint} id={`topic-${card.slug}`}>
  <button className="learn-topic-art" id={`toggle-${card.slug}`} type="button" aria-expanded={expanded} aria-controls={region} onClick={onToggle}>
   <span className="learn-topic-medallion"><Icon size={28}/></span><span className="learn-topic-heading"><small>TOPIC {index+1}</small><strong>{card.title}</strong></span><span className="learn-lesson-count">{card.subtopicCount} lessons</span><span className="learn-topic-description">{card.description}</span>
  </button>
  <div className="learn-topic-body"><div className="learn-topic-progress"><progress max={card.subtopicCount || 1} value={card.doneCount} aria-label={`${card.title} completion`}/><span>{card.state==='completed'?'All done':`${card.doneCount} of ${card.subtopicCount} done`}</span></div>
   {expanded && <div id={region} role="region" aria-label={`${card.title} lessons`}>{card.subtopics.map((s,i)=><button type="button" className="learn-subtopic" key={s.subtopicId} aria-label={`Open lesson: ${s.title}`} onClick={()=>onOpen(s.subtopicId)}><span className={`learn-subtopic-number ${s.state==='completed'?'is-done':''}`}>{s.state==='completed'?<Check size={19}/>:i+1}</span><strong>{s.title}</strong><span className={`learn-subtopic-state ${s.state}`}>{s.state==='completed'?'✓ Done':s.state==='in_progress'?'In progress':''}</span><ChevronRight size={18}/></button>)}</div>}
   <button className="learn-topic-toggle" tabIndex={-1} type="button" aria-expanded={expanded} aria-controls={region} onClick={onToggle}>{expanded?'Hide lessons':'See the lessons'}{expanded?<ChevronUp size={18}/>:<ChevronDown size={18}/>}</button>
  </div>
 </article>;
}
export function LearnLevelPills({levels,selected,onSelect}:{levels:{id:CefrLevel;clb:string;colour:string}[];selected:string;onSelect:(level:CefrLevel)=>void}) {return <div className="learn-topic-levels" role="group" aria-label="Lesson level">{levels.map(l=><button type="button" key={l.id} aria-pressed={selected===l.id} onClick={()=>onSelect(l.id)} style={{borderColor:selected===l.id?l.colour:undefined}}><span style={{background:l.colour}}>{l.id}</span><strong>{l.id}</strong> · {l.clb}</button>)}</div>;}
export function LearnJumpBack({title,onContinue}:{title:string;onContinue:()=>void}) {return <div className="learn-jump"><span className="learn-jump-icon"><Flame/></span><div><small>JUMP BACK IN</small><h2>{title}</h2><p>You started this one.</p></div><button type="button" className="primary-button" onClick={onContinue}>Continue <ArrowRight size={17}/></button></div>;}
export function LearnLessonBand({colour,crumb,title,topic}:{colour:string;crumb:string;title:string;topic:string}) {return <header className="learn-lesson-band" style={{background:`linear-gradient(115deg,${colour},color-mix(in srgb,${colour} 80%,#064e50))`}}><small>{crumb}</small><h1>{title}</h1><p>From the topic “{topic}”</p></header>;}
