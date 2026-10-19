import React from 'react';
import {ArrowLeft,BookOpen,Compass,SkipForward,Sparkles,ArrowRight,BookMarked} from 'lucide-react';
import {apiGet,apiPost,getErrorMessage} from '../api/client';
import type {ReadingStory,StoryActionResult,StoryState,StoryStop} from '../types';
import {nextStory,storyCtaLabel} from '../presenters/stories.presenter';
import {Box,Button,EmptyState,ErrorMessage,LoadingSpinner,Page,Panel,StoryAnswerOptions,StoryCoverImage,StoryPath,StoryTrophyShelf,Text} from '../components/ui';

function StoryReader({id,token,onBack,onProgress}:{key?:React.Key;id:string;token:string;onBack:()=>void;onProgress:()=>Promise<void>}) {
  const [story,setStory]=React.useState<ReadingStory|null>(null),[state,setState]=React.useState<StoryState>('current');
  const [answered,setAnswered]=React.useState<string[]>([]),[questionsOpen,setQuestionsOpen]=React.useState(false);
  const [selection,setSelection]=React.useState(''),[feedback,setFeedback]=React.useState<StoryActionResult|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
  const [skipConfirm,setSkipConfirm]=React.useState(false),[skipDone,setSkipDone]=React.useState(false);
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
  async function skip() {
    if(!story || busy) return;
    setBusy(true);setError('');
    try {
      const result=await apiPost<StoryActionResult>(`/api/me/stories/${id}/skip`,{version:story.version},token);
      setState(result.state);setAnswered(result.answered_question_ids);setSkipConfirm(false);setSkipDone(true);
      await onProgress();
    } catch(error) {setError(getErrorMessage(error));} finally {setBusy(false);}
  }
  return <Box className="story-reader">
    <Button variant="text" icon={ArrowLeft} onClick={onBack}>Back to the path</Button>
    {error && <ErrorMessage message={error}/>}
    {!story && !error && <LoadingSpinner label="Loading story…"/>}
    {story && <>
      <Box className="story-reader-intro">
        <Box className="story-reader-intro-copy">
          <Text className="story-reader-kicker">THE READING ROOM <Sparkles size={15}/></Text>
          <Text className="story-reader-level">{story.level} · {story.text.trim().split(/\s+/).length} words</Text>
          <Text as="h1">{story.title}</Text>
          <Text className="story-reader-translation">{story.title_en}</Text>
          <Text className="story-reader-instruction">Settle in, read at your pace, then see what you remember.</Text>
        </Box>
        <Box className="story-reader-intro-art" aria-hidden="true"><StoryCoverImage storyId={story.id}/><BookMarked size={96}/><Text>UNE HISTOIRE</Text></Box>
      </Box>
      <Box className="story-book">
        <Box className="story-book-topline"><Text>FRANCO STORIES</Text><Text>{story.level} · {story.id.slice(-2)}</Text></Box>
        <Text as="h2" className="story-book-title">{story.title}</Text>
        <Box as="div" className="story-reading-text" lang="fr">{story.text}</Box>
        <Box as="details" className="story-glossary"><Box as="summary">Words to help you along</Box><Box className="story-glossary-grid">{story.glossary.map(word=><Text key={word.french}><Text as="strong">{word.french}</Text> — {word.english}</Text>)}</Box></Box>
      </Box>
      {skipDone ? <Panel><Text as="h2">Questions skipped</Text><Text>No problem — this story stays on your path. Open it again whenever you want the questions.</Text><Button variant="primary" icon={Compass} onClick={onBack}>Explore the path</Button></Panel>
      : skipConfirm ? <Panel><Text as="h2">Skip the questions for this story?</Text><Text>The story stays on your path and you can answer the questions any time. Any answers you have already given are kept.</Text><Box className="story-reader-actions"><Button variant="primary" icon={SkipForward} disabled={busy} onClick={skip}>{busy?'Skipping…':'Skip questions'}</Button><Button variant="text" disabled={busy} onClick={()=>setSkipConfirm(false)}>Keep answering</Button></Box></Panel>
      : <>
      {!questionsOpen && <Box className="story-reader-actions"><Button variant="primary" icon={BookOpen} onClick={()=>setQuestionsOpen(true)}>Continue to 6 questions</Button>{state!=='completed' && <Button variant="text" icon={SkipForward} onClick={()=>setSkipConfirm(true)}>Skip questions</Button>}</Box>}
      {questionsOpen && <Panel>
        <Text as="h2">Questions · {answered.length}/6 answered</Text>
        <Text>Take as many tries as you need. You can reread the story at any time.</Text>
        {feedback?.explanation && <Box role="status"><Text>{feedback.explanation}</Text></Box>}
        {question ? <Box>
          <Text as="h3">{question.prompt}</Text>
          <StoryAnswerOptions options={question.options} selected={selection} disabled={busy} onSelect={setSelection}/>
          <Button variant="primary" disabled={busy || !selection} onClick={answer}>{busy?'Checking…':'Check answer'}</Button>
        </Box> : <Text as="strong">All six questions answered. Well done!</Text>}
        {state!=='completed' && <Button variant="text" icon={SkipForward} onClick={()=>setSkipConfirm(true)}>Skip questions</Button>}
      </Panel>}
      </>}
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
            <Text className="story-hero-eyebrow"><Sparkles size={16}/> YOUR FRENCH LIBRARY</Text>
            <Text as="h1"><Text as="span" className="story-hero-line">A little reading.</Text><Text as="span" className="story-hero-line">A lot of possibility.</Text></Text>
            <Text className="story-hero-lede">Fifty original stories, six chapters, and a whole world of French to discover. Pick a cover and turn the page.</Text>
            {next && <Button variant="primary" icon={ArrowRight} onClick={()=>setSelected(next.id)}>{storyCtaLabel(next)}</Button>}
          </Box>
          <Box className="story-hero-art" aria-hidden="true"><Box className="story-art-orbit"/><Box className="story-art-book story-art-book-back"><BookOpen size={48}/><Text>LES MOTS</Text></Box><Box className="story-art-book story-art-book-front"><Sparkles size={44}/><Text>IL ÉTAIT UNE FOIS</Text></Box><Box className="story-art-stamp">A1 <Text as="span">to</Text> C2</Box></Box>
        </Box>
        <Box className="story-library-bar">
          <Box><Text className="story-library-eyebrow">YOUR COLLECTION</Text><Text as="h2">Choose your chapter</Text><Text>Stories grow with you, from small moments to big ideas.</Text></Box>
          <StoryTrophyShelf stops={stops}/>
        </Box>
        <StoryPath stops={stops} onSelect={setSelected} nextId={next && next.state!=='completed' ? next.id : null}/>
      </> : <EmptyState icon={Compass} title="Stories are being prepared" text="Your adventure will appear here when the story collection is available."/>)}
    </>}
  </Page>;
}
