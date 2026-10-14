import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApiResource } from '../hooks/useApi';
import { usePracticeInventory } from '../hooks/usePracticeInventory';
import type { MeResponse } from '../api/client';
import type { SkillId, CefrLevel } from '../types';
import { skillCompletion } from '../presenters/progress.presenter';
import { CEFR_LEVELS, clbForCefr, formatLevelWithClb } from '../presenters/levels.presenter';
import { ExamQuestionList } from './PastQuestions';
import { ExerciseCard, type ExerciseItem } from '../components/exercises/ExerciseCard';
import { Box, Text, Button, SkillCard, PracticeLevelCard, LoadingSpinner, ErrorMessage, AudioPlayer } from '../components/ui';

// Temporary probe (not real content): one Read aloud exercise rendered through
// the real transcription pipeline so the flow can be tested end to end.
// Uses a real speaking_prompt item id so /api/speech/transcribe accepts it;
// the displayed phrase is overridden client-side.
type ProbeEntry = ExerciseItem & { expected?: string };
const READ_ALOUD_PROBE: ProbeEntry = {
  id: 'it_orig_0007',
  item_kind: 'content_item',
  type: 'speaking_prompt',
  level: 'A1',
  prompt: 'TEST PROBE — read aloud',
  expected: 'Je parle français avec mes amis.',
};

