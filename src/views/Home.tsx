import React from 'react';
import { ArrowRight, BookOpen, ClipboardCheck, Mic, RotateCcw, Sparkles, Gamepad2, FileText, Headphones, PenLine } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import type { AuthResponse, MeResponse, StreakResponse, SessionPlanResponse, LessonPositionResponse } from '../api/client.js';
import type { LessonPosition, ConceptProgress, SkillId } from '../types';
import { skillCompletion } from '../presenters/progress.presenter';
import { Box, Text, Button, StreakCard, SkillCard, ErrorMessage, ActionTile } from '../components/ui';
import { DailyWordsCard } from '../components/DailyWordsCard.js';

type HomeProps = {
  token?: string | null;
  userData?: MeResponse | AuthResponse | null;
  streak?: StreakResponse | null;
  onStart: () => void;
  onPlacement: () => void;
  onContinue: (lesson: LessonPosition) => void;
  onLesson: (lesson: ConceptProgress) => void;
  onExplore: () => void;
  onConversation: () => void;
  onPuzzles: () => void;
  onWords: () => void;
};

const SKILLS: {id:SkillId;icon:typeof Mic;title:string;gloss:string;description:string}[] = [
  {id:'lire',icon:FileText,title:'Lire',gloss:'Reading',description:'Short texts — notices, emails and stories.'},
  {id:'ecouter',icon:Headphones,title:'Écouter',gloss:'Listening',description:'Conversations and announcements at natural speed.'},
  {id:'ecrire',icon:PenLine,title:'Écrire',gloss:'Writing',description:'Short messages and paragraphs, corrected as you go.'},
  {id:'parler',icon:Mic,title:'Parler',gloss:'Speaking',description:'Phrases said out loud, with pronunciation checked.'},
];

