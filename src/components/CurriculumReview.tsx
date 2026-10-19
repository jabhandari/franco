import React from 'react';
import { apiGet, apiPost, getErrorMessage } from '../api/client';
import type { JsonValue } from '../api/client';
import { Box, Button, ErrorMessage, Text, TextInput } from './ui';
type ReviewLesson = { topic_id: string; review_status: string; version: number; pack_json: JsonValue };
const states = ['draft','generated','factual_review','language_review','license_check','approved','published','revision_needed'];
const nextState = (status:string) => status==='revision_needed' ? 'generated' : states[states.indexOf(status)+1];
export function CurriculumReview({ apiKey }: { apiKey: string }) {
  const [lessons,setLessons]=React.useState<ReviewLesson[]>([]);
  const [selectedIds,setSelectedIds]=React.useState<Set<string>>(new Set());
  const [reviewer,setReviewer]=React.useState('');
  const [note,setNote]=React.useState('');
  const [error,setError]=React.useState('');
  const [busy,setBusy]=React.useState(false);
  const bulkLessons=lessons.filter(lesson=>selectedIds.has(lesson.topic_id));
  const sharedStatus=bulkLessons.length && bulkLessons.every(lesson=>lesson.review_status===bulkLessons[0].review_status) ? bulkLessons[0].review_status : '';
  const bulkStatus=sharedStatus || (selectedIds.size ? '' : lessons.find(lesson=>lesson.review_status!=='published')?.review_status) || '';
  const currentStageLessons=lessons.filter(lesson=>lesson.review_status===bulkStatus);
  const bulkNext=sharedStatus ? nextState(sharedStatus) : '';
  const allCurrentStageSelected=currentStageLessons.length>0 && currentStageLessons.every(lesson=>selectedIds.has(lesson.topic_id));
  async function load() {
    try { const data=await apiGet<{lessons:ReviewLesson[]}>('/api/content/v1/curriculum/review',null,{apiKey});setLessons(data.lessons);setError(''); }
    catch(error) {setError(getErrorMessage(error));}
  }
  React.useEffect(()=>{let current=true;setLessons([]);apiGet<{lessons:ReviewLesson[]}>('/api/content/v1/curriculum/review',null,{apiKey}).then(data=>{if(current) setLessons(data.lessons);}).catch(error=>{if(current) setError(getErrorMessage(error));});return()=>{current=false;};},[apiKey]);
  async function advance(lesson:ReviewLesson,state:string) {
    setBusy(true);setError('');
    try { await apiPost(`/api/content/v1/curriculum/${encodeURIComponent(lesson.topic_id)}/review`,{version:lesson.version,from:lesson.review_status,state,reviewer,note},null,{apiKey});setSelectedIds(new Set());setNote('');await load(); }
    catch(error) {setError(getErrorMessage(error));} finally {setBusy(false);}
  }
  async function advanceSelected() {
    if (!bulkNext || !reviewer.trim() || !note.trim()) return;
    setBusy(true);setError('');
    const remaining=new Set(selectedIds);
    let advanced=0;
    try {
      for (const lesson of bulkLessons) {
        const state=nextState(lesson.review_status);
        try {
          await apiPost(`/api/content/v1/curriculum/${encodeURIComponent(lesson.topic_id)}/review`,{version:lesson.version,from:lesson.review_status,state,reviewer,note},null,{apiKey});
          remaining.delete(lesson.topic_id);advanced++;
          setLessons(current=>current.map(row=>row.topic_id===lesson.topic_id?{...row,review_status:state}:row));
          setSelectedIds(new Set(remaining));
        } catch(error) {
          setError(`Advanced ${advanced} lesson${advanced===1?'':'s'}; stopped at ${lesson.topic_id}: ${getErrorMessage(error)}`);
          return;
        }
      }
      setNote('');
    } finally {setBusy(false);}
  }
  function toggleAllAtCurrentStage() {
    const atStage=lessons.filter(lesson=>lesson.review_status===bulkStatus);
    const alreadySelected=atStage.length>0 && atStage.every(lesson=>selectedIds.has(lesson.topic_id));
    setSelectedIds(current=>{
      const next=new Set(current);
      for(const lesson of atStage) alreadySelected?next.delete(lesson.topic_id):next.add(lesson.topic_id);
      return next;
    });
  }
  return <Box>
    <Text as="h2">Curriculum editorial review</Text>
    <Text>Review the explanation, level fit, examples, answer keys, feedback, cultural context, duplicates and item licenses before advancing. Every approval records your identity and evidence for this version.</Text>
    <TextInput value={reviewer} aria-label="Reviewer name" placeholder="Reviewer name" onChange={event=>setReviewer(event.target.value)} />
    <TextInput value={note} aria-label="Review evidence" placeholder="What did you verify? Record evidence here." onChange={event=>setNote(event.target.value)} />
    <Box className="curriculum-review-bulk">
      <Button variant="text" disabled={busy || !bulkStatus} onClick={toggleAllAtCurrentStage}>{allCurrentStageSelected?'Clear selection':`Select all ${bulkStatus.replaceAll('_',' ')} (${currentStageLessons.length})`}</Button>
      <Text>{selectedIds.size} selected{selectedIds.size>0 && ' · reviewer and evidence above apply to each selected lesson.'}</Text>
      {bulkLessons.length>0 && !bulkNext && <Text>Select lessons at the same review stage to advance them together.</Text>}
      {selectedIds.size>0 && <Button variant="primary" disabled={busy || !reviewer.trim() || !note.trim() || !bulkNext} onClick={advanceSelected}>Advance {selectedIds.size} selected → {bulkNext.replaceAll('_',' ')}</Button>}
    </Box>
    {error && <ErrorMessage message={error}/>}
    {!lessons.length && <Text>No authored curriculum packs in this queue.</Text>}
    {lessons.map(lesson=>{
      const next=nextState(lesson.review_status);
      return <Box as="details" key={lesson.topic_id}>
        <Box as="summary"><input type="checkbox" aria-label={`Select ${lesson.topic_id}`} checked={selectedIds.has(lesson.topic_id)} onClick={event=>event.stopPropagation()} onChange={event=>setSelectedIds(current=>{const next=new Set(current);event.target.checked?next.add(lesson.topic_id):next.delete(lesson.topic_id);return next;})} disabled={busy || lesson.review_status==='published' || Boolean(sharedStatus && lesson.review_status!==sharedStatus)} /> {lesson.topic_id} · {lesson.review_status} · v{lesson.version}</Box>
        <Box as="pre" className="curriculum-review-json">{JSON.stringify(lesson.pack_json,null,2)}</Box>
        {next && next!=='revision_needed' && <Button variant="primary" disabled={busy || !reviewer.trim() || !note.trim()} onClick={()=>advance(lesson,next)}>Complete review → {next.replaceAll('_',' ')}</Button>}
        {lesson.review_status!=='revision_needed' && <Button variant="text" disabled={busy || !reviewer.trim() || !note.trim()} onClick={()=>advance(lesson,'revision_needed')}>Needs revision</Button>}
      </Box>;
    })}
  </Box>;
}