type PracticeProps = {token?:string|null};
const SKILLS:{id:SkillId;title:string;gloss:string;description:string}[]=[
  {id:'lire',title:'Lire',gloss:'Reading',description:'Short texts, questions and everyday French.'},
  {id:'ecouter',title:'Écouter',gloss:'Listening',description:'Listen, understand and write what you hear.'},
  {id:'ecrire',title:'Écrire',gloss:'Writing',description:'Build sentences and write in your own words.'},
  {id:'parler',title:'Parler',gloss:'Speaking',description:'Say a phrase out loud and listen back.'},
];
const LEVEL_DESCRIPTIONS:Record<CefrLevel,string>={A1:'Everyday words and simple sentences.',A2:'Familiar situations, short stories and plans.',B1:'Experiences, opinions and connected ideas.',B2:'Detailed texts and confident explanations.',C1:'Complex ideas and flexible expression.',C2:'Nuance, precision and natural expression.'};
export function Practice({token}:PracticeProps) {
  const [step,setStep]=React.useState<1|2|3>(1);
  const [skill,setSkill]=React.useState<SkillId>('lire');
  const [level,setLevel]=React.useState<CefrLevel>('A1');
  const [revision,setRevision]=React.useState(0);
  const [resetKey,setResetKey]=React.useState(0);
  const chosen=React.useRef(false);
  const {data:learner,error:progressError}=useApiResource<MeResponse>(`/api/me?practice=${revision}`,token);
  const inventory=usePracticeInventory(skill,level,step===3,token);
  const label=SKILLS.find(row=>row.id===skill);
  const ownLevel=learner?.profile?.current_level;
  const firstPage=Math.max(0,Math.min(inventory.page-2,inventory.pageCount-5));
  const visiblePages=Array.from({length:Math.min(5,inventory.pageCount)},(_,index)=>firstPage+index);
  function chooseSkill(next:SkillId) {setSkill(next);if(!chosen.current) {setLevel(CEFR_LEVELS.find(value=>value===ownLevel) || level);chosen.current=true;}setStep(2);}
  function start(next:CefrLevel) {setLevel(next);setStep(3);}
  function refresh() {setRevision(value=>value+1);}
  function goPage(next:number) {void inventory.goToPage(next).then(()=>document.getElementById('practice-exercise-list')?.scrollIntoView({behavior:'smooth',block:'start'}));}
  return <Box as="section" className="practice-page">
    <Box className="practice-steps" role="group" aria-label="Practice steps">
      <Box as="button" type="button" aria-current={step===1 ? 'step' : undefined} onClick={()=>setStep(1)}>1 · Skill</Box>
      <Text as="span" aria-hidden="true">→</Text>
      <Box as="button" type="button" disabled={step===1} aria-current={step===2 ? 'step' : undefined} onClick={()=>setStep(2)}>2 · Level</Box>
      <Text as="span" aria-hidden="true">→</Text><Text as="span" aria-current={step===3 ? 'step' : undefined}>3 · Exercises</Text>
    </Box>
    {progressError && <ErrorMessage message={progressError}/>}
    {step===1 && <Box className="practice-skill-grid">{SKILLS.map(row=><SkillCard key={row.id} {...row} {...skillCompletion(learner?.skill_progress || [],row.id)} loading={!learner} onStart={()=>chooseSkill(row.id)}/>)}</Box>}
    {step===2 && <>
      <Box className="practice-bar"><Button variant="text" icon={ArrowLeft} onClick={()=>setStep(1)}>Skills</Button><Text as="h1">{label?.title} · {label?.gloss}</Text></Box>
      {!learner && !progressError && <LoadingSpinner label="Loading your levels…"/>}
      {learner && <Box className="practice-level-grid">{CEFR_LEVELS.map(value=><PracticeLevelCard key={value} level={value} clb={clbForCefr(value) || ''} description={LEVEL_DESCRIPTIONS[value]} {...skillCompletion(learner.skill_progress,skill,value)} selected={level===value} yourLevel={ownLevel===value} onStart={()=>start(value)}/>)}</Box>}
    </>}
    {step===3 && <>
      <Box className="practice-bar"><Button variant="text" icon={ArrowLeft} onClick={()=>setStep(2)}>Levels</Button><Text as="h1">{label?.title} · {formatLevelWithClb(level)}</Text></Box>
      <Box className="practice-exercise-bar"><Text as="span">{inventory.loading ? 'Loading exercises…' : `${inventory.total+inventory.questions.length} question${inventory.total+inventory.questions.length===1 ? '' : 's'}`}</Text><Button variant="reset" disabled={inventory.loading} onClick={()=>setResetKey(value=>value+1)}>Reset all</Button></Box>
      {inventory.loading && <LoadingSpinner label="Loading exercises…"/>}
      {inventory.error && <ErrorMessage message={inventory.error}/>}
      {!inventory.loading && !inventory.error && <Box id="practice-exercise-list" className="practice-exercises">
        {inventory.loadingPage ? <LoadingSpinner label="Loading this page…"/> : <Box key={resetKey} className="practice-exercises">
          {skill==='parler' && inventory.page===0 && <Box className="practice-test-probe">
            <Text as="h3">Test probe — Read aloud</Text>
            <Text variant="muted">Temporary probe for testing the read-aloud flow end to end (real recording, transcription and pronunciation hints). Not real content.</Text>
            <ExerciseCard entry={READ_ALOUD_PROBE} token={token} onResult={refresh}/>
          </Box>}
          {inventory.page===0 && inventory.questions.length>0 && <ExamQuestionList token={token} onAttempt={refresh} data={{questions:inventory.questions,section:`${label?.gloss} · ${level}`}}/>}
          {inventory.items.map(item=><Box key={item.id}>{item.type==='listening' && <AudioPlayer src={item.media?.find(media=>media.kind==='audio')?.url} emptyText="Audio is unavailable for this question."/>}<ExerciseCard entry={item} token={token} onResult={refresh}/></Box>)}
          {!inventory.items.length && !(inventory.page===0 && inventory.questions.length) && <Text variant="muted">No exercises yet</Text>}
        </Box>}
        {inventory.pageError && <ErrorMessage message={inventory.pageError}/>}
        {inventory.pageCount>1 && <Box className="practice-pagination" role="navigation" aria-label="Exercise pages">
          <Button variant="text" disabled={inventory.page===0 || inventory.loadingPage} onClick={()=>goPage(inventory.page-1)}>Previous</Button>
          {visiblePages.map(page=><Box as="button" type="button" key={page} aria-current={inventory.page===page ? 'page' : undefined} disabled={inventory.loadingPage} onClick={()=>goPage(page)}>{page+1}</Box>)}
          <Button variant="text" disabled={inventory.page===inventory.pageCount-1 || inventory.loadingPage} onClick={()=>goPage(inventory.page+1)}>Next</Button>
          <Text as="span" variant="muted">Page {inventory.page+1} of {inventory.pageCount}</Text>
        </Box>}
      </Box>}
    </>}
  </Box>;
}
