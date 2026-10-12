import React from 'react';
import { ArrowRight, BookOpen, Mic, RotateCcw, Sparkles } from 'lucide-react';
import { useApiResource } from '../hooks/useApi.js';
import type { AuthResponse, MeResponse, StreakResponse, SessionPlanResponse, LessonPositionResponse } from '../api/client.js';
import type { LessonPosition, ConceptProgress, SkillId } from '../types';
import { skillCompletion } from '../presenters/progress.presenter';
import { Box, Text, Button, StreakCard, SkillCard, ErrorMessage } from '../components/ui';

type HomeProps = {
  token?: string | null;
  userData?: MeResponse | AuthResponse | null;
  streak?: StreakResponse | null;
  onStart: () => void;
  onContinue: (lesson: LessonPosition) => void;
  onLesson: (lesson: ConceptProgress) => void;
  onExplore: () => void;
  onConversation: () => void;
};

const SKILLS: {id:SkillId;title:string;gloss:string;description:string}[] = [
  {id:'lire',title:'Lire',gloss:'Reading',description:'Short texts — notices, emails and stories.'},
  {id:'ecouter',title:'Écouter',gloss:'Listening',description:'Conversations and announcements at natural speed.'},
  {id:'ecrire',title:'Écrire',gloss:'Writing',description:'Short messages and paragraphs, corrected as you go.'},
  {id:'parler',title:'Parler',gloss:'Speaking',description:'Phrases said out loud, with pronunciation checked.'},
];

export function Home({token,userData,streak,onStart,onContinue,onLesson,onExplore,onConversation}:HomeProps) {
  const {data:plan,error:planError}=useApiResource<SessionPlanResponse>('/api/me/session-plan',token);
  const {data:resume,error:resumeError}=useApiResource<LessonPositionResponse>('/api/me/lesson-position',token);
  const snapshot=userData && 'skill_progress' in userData ? userData : null;
  const level=userData?.profile?.current_level || 'A1';
  const nextLesson=snapshot?.progress.find(concept => concept.level_code===level && concept.state==='not_started');
  const newItem=plan?.queue?.find(item => item.queue_kind==='new');
  const spoken=plan?.queue?.find(item => item.type==='speaking_prompt');
  const lesson=resume?.lesson;
  const firstName=userData?.user?.first_name || userData?.user?.name.split(' ')[0] || 'learner';

  return (
    <Box as="section" className="home-page">
      <Box className="home-greeting">
        <Box>
          <Text className="home-kicker">TODAY'S FRENCH</Text>
          <Text as="h1">Bonjour, {firstName}.</Text>
          <Text className="home-subtitle">Your daily French session starts here.</Text>
          <Text className="home-intro">Practice with French examples and exercises matched to your level.</Text>
        </Box>
        <StreakCard streak={streak} />
      </Box>

      <Box className="home-plan">
        <Box className="home-section-heading"><Text as="h2">Today's plan</Text><Text as="span">About 10 minutes, all in</Text></Box>
        {planError && <ErrorMessage message="Couldn't load your session plan. You can still explore your lessons." />}
        <Box as="button" type="button" className="home-plan-row" onClick={onStart}>
          <RotateCcw size={18} aria-hidden="true" />
          <Box as="span"><Text as="strong">{plan ? `Review — ${plan.reviewsDue} card${plan.reviewsDue===1 ? '' : 's'} due` : 'Review — build a practice habit'}</Text><Text as="small">{plan?.reviewsDue ? 'Bring back what you have learned before it fades.' : 'New here? Your first session will start with fresh examples.'}</Text></Box>
          <Text as="small" className="home-time">~3 min</Text>
        </Box>
        <Box as="button" type="button" className="home-plan-row" onClick={() => nextLesson ? onLesson(nextLesson) : onExplore()}>
          <Sparkles size={18} aria-hidden="true" />
          <Box as="span"><Text as="strong">New at {level} — {nextLesson?.title || newItem?.title || 'one step forward'}</Text><Text as="small">Fresh examples and exercises at your level.</Text></Box>
          <Text as="small" className="home-time">~4 min</Text>
        </Box>
        <Box as="button" type="button" className="home-plan-row" onClick={onConversation}>
          <Mic size={18} aria-hidden="true" />
          <Box as="span"><Text as="strong">Speaking — one phrase out loud</Text><Text as="small">{spoken?.prompt || 'Say one sentence about yourself, out loud.'}</Text></Box>
          <Text as="small" className="home-time">~3 min</Text>
        </Box>
        <Button variant="primary" wide onClick={onStart} icon={ArrowRight} iconPosition="after">Start a 10-minute session</Button>
      </Box>

      <Box className="home-continue">
        <Text className="home-kicker">{lesson ? 'CONTINUE YOUR LESSON' : 'YOUR NEXT LESSON'}</Text>
        {resumeError && <ErrorMessage message="Couldn't load your saved place. You can still open your lessons." />}
        <Box className="home-continue-row">
          <BookOpen size={24} aria-hidden="true" />
          <Box><Text as="h2">{lesson?.title || nextLesson?.title || 'A little French, every day'}</Text>
            <Text as="small">{lesson ? `${lesson.level_code} roadmap · Lesson ${lesson.position} of ${lesson.total} · You left off at ${lesson.section}.` : 'Start with a lesson matched to your level.'}</Text>
          </Box>
          <Button variant="text" icon={ArrowRight} iconPosition="after" onClick={() => lesson ? onContinue(lesson) : nextLesson ? onLesson(nextLesson) : onExplore()}>{lesson ? 'Continue' : 'Explore Learn'}</Button>
        </Box>
      </Box>

      <Box className="home-skills">
        <Text className="home-kicker">LES QUATRE COMPÉTENCES · THE FOUR SKILLS</Text>
        <Box className="home-skill-grid">
          {SKILLS.map(skill => <SkillCard key={skill.id} title={skill.title} gloss={skill.gloss} description={skill.description} {...skillCompletion(snapshot?.skill_progress || [],skill.id)} loading={!snapshot} />)}
        </Box>
      </Box>
    </Box>
  );
}
