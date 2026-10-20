import type { ContentConcept } from '../api/client';
import type { LearnRoute } from '../types';
import { CEFR_LEVELS } from './levels.presenter';
export function parseLearnRoute(search:string, concepts:ContentConcept[], currentLevel='A1'):LearnRoute {
 const q=new URLSearchParams(search);
 const requested=q.get('level');
 const level=CEFR_LEVELS.find(l=>l===requested) ?? CEFR_LEVELS.find(l=>l===currentLevel) ?? 'A1';
 const topic=concepts.find(c=>c.level_code===level && c.slug===(q.get('topic') ?? q.get('concept')));
 const subtopic=topic?.metadata.subtopics?.find(s=>s.subtopic_id===q.get('subtopic'));
 return {level,...(topic?{topic:topic.slug}:{}),...(subtopic?{subtopic:subtopic.subtopic_id}:{})};
}
export function learnUrl(route:LearnRoute):string { const q=new URLSearchParams({level:route.level});if(route.topic)q.set('topic',route.topic);if(route.subtopic)q.set('subtopic',route.subtopic);return `/learn?${q}`; }
export function legacyLearnUrl(search:string):string { const q=new URLSearchParams(search); const next=new URLSearchParams();if(q.has('level'))next.set('level',q.get('level')!);const topic=q.get('topic') ?? q.get('concept');if(topic)next.set('topic',topic);if(q.has('subtopic'))next.set('subtopic',q.get('subtopic')!);return `/learn${next.size?`?${next}`:''}`; }
