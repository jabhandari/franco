import React from 'react';
import {ArrowLeft,BookOpen,Compass,SkipForward} from 'lucide-react';
import {apiGet,apiPost,getErrorMessage} from '../api/client';
import type {ReadingStory,StoryActionResult,StoryState,StoryStop} from '../types';
import {storySummary} from '../presenters/stories.presenter';
import {Box,Button,EmptyState,ErrorMessage,LoadingSpinner,Page,PageHeader,Panel,StoryPath,Text} from '../components/ui';

function StoryReader({id,token,onBack,onProgress}:{key?:React.Key;id:string;token:string;onBack:()=>void;onProgress:()=>Promise<void>}) {
  const [story,setStory]=React.useState<ReadingStory|null>(null),[state,setState]=React.useState<StoryState>('current');
  const [answered,setAnswered]=React.useState<string[]>([]),[questionsOpen,setQuestionsOpen]=React.useState(false);
  const [selection,setSelection]=React.useState(''),[feedback,setFeedback]=React.useState<StoryActionResult|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
  const [confirmSkip,setConfirmSkip]=React.useState(false);
  React.useEffect(()=>{
    let active=true;
    apiGet<{story:ReadingStory;state:StoryState}>(`/api/me/stories/${id}`,token).then(data=>{if(active){setStory(data.story);setAnswered(data.story.answered_question_ids);setState(data.state);}}).catch(error=>{if(active) setError(getErrorMessage(error));});
    return()=>{active=false;};
  },[id,token]);
  const question=story?.questions.find(q=>!answered.includes(q.id));
  async function act(action:'answer'|'skip') {
    if(!story || busy) return;
    setBusy(true);setError('');
    try {
      const result=await apiPost<StoryActionResult>(`/api/me/stories/${id}/${action}`,{version:story.version,question_id:question?.id ?? null,option_id:selection || null},token);
      setFeedback(result);setAnswered(result.answered_question_ids);setState(result.state);setConfirmSkip(false);
      if(result.correct) setSelection('');
      await onProgress();
    } catch(error) {setError(getErrorMessage(error));} finally {setBusy(false);}
  }
  return <Box className="story-reader">
    <Button variant="text" icon={ArrowLeft} onClick={onBack}>Back to the path</Button>
    {error && <ErrorMessage message={error}/>}
    {!story && !error && <LoadingSpinner label="Loading story…"/>}
    {story && <>
      <PageHeader eyebrow={`${story.level} · Story adventure`} title={story.title} lede={story.title_en}/>
      <Panel><Text as="h2">Read the story</Text><Box as="p" className="story-reading-text" lang="fr">{story.text}</Box>
        <Box as="details"><Box as="summary">English word support</Box>{story.glossary.map(word=><Text key={word.french}><Text as="strong">{word.french}</Text> — {word.english}</Text>)}</Box>
      </Panel>
      {!questionsOpen && <Button variant="primary" icon={BookOpen} onClick={()=>setQuestionsOpen(true)}>Continue to 6 questions</Button>}
      {questionsOpen && <Panel>
        <Text as="h2">Questions · {answered.length}/6 answered</Text>
        <Text>Take as many tries as you need. You can reread the story at any time.</Text>
        {feedback?.explanation && <Box role="status"><Text>{feedback.explanation}</Text></Box>}
        {question ? <Box>
          <Text as="h3">{question.prompt}</Text>
          <Box className="story-options">{question.options.map(option=><Button key={option.id} variant={selection===option.id?'primary':'text'} disabled={busy} onClick={()=>setSelection(option.id)}>{option.text}</Button>)}</Box>
          <Button variant="primary" disabled={busy || !selection} onClick={()=>act('answer')}>{busy?'Checking…':'Check answer'}</Button>
        </Box> : <Text as="strong">All six questions answered. Well done!</Text>}
      </Panel>}
      {state==='completed' && <Panel><Text as="h2">Story completed</Text><Text>The next stop is unlocked. Your progress is saved to your account.</Text><Button variant="primary" icon={Compass} onClick={onBack}>Explore the path</Button></Panel>}
      {state==='skipped' && <Panel><Text as="h2">Story skipped</Text><Text>The next stop is unlocked. You can return to this story whenever you like.</Text><Button variant="primary" onClick={onBack}>Continue on the path</Button></Panel>}
      {state==='current' && <Box>
        {!confirmSkip ? <Button variant="text" icon={SkipForward} disabled={busy} onClick={()=>setConfirmSkip(true)}>Skip this story</Button> : <Panel><Text>Skip this story and unlock the next stop? You can return later.</Text><Button variant="primary" disabled={busy} onClick={()=>act('skip')}>Yes, skip and continue</Button><Button variant="text" disabled={busy} onClick={()=>setConfirmSkip(false)}>Keep reading</Button></Panel>}
      </Box>}
    </>}
  </Box>;
}
export function Stories({token}:{token:string|null}) {
  const [stops,setStops]=React.useState<StoryStop[]>([]),[selected,setSelected]=React.useState<string|null>(null),[loading,setLoading]=React.useState(true),[error,setError]=React.useState('');
  const sequence=React.useRef(0);
  const load=React.useCallback(async()=>{
    const request=++sequence.current;if(!token){setLoading(false);return;}
    try {const data=await apiGet<{stories:StoryStop[]}>('/api/me/stories',token);if(request===sequence.current){setStops(data.stories);setError('');}}
    catch(error){if(request===sequence.current) setError(getErrorMessage(error));}
    finally{if(request===sequence.current) setLoading(false);}
  },[token]);
  React.useEffect(()=>{setSelected(null);setStops([]);setLoading(true);load();return()=>{sequence.current++;};},[load]);
  if(!token) return <Page><EmptyState icon={BookOpen} title="Sign in to start your story adventure" text="Your completed and skipped stories are saved to your account."/></Page>;
  return <Page>
    {selected ? <StoryReader key={`${token}:${selected}`} id={selected} token={token} onBack={()=>setSelected(null)} onProgress={load}/> : <>
      <PageHeader eyebrow="Read · Discover · Continue" title="Your story adventure" lede="Follow a trail from everyday French to richer stories. Read, answer six questions, and unlock the next stop — or skip and come back later."/>
      {loading && <LoadingSpinner label="Loading your story path…"/>}
      {error && <><ErrorMessage message={error}/><Button variant="text" onClick={load}>Retry loading stories</Button></>}
      {!loading && !error && (stops.length ? <><Text>{storySummary(stops)}</Text><StoryPath stops={stops} onSelect={setSelected}/></> : <EmptyState icon={Compass} title="Stories are being prepared" text="Your adventure will appear here when the story collection is available."/>)}
    </>}
  </Page>;
}
