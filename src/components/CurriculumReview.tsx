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
  const unpublishedLessons=lessons.filter(lesson=>lesson.review_status!=='published');
  const allUnpublishedSelected=unpublishedLessons.length>0 && unpublishedLessons.every(lesson=>selectedIds.has(lesson.topic_id));
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
  async function publishSelected() {
    if (!bulkLessons.length || !reviewer.trim() || !note.trim()) return;
    setBusy(true);setError('');
    try {
      await apiPost('/api/content/v1/curriculum/review/publish',{lessons:bulkLessons.map(({topic_id,version})=>({topic_id,version})),reviewer,note},null,{apiKey});
      setSelectedIds(new Set());setNote('');await load();
    } catch(error) {setError(getErrorMessage(error));} finally {setBusy(false);}
  }
  function toggleAllUnpublished() {
    setSelectedIds(current=>{
      const next=new Set(current);
      if (allUnpublishedSelected) for(const lesson of unpublishedLessons) next.delete(lesson.topic_id);
      else for(const lesson of unpublishedLessons) next.add(lesson.topic_id);
      return next;
    });
  }
  return <Box>
    <Text as="h2">Curriculum editorial review</Text>
    <Text>Review the explanation, level fit, examples, answer keys, feedback, cultural context, duplicates and item licenses before advancing. Every approval records your identity and evidence for this version.</Text>
    <TextInput value={reviewer} aria-label="Reviewer name" placeholder="Reviewer name" onChange={event=>setReviewer(event.target.value)} />
    <TextInput value={note} aria-label="Review evidence" placeholder="What did you verify? Record evidence here." onChange={event=>setNote(event.target.value)} />
    <Box className="curriculum-review-bulk">
      <Button variant="text" disabled={busy || !unpublishedLessons.length} onClick={toggleAllUnpublished}>{allUnpublishedSelected?'Clear selection':`Select all unpublished (${unpublishedLessons.length})`}</Button>
      <Text>{selectedIds.size} selected{selectedIds.size>0 && ' · reviewer and evidence above apply to every selected lesson.'}</Text>
      {selectedIds.size>0 && <Text>Autoapprove and publish validates each selected pack and publishes the whole selection together. It records a published event without creating staged review approvals.</Text>}
      {selectedIds.size>0 && <Button variant="primary" disabled={busy || !reviewer.trim() || !note.trim()} onClick={publishSelected}>Autoapprove and publish {selectedIds.size} selected</Button>}
    </Box>
    {error && <ErrorMessage message={error}/>}
    {!lessons.length && <Text>No authored curriculum packs in this queue.</Text>}
    {lessons.map(lesson=>{
      const next=nextState(lesson.review_status);
      return <Box as="details" key={lesson.topic_id}>
        <Box as="summary"><input type="checkbox" aria-label={`Select ${lesson.topic_id}`} checked={selectedIds.has(lesson.topic_id)} onClick={event=>event.stopPropagation()} onChange={event=>setSelectedIds(current=>{const next=new Set(current);event.target.checked?next.add(lesson.topic_id):next.delete(lesson.topic_id);return next;})} disabled={busy || lesson.review_status==='published'} /> {lesson.topic_id} · {lesson.review_status} · v{lesson.version}</Box>
        <Box as="pre" className="curriculum-review-json">{JSON.stringify(lesson.pack_json,null,2)}</Box>
        {next && next!=='revision_needed' && <Button variant="primary" disabled={busy || !reviewer.trim() || !note.trim()} onClick={()=>advance(lesson,next)}>Complete review → {next.replaceAll('_',' ')}</Button>}
        {lesson.review_status!=='revision_needed' && <Button variant="text" disabled={busy || !reviewer.trim() || !note.trim()} onClick={()=>advance(lesson,'revision_needed')}>Needs revision</Button>}
      </Box>;
    })}
  </Box>;
}
