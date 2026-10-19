import React from 'react';
import { apiGet, apiPost, getErrorMessage } from '../api/client';
import type { JsonValue } from '../api/client';
import { Box, Button, ErrorMessage, Text, TextInput } from './ui';
type ReviewLesson = { topic_id: string; review_status: string; version: number; pack_json: JsonValue };
const states = ['draft','generated','factual_review','language_review','license_check','approved','published','revision_needed'];
export function CurriculumReview({ apiKey }: { apiKey: string }) {
  const [lessons,setLessons]=React.useState<ReviewLesson[]>([]);
  const [reviewer,setReviewer]=React.useState('');
  const [note,setNote]=React.useState('');
  const [error,setError]=React.useState('');
  const [busy,setBusy]=React.useState(false);
  async function load() {
    try { const data=await apiGet<{lessons:ReviewLesson[]}>('/api/content/v1/curriculum/review',null,{apiKey});setLessons(data.lessons);setError(''); }
    catch(error) {setError(getErrorMessage(error));}
  }
  React.useEffect(()=>{let current=true;setLessons([]);apiGet<{lessons:ReviewLesson[]}>('/api/content/v1/curriculum/review',null,{apiKey}).then(data=>{if(current) setLessons(data.lessons);}).catch(error=>{if(current) setError(getErrorMessage(error));});return()=>{current=false;};},[apiKey]);
  async function advance(lesson:ReviewLesson,state:string) {
    setBusy(true);setError('');
    try { await apiPost(`/api/content/v1/curriculum/${encodeURIComponent(lesson.topic_id)}/review`,{version:lesson.version,from:lesson.review_status,state,reviewer,note},null,{apiKey});setNote('');await load(); }
    catch(error) {setError(getErrorMessage(error));} finally {setBusy(false);}
  }
  return <Box>
    <Text as="h2">Curriculum editorial review</Text>
    <Text>Review the explanation, level fit, examples, answer keys, feedback, cultural context, duplicates and item licenses before advancing. Every approval records your identity and evidence for this version.</Text>
    <TextInput value={reviewer} aria-label="Reviewer name" placeholder="Reviewer name" onChange={event=>setReviewer(event.target.value)} />
    <TextInput value={note} aria-label="Review evidence" placeholder="What did you verify? Record evidence here." onChange={event=>setNote(event.target.value)} />
    {error && <ErrorMessage message={error}/>}
    {!lessons.length && <Text>No authored curriculum packs in this queue.</Text>}
    {lessons.map(lesson=>{
      const next=lesson.review_status==='revision_needed'?'generated':states[states.indexOf(lesson.review_status)+1];
      return <Box as="details" key={lesson.topic_id}>
        <Box as="summary">{lesson.topic_id} · {lesson.review_status} · v{lesson.version}</Box>
        <Box as="pre" className="curriculum-review-json">{JSON.stringify(lesson.pack_json,null,2)}</Box>
        {next && next!=='revision_needed' && <Button variant="primary" disabled={busy || !reviewer.trim() || !note.trim()} onClick={()=>advance(lesson,next)}>Complete review → {next.replaceAll('_',' ')}</Button>}
        {lesson.review_status!=='revision_needed' && <Button variant="text" disabled={busy || !reviewer.trim() || !note.trim()} onClick={()=>advance(lesson,'revision_needed')}>Needs revision</Button>}
      </Box>;
    })}
  </Box>;
}
