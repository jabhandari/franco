import React from 'react';
import {ArrowLeft,BookOpen,Compass} from 'lucide-react';
import {apiGet,apiPost,getErrorMessage} from '../api/client';
import type {ReadingStory,StoryActionResult,StoryState,StoryStop} from '../types';
import {nextStory,storyCtaLabel} from '../presenters/stories.presenter';
import {Box,Button,EmptyState,ErrorMessage,LoadingSpinner,Page,PageHeader,Panel,StoryPath,StoryTrophyShelf,Text} from '../components/ui';

function StoryReader({id,token,onBack,onProgress}:{key?:React.Key;id:string;token:string;onBack:()=>void;onProgress:()=>Promise<void>}) {
  const [story,setStory]=React.useState<ReadingStory|null>(null),[state,setState]=React.useState<StoryState>('current');
  const [answered,setAnswered]=React.useState<string[]>([]),[questionsOpen,setQuestionsOpen]=React.useState(false);
  const [selection,setSelection]=React.useState(''),[feedback,setFeedback]=React.useState<StoryActionResult|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
  React.useEffect(()=>{
    let active=true;
    apiGet<{story:ReadingStory;state:StoryState}>(`/api/me/stories/${id}`,token).then(data=>{if(active){setStory(data.story);setAnswered(data.story.answered_question_ids);setState(data.state);}}).catch(error=>{if(active) setError(getErrorMessage(error));});
    return()=>{active=false;};
  },[id,token]);
  const question=story?.questions.find(q=>!answered.includes(q.id));
  async function answer() {
    if(!story || busy) return;
    setBusy(true);setError('');
    try {
      const result=await apiPost<StoryActionResult>(`/api/me/stories/${id}/answer`,{version:story.version,question_id:question?.id ?? null,option_id:selection || null},token);
      setFeedback(result);setAnswered(result.answered_question_ids);setState(result.state);
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
          <Box className="story-options">{question.options.map(option=><Button key={option.id} variant={selection===option.id?'primary':'text'} aria-pressed={selection===option.id} disabled={busy} onClick={()=>setSelection(option.id)}>{option.text}</Button>)}</Box>
          <Button variant="primary" disabled={busy || !selection} onClick={answer}>{busy?'Checking…':'Check answer'}</Button>
        </Box> : <Text as="strong">All six questions answered. Well done!</Text>}
      </Panel>}
      {state==='completed' && <Panel><Text as="h2">Story completed</Text><Text>Your progress is saved to your account. Choose any story to read next.</Text><Button variant="primary" icon={Compass} onClick={onBack}>Explore the path</Button></Panel>}
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
  if(!token) return <Page><EmptyState icon={BookOpen} title="Sign in to start your story adventure" text="Your reading progress is saved to your account."/></Page>;
  const next=nextStory(stops);
  return <Page>
    {selected ? <StoryReader key={`${token}:${selected}`} id={selected} token={token} onBack={()=>setSelected(null)} onProgress={load}/> : <>
      {loading && <LoadingSpinner label="Loading your story path…"/>}
      {error && <><ErrorMessage message={error}/><Button variant="text" onClick={load}>Retry loading stories</Button></>}
      {!loading && !error && (stops.length ? <>
        <Box className="story-hero">
          <Box className="story-hero-copy">
            <Text className="home-kicker">Read · Discover · Continue</Text>
            <Text as="h1">Your story adventure</Text>
            <Text className="story-hero-lede">Choose any story, from everyday French to richer adventures. Read and answer six questions at your own pace — finish a chapter to earn its trophy.</Text>
            {next && <Button variant="primary" icon={BookOpen} onClick={()=>setSelected(next.id)}>{storyCtaLabel(next)}</Button>}
          </Box>
          <StoryTrophyShelf stops={stops}/>
        </Box>
        <StoryPath stops={stops} onSelect={setSelected} nextId={next && next.state!=='completed' ? next.id : null}/>
      </> : <EmptyState icon={Compass} title="Stories are being prepared" text="Your adventure will appear here when the story collection is available."/>)}
    </>}
  </Page>;
}
