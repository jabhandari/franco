import React from 'react';
import { ArrowLeft, BookOpen, Headphones, Mic2, PenLine, Sparkles, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
const SKILLS:{id:SkillId;title:string;gloss:string;description:string;icon:LucideIcon}[]=[
  {id:'lire',title:'Lire',gloss:'Reading',description:'Find meaning in stories, conversations and everyday French.',icon:BookOpen},
  {id:'ecouter',title:'Écouter',gloss:'Listening',description:'Tune your ear to real words, voices and sounds.',icon:Headphones},
  {id:'ecrire',title:'Écrire',gloss:'Writing',description:'Turn what you know into sentences of your own.',icon:PenLine},
  {id:'parler',title:'Parler',gloss:'Speaking',description:'Find your voice and practise saying it aloud.',icon:Mic2},
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
    <Box className="practice-hero">
      <Box className="practice-hero-copy">
        <Text className="practice-hero-kicker"><Sparkles size={15} aria-hidden="true" /> YOUR PRACTICE SPACE</Text>
        <Text as="h1">{step===1 ? <>Make it <Text as="em">yours.</Text></> : step===2 ? <>Choose your <Text as="em">pace.</Text></> : <>Keep your <Text as="em">momentum.</Text></>}</Text>
        <Text>{step===1 ? 'A little French, every day. Pick a skill and make the next word yours.' : step===2 ? `Find the ${label?.gloss.toLowerCase()} exercises that feel right for you today.` : `Your ${label?.gloss.toLowerCase()} practice at ${level}. Take one question at a time.`}</Text>
      </Box>
      <Box className="practice-hero-art" aria-hidden="true"><Box className="practice-hero-orbit orbit-one"/><Box className="practice-hero-orbit orbit-two"/><Box className="practice-hero-center"><Target size={48}/></Box><Box className="practice-hero-tile tile-one">Aa</Box><Box className="practice-hero-tile tile-two"><Headphones size={28}/></Box><Box className="practice-hero-tile tile-three">✓</Box></Box>
    </Box>
    <Box className="practice-steps" role="group" aria-label="Practice steps">
      <Box as="button" type="button" aria-current={step===1 ? 'step' : undefined} onClick={()=>setStep(1)}>1 · Skill</Box>
      <Text as="span" aria-hidden="true">→</Text>
      <Box as="button" type="button" disabled={step===1} aria-current={step===2 ? 'step' : undefined} onClick={()=>setStep(2)}>2 · Level</Box>
      <Text as="span" aria-hidden="true">→</Text><Text as="span" aria-current={step===3 ? 'step' : undefined}>3 · Exercises</Text>
    </Box>
    {progressError && <ErrorMessage message={progressError}/>}
    {step===1 && <><Box className="practice-section-heading"><Text as="h2">What would you like to work on?</Text><Text>Choose a skill to see your levels.</Text></Box><Box className="practice-skill-grid">{SKILLS.map(row=><SkillCard key={row.id} {...row} {...skillCompletion(learner?.skill_progress || [],row.id)} loading={!learner} onStart={()=>chooseSkill(row.id)}/>)}</Box></>}
    {step===2 && <>
      <Box className="practice-bar"><Button variant="text" icon={ArrowLeft} onClick={()=>setStep(1)}>Skills</Button><Text as="h2">{label?.title} <Text as="span">/ {label?.gloss}</Text></Text></Box>
      {!learner && !progressError && <LoadingSpinner label="Loading your levels…"/>}
      {learner && <Box className="practice-level-grid">{CEFR_LEVELS.map(value=><PracticeLevelCard key={value} level={value} clb={clbForCefr(value) || ''} description={LEVEL_DESCRIPTIONS[value]} {...skillCompletion(learner.skill_progress,skill,value)} selected={level===value} yourLevel={ownLevel===value} onStart={()=>start(value)}/>)}</Box>}
    </>}
    {step===3 && <>
      <Box className="practice-bar"><Button variant="text" icon={ArrowLeft} onClick={()=>setStep(2)}>Levels</Button><Text as="h2">{label?.title} <Text as="span">/ {formatLevelWithClb(level)}</Text></Text></Box>
      <Box className="practice-exercise-bar"><Text as="span">{inventory.loading ? 'Loading exercises…' : `${inventory.total+inventory.questions.length} question${inventory.total+inventory.questions.length===1 ? '' : 's'}`}</Text><Button variant="reset" disabled={inventory.loading} onClick={()=>setResetKey(value=>value+1)}>Reset all</Button></Box>
      {inventory.loading && <LoadingSpinner label="Loading exercises…"/>}
      {inventory.error && <ErrorMessage message={inventory.error}/>}
      {!inventory.loading && !inventory.error && <Box id="practice-exercise-list" className="practice-exercises">
        {inventory.loadingPage ? <LoadingSpinner label="Loading this page…"/> : <Box key={resetKey} className="practice-exercises">
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
