import React from 'react';
import { useApiResource } from '../hooks/useApi';
import { saveLessonBookmark } from '../api/client';
import type { ContentConcept, ContentConceptsResponse, MeResponse } from '../api/client';
import type { LessonSection } from '../types';
import { CEFR_LEVELS } from '../presenters/levels.presenter';
import { lessonState, roadmapPositions } from '../presenters/roadmap.presenter';
import { ConceptDetail } from '../components/concepts';
import { Box, Text, Button, ErrorMessage, LoadingSpinner, Modal, Roadmap } from '../components/ui';

type ContentProps = {token?:string|null;onPractice:(level:string)=>void};

export function Content({token,onPractice}:ContentProps) {
  const params=new URLSearchParams(window.location.search);
  const [level,setLevel]=React.useState(()=>CEFR_LEVELS.find(value=>value===params.get('level')) || 'A1');
  const [activeSlug,setActiveSlug]=React.useState<string|null>(()=>params.get('concept'));
  const [bookmarkError,setBookmarkError]=React.useState('');
  const {data,loading,error}=useApiResource<ContentConceptsResponse>('/api/content/v1/concepts',token);
  const [progressRevision,setProgressRevision]=React.useState(0);
  const [learner,setLearner]=React.useState<MeResponse|null>(null);
  const {data:progressData,error:progressError}=useApiResource<MeResponse>(`/api/me?roadmap=${progressRevision}`,token);
  React.useEffect(()=>{if(progressData) setLearner(progressData);else if(progressError) setLearner(null);},[progressData,progressError]);
  const concepts=data?.concepts || [];
  const nodes=React.useMemo(()=>concepts.filter(concept=>concept.level_code===level),[concepts,level]);
  const positions=React.useMemo(()=>roadmapPositions(nodes),[nodes]);
  const lessons=React.useMemo(()=>nodes.map(concept=>({slug:concept.slug,title:concept.title,kind:concept.concept_type,stub:concept.metadata.stub,
    state:lessonState(concept,learner?.progress || null),percent:Math.round((learner?.progress.find(row=>row.slug===concept.slug)?.mastery || 0)*100),
    row:positions.get(concept.slug)?.row || 1,column:positions.get(concept.slug)?.column || 1})),[nodes,learner,positions]);
  const edges=React.useMemo<[string,string][]>(()=>nodes.flatMap(concept=>concept.prerequisites.filter(slug=>nodes.some(parent=>parent.slug===slug)).map(slug=>[slug,concept.slug])),[nodes]);
  const active=nodes.find(concept=>concept.slug===activeSlug);
  const sections:LessonSection[]=['overview','theory','vocabulary','examples'];
  const resumeSection=sections.find(section=>section===params.get('section')) || 'overview';
  const dialogRef=React.useRef<HTMLDivElement>(null);

  React.useEffect(()=>{
    if(!active) return;
    const previous=document.activeElement;
    const dialog=dialogRef.current;
    dialog?.querySelector<HTMLElement>('button')?.focus();
    function outside(event:MouseEvent) {
      if(event.target instanceof Node && !dialogRef.current?.contains(event.target) && !document.querySelector('.learn-roadmap')?.contains(event.target)) setActiveSlug(null);
    }
    function trapFocus(event:KeyboardEvent) {
      if(event.key!=='Tab') return;
      const controls:HTMLElement[]=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,[tabindex="0"]') || []);
      const first=controls[0],last=controls[controls.length-1];
      if(!first || !last) return;
      if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
    }
    document.addEventListener('click',outside);
    document.addEventListener('keydown',trapFocus);
    return()=>{document.removeEventListener('click',outside);document.removeEventListener('keydown',trapFocus);if(previous instanceof HTMLElement) previous.focus();};
  },[active?.slug,Boolean(learner),progressError]);
  function recordSection(section:LessonSection) {
    if(!token || !active || active.metadata.stub) return;
    saveLessonBookmark(active.slug,section,token).then(()=>{setBookmarkError('');setProgressRevision(value=>value+1);}).catch(()=>setBookmarkError('Your reading position could not be saved.'));
  }
  function selectLevel(next:typeof level) {setLevel(next);setActiveSlug(null);window.history.replaceState({},'',`${window.location.pathname}?level=${next}`);}
  function detail(concept:ContentConcept) {
    return {id:concept.slug,title:concept.title,category:concept.concept_type,level:concept.level_code || level,shortDescription:concept.description || '',theory:concept.metadata.theory || [],vocabulary:concept.metadata.vocabulary || [],examples:concept.metadata.examples || [],sources:concept.metadata.sources || [],stub:Boolean(concept.metadata.stub)};
  }
  return <Box as="section" className="learn-roadmap-page">
    <Box className="learn-level-bar">
      <Box role="group" aria-label="Lesson level" className="learn-level-pills">{CEFR_LEVELS.map(value=><Box as="button" type="button" key={value} aria-pressed={level===value} onClick={()=>selectLevel(value)}>{value}</Box>)}</Box>
      <Text as="span">{loading ? 'Loading…' : `${nodes.length} concepts`}</Text>
    </Box>
    {loading && <LoadingSpinner label="Loading lessons…"/>}
    {error && <ErrorMessage message={error}/>}
    {progressError && <ErrorMessage message="Couldn't load your progress. You can still open and practice lessons."/>}
    {bookmarkError && <ErrorMessage message={bookmarkError}/>}
    {!loading && !error && !learner && !progressError && <LoadingSpinner label="Loading your learning progress…"/>}
    {!loading && !error && <Box>
      <Roadmap lessons={lessons} edges={edges} selected={activeSlug} onSelect={slug=>setActiveSlug(activeSlug===slug ? null : slug)}/>
      {!nodes.length && <Text variant="muted">No lessons are available at this level yet.</Text>}
    </Box>}
    {active && <Modal ref={dialogRef} key={active.slug} closeLabel="Close lesson" onClose={()=>setActiveSlug(null)} resumeSection={resumeSection} onReadingSectionChange={recordSection}>
      <ConceptDetail concept={detail(active)}/>
      <Button variant="primary" disabled={Boolean(active.metadata.stub)} onClick={()=>onPractice(level)}>Practice this lesson</Button>
      {active.metadata.stub ? <Text variant="muted">In preparation — practice will be available when this lesson is ready.</Text> : <Text variant="muted">Practice currently starts a session at {level}, covering the whole level.</Text>}
    </Modal>}
  </Box>;
}
