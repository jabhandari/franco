import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApiResource } from '../hooks/useApi';
import { usePracticeInventory } from '../hooks/usePracticeInventory';
import type { MeResponse } from '../api/client';
import type { SkillId, CefrLevel } from '../types';
import { skillCompletion } from '../presenters/progress.presenter';
import { CEFR_LEVELS, clbForCefr, formatLevelWithClb } from '../presenters/levels.presenter';
import { ExamQuestionList } from './PastQuestions';
import { ExerciseCard } from '../components/exercises/ExerciseCard';
import { Box, Text, Button, SkillCard, PracticeLevelCard, LoadingSpinner, ErrorMessage, AudioPlayer } from '../components/ui';

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
  function chooseSkill(next:SkillId) {setSkill(next);if(!chosen.current) {setLevel(CEFR_LEVELS.find(value=>value===ownLevel) || level);chosen.current=true;}setStep(2);}
  function start(next:CefrLevel) {setLevel(next);setStep(3);}
  function refresh() {setRevision(value=>value+1);}
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
      <Box className="practice-exercise-bar"><Text as="span">{inventory.loading ? 'Loading exercises…' : `${inventory.items.length+inventory.questions.length} question${inventory.items.length+inventory.questions.length===1 ? '' : 's'}`}</Text><Button variant="reset" disabled={inventory.loading} onClick={()=>setResetKey(value=>value+1)}>Reset all</Button></Box>
      {inventory.loading && <LoadingSpinner label="Loading the full exercise inventory…"/>}
      {inventory.error && <ErrorMessage message={inventory.error}/>}
      {!inventory.loading && !inventory.error && <Box key={resetKey} className="practice-exercises">
        {inventory.questions.length>0 && <ExamQuestionList token={token} onAttempt={refresh} data={{questions:inventory.questions,section:`${label?.gloss} · ${level}`}}/>}
        {inventory.items.map(item=><Box key={item.id}>{item.type==='listening' && <AudioPlayer src={item.media?.find(media=>media.kind==='audio')?.url} emptyText="Audio is unavailable for this question."/>}<ExerciseCard entry={item} token={token} onResult={refresh}/></Box>)}
        {!inventory.items.length && !inventory.questions.length && <Text variant="muted">No exercises yet</Text>}
      </Box>}
    </>}
  </Box>;
}
