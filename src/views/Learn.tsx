import React from 'react';
import { ArrowLeft, Check, CheckCircle2 } from 'lucide-react';
import { useApiResource } from '../hooks/useApi';
import { getLearnProgress, saveLearnProgress } from '../api/client';
import type { ContentConcept, ContentConceptsResponse } from '../api/client';
import type { LearnProgressRow, LearnRoute, LearnTopicCard } from '../types';
import { topicCards, jumpBackIn, learnLevels } from '../presenters/learn.presenter';
import { parseLearnRoute, learnUrl } from '../presenters/learn-route.presenter';
import { CurriculumLesson } from '../components/CurriculumLesson';
import { Box, Text, Button, ErrorMessage, LoadingSpinner, ProgressBar, LearnTopic, LearnLevelPills, LearnJumpBack, LearnLessonBand } from '../components/ui';

type Props={token:string|null;currentLevel?:string;onPractice:(level:string)=>void};
export function Learn({token,currentLevel='A1',onPractice}:Props) {
 const {data,loading,error}=useApiResource<ContentConceptsResponse>('/api/content/v1/concepts',token);
 const [search,setSearch]=React.useState(window.location.search);
 const [rows,setRows]=React.useState<LearnProgressRow[]>([]);
 const [revision,setRevision]=React.useState(0);
 const concepts=data?.concepts ?? [];
 const route=parseLearnRoute(search,concepts,currentLevel);
 const cards=topicCards(concepts,rows,route.level);
 const jump=jumpBackIn(cards,rows);
 const selected=cards.find(c=>c.slug===route.topic);
 const concept=concepts.find(c=>c.slug===route.topic);
 const previous=React.useRef<LearnRoute|null>(null);
 React.useEffect(()=>{const pop=()=>setSearch(window.location.search);window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
 React.useEffect(()=>{
  if(!data) return;
  const url=learnUrl(route);
  if(window.location.pathname+window.location.search!==url){window.history.replaceState(window.history.state,'',url);setSearch(window.location.search);}
 },[data,route.level,route.topic,route.subtopic]);
 React.useEffect(()=>{
  let active=true;setRows([]);
  if(token) void getLearnProgress(route.level,token).then(r=>{if(active)setRows(r.subtopics);}).catch(()=>{});
  return()=>{active=false;};
 },[token,route.level,route.subtopic,revision]);
 React.useEffect(()=>{
  if(!data) return;
  const old=previous.current;
  if(route.subtopic) window.scrollTo(0,0);
  else if(route.topic) document.getElementById(`topic-${route.topic}`)?.scrollIntoView({block:'nearest'});
  else if(old?.topic) document.getElementById(`toggle-${old.topic}`)?.focus();
  previous.current=route;
 },[data,route.level,route.topic,route.subtopic]);
 function navigate(next:LearnRoute) {
  const url=learnUrl(next);
  if(url===window.location.pathname+window.location.search)return;
  const listUrl=learnUrl({...next,subtopic:undefined});
  if(next.subtopic && window.location.pathname+window.location.search!==listUrl) window.history.pushState({},'',listUrl);
  window.history.pushState(next.subtopic?{learnReturn:learnUrl({...next,subtopic:undefined})}:{},'',url);
  setSearch(window.location.search);
 }
 function back() {
  const fallback=learnUrl({level:route.level,topic:route.topic});
  if(window.history.state?.learnReturn===fallback) window.history.back();
  else navigate({level:route.level,topic:route.topic});
 }
 if(loading) return <LoadingSpinner label="Loading topics…"/>;
 if(error) return <ErrorMessage message={error}/>;
 if(route.subtopic && selected && concept) return <LearnLesson key={`${token}:${route.subtopic}`} token={token} card={selected} concept={concept} subtopicId={route.subtopic} rows={rows} toneIndex={Math.max(0,cards.findIndex(c=>c.slug===route.topic))} onBack={back} onPractice={onPractice} onSaved={()=>setRevision(r=>r+1)} onSelectSubtopic={subtopic=>navigate({level:route.level,topic:selected.slug,subtopic})}/>;
 return <Box as="section" className="learn-topics-page">
  <Box className="learn-topics-heading"><Text as="h1">Learn</Text><Text>Pick a topic, open it up, and learn one small idea at a time. Everything is open — start wherever looks fun.</Text></Box>
  <LearnLevelPills levels={learnLevels()} selected={route.level} onSelect={level=>navigate({level})}/>
  {jump && <LearnJumpBack title={`${jump.topicTitle} — ${jump.subtopicTitle}`} onContinue={()=>navigate({level:route.level,topic:jump.slug,subtopic:jump.subtopicId})}/>}
  <Box className="learn-topics-grid">{cards.map((card,index)=><LearnTopic key={card.slug} card={card} index={index} expanded={route.topic===card.slug} onToggle={()=>navigate({level:route.level,...(route.topic!==card.slug?{topic:card.slug}:{})})} onOpen={subtopic=>navigate({level:route.level,topic:card.slug,subtopic})}/>)}</Box>
  {!cards.length && <Text>No topics at {route.level} yet — check back soon.</Text>}
 </Box>;
}
function LearnLesson({token,card,concept,subtopicId,rows,toneIndex,onBack,onPractice,onSaved,onSelectSubtopic}:{key?:React.Key;token:string|null;card:LearnTopicCard;concept:ContentConcept;subtopicId:string;rows:LearnProgressRow[];toneIndex:number;onBack:()=>void;onPractice:(level:string)=>void;onSaved:()=>void;onSelectSubtopic:(subtopicId:string)=>void}) {
 const lesson=concept.metadata.lesson?.subtopic_lessons?.[subtopicId];
 const published=!concept.metadata.stub && concept.metadata.review_status==='published' && lesson?.review_status==='published';
 const subtopic=card.subtopics.find(s=>s.subtopicId===subtopicId);
 const saved=rows.some(r=>r.topic_id===card.topicId && r.subtopic_id===subtopicId && r.status==='completed');
 const [completed,setCompleted]=React.useState(saved);
 const [progress,setProgress]=React.useState({done:0,total:0});
 const reportProgress=React.useCallback((done:number,total:number)=>setProgress({done,total}),[]);
 const opened=React.useRef(false);const finished=React.useRef(false);
 React.useEffect(()=>{if(saved)setCompleted(true);},[saved]);
 React.useEffect(()=>{
  if(!published || !token || opened.current)return;
  opened.current=true;
  if(saved)return;
  void getLearnProgress(concept.level_code || 'A1',token).then(progress=>{
   if(progress.subtopics.some(r=>r.topic_id===card.topicId && r.subtopic_id===subtopicId && r.status==='completed')){setCompleted(true);return;}
   return saveLearnProgress({topic_id:card.topicId,subtopic_id:subtopicId,status:'in_progress'},token);
  }).catch(()=>{});
 },[published,token,saved,card.topicId,subtopicId,concept.level_code]);
 const complete=React.useCallback(()=>{
  if(!published || !token || completed || finished.current)return;
  finished.current=true;
  void saveLearnProgress({topic_id:card.topicId,subtopic_id:subtopicId,status:'completed'},token).then(()=>{setCompleted(true);onSaved();}).catch(()=>{finished.current=false;});
 },[published,token,completed,card.topicId,subtopicId,onSaved]);
 const level=concept.level_code || 'A1';const clb=learnLevels().find(l=>l.id===level)?.clb;
 return <Box as="section" className={`learn-lesson-page topic-tone-${toneIndex}`}><Button variant="text" icon={ArrowLeft} onClick={onBack}>Back to {level} topics</Button>
  <Box className="learn-lesson-stepper" role="group" aria-label="Lessons in this topic">{card.subtopics.map(s=><Box as="button" type="button" key={s.subtopicId} className={`learn-step-pill${s.subtopicId===subtopicId?' is-current':s.state==='completed'?' is-done':''}`} aria-current={s.subtopicId===subtopicId?'step':undefined} onClick={()=>onSelectSubtopic(s.subtopicId)}>{s.state==='completed' && s.subtopicId!==subtopicId && <Check size={14}/>}{s.title}</Box>)}</Box>
  <LearnLessonBand colour={card.colour} crumb={`${level} · ${clb} · Lesson ${card.subtopics.findIndex(s=>s.subtopicId===subtopicId)+1} of ${card.subtopicCount}`} title={subtopic?.title ?? card.title} topic={card.title}/>
  {published && lesson?<><Box className="learn-lesson-progress"><ProgressBar label="Lesson progress" percent={progress.total?progress.done/progress.total*100:0}/></Box><CurriculumLesson lesson={lesson} onComplete={complete} onProgress={reportProgress}/><Box className="learn-lesson-footer">{completed && <Box className="learn-lesson-complete"><Text as="strong"><CheckCircle2 size={18}/> Lesson complete</Text><Text>This one counts toward your {level} progress.</Text><Box as="span" className="learn-lesson-chip">We’ll bring this back in {lesson.review_due_policy.initial_days} {lesson.review_due_policy.initial_days===1?'day':'days'} to keep it fresh.</Box></Box>}<Button variant="primary" onClick={()=>onPractice(level)}>{completed?'Practice again':'Practice this concept'}</Button></Box></>:<Text>In preparation. This lesson is being reviewed; explore any other topic freely.</Text>}
 </Box>;
}