export function Home({token,userData,streak,onStart,onPlacement,onContinue,onLesson,onExplore,onConversation,onPuzzles,onWords}:HomeProps) {
  const {data:plan,error:planError}=useApiResource<SessionPlanResponse>('/api/me/session-plan',token);
  const {data:resume,error:resumeError}=useApiResource<LessonPositionResponse>('/api/me/lesson-position',token);
  const snapshot=userData && 'skill_progress' in userData ? userData : null;
  const level=userData?.profile?.current_level || 'A1';
  const nextLesson=snapshot?.progress.find(concept => concept.level_code===level && concept.state==='not_started');
  const newItem=plan?.queue?.find(item => item.queue_kind==='new');
  const spoken=plan?.queue?.find(item => item.type==='speaking_prompt');
  const lesson=resume?.lesson;
  const firstName=userData?.user?.first_name || userData?.user?.name.split(' ')[0] || 'learner';
  // FRA-176: entrance animations run only on the first Home mount per user per
  // tab session — in-app back-navigation must not replay the stagger. The
  // gate is read synchronously in the lazy initializer so the first paint
  // already carries the right state (no flash); the write stays in the effect.
  function homeEnterSeen(userId:string):boolean{
    try{return window.sessionStorage.getItem(`franco-home-enter:v2:${userId}`)!==null;}
    catch{return false;}
  }
  const userId=userData?.user?.id;
  const [enter]=React.useState(()=>!homeEnterSeen(userId ?? 'anon'));
  React.useEffect(()=>{
    if(!userId) return;
    try{window.sessionStorage.setItem(`franco-home-enter:v2:${userId}`,'1');}catch{/* storage unavailable: animate anyway */}
  },[userId]);

  return (
    <Box as="section" className={enter ? 'home-page home-enter' : 'home-page'}>
      <Box className="home-greeting">
        <Box className="home-hero-copy">
          <Text className="home-kicker">YOUR FRENCH STARTS HERE</Text>
          <Text as="h1">Bonjour, {firstName}<Text as="span" className="home-hero-sparkle" aria-hidden="true">✳</Text></Text>
          <Text className="home-subtitle">A little practice goes a long way.</Text>
          <Text className="home-intro">Your next lesson, a quick challenge, and a moment to speak — all in one place.</Text>
          <Button variant="primary" onClick={onStart} icon={ArrowRight} iconPosition="after">Start a 10-minute session</Button>
        </Box>
        <StreakCard streak={streak} />
      </Box>

      <Box className="home-plan">
        <Box className="home-section-heading"><Box><Text className="home-kicker">MADE FOR YOUR MOMENT</Text><Text as="h2">What feels good today?</Text></Box><Text as="span">Choose your own next step</Text></Box>
        {planError && <ErrorMessage message="Couldn't load your session plan. You can still explore your lessons." />}
        <Box className="home-action-grid">
          {userData?.profile?.placement_status === 'not_started' && <ActionTile icon={ClipboardCheck} tone="violet" eyebrow="FIND YOUR LEVEL · ~2 MIN" title="Take your placement quiz" description="Start with a level matched to your French." onClick={onPlacement} />}
          <ActionTile icon={RotateCcw} tone="amber" eyebrow="KEEP IT FRESH · ~3 MIN" title={plan ? `Review ${plan.reviewsDue} card${plan.reviewsDue===1 ? '' : 's'}` : 'Make it stick'} description={plan?.reviewsDue ? 'Bring back what you have learned before it fades.' : 'Build a practice habit with fresh examples.'} onClick={onStart} />
          <ActionTile icon={Sparkles} tone="teal" eyebrow={`NEW AT ${level} · ~4 MIN`} title={nextLesson?.title || newItem?.title || 'One step forward'} description="Fresh examples and exercises at your level." onClick={() => nextLesson ? onLesson(nextLesson) : onExplore()} />
          <ActionTile icon={Mic} tone="coral" eyebrow="SAY IT OUT LOUD · ~3 MIN" title="Speaking practice" description={spoken?.prompt || 'Say one sentence about yourself, out loud.'} onClick={onConversation} />
        </Box>
      </Box>

      <DailyWordsCard token={token} onOpen={onWords} />

      <Box className="home-bottom-grid">
        <Box className="home-continue">
          <Box className="home-continue-art"><BookOpen size={30} aria-hidden="true" /></Box>
          <Text className="home-kicker">{lesson ? 'CONTINUE YOUR LESSON' : 'YOUR NEXT LESSON'}</Text>
          {resumeError && <ErrorMessage message="Couldn't load your saved place. You can still open your lessons." />}
          <Text as="h2">{lesson?.title || nextLesson?.title || 'A little French, every day'}</Text>
          <Text as="small">{lesson ? `${lesson.level_code} topics · Topic ${lesson.position} of ${lesson.total}.` : 'Start with a lesson matched to your level.'}</Text>
          <Button variant="text" icon={ArrowRight} iconPosition="after" onClick={() => lesson ? onContinue(lesson) : nextLesson ? onLesson(nextLesson) : onExplore()}>{lesson ? 'Continue lesson' : 'Explore Learn'}</Button>
        </Box>
        <Box className="home-play-card">
          <Box className="home-play-icon"><Gamepad2 size={27} aria-hidden="true" /></Box>
          <Text className="home-kicker">LEARN BY PLAYING</Text>
          <Text as="h2">Ready for a little challenge?</Text>
          <Text>See how far your French can take you in Puzzles.</Text>
          <Button variant="text" icon={ArrowRight} iconPosition="after" onClick={onPuzzles}>Explore Puzzles</Button>
        </Box>
      </Box>

      <Box className="home-skills">
        <Text className="home-kicker">A LITTLE OF EVERYTHING</Text>
        <Text as="h2" className="home-skills-title">Four ways to grow</Text>
        <Box className="home-skill-grid">
          {SKILLS.map(skill => <SkillCard key={skill.id} title={skill.title} icon={skill.icon} gloss={skill.gloss} description={skill.description} {...skillCompletion(snapshot?.skill_progress || [],skill.id)} loading={!snapshot} animateRing={enter} />)}
        </Box>
      </Box>
    </Box>
  );
}
