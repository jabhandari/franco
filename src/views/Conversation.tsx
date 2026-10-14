import React from 'react';
import { Mic, Square, RotateCcw, RefreshCw, Check } from 'lucide-react';
import { useApiResource } from '../hooks/useApi';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useCountdown } from '../hooks/useCountdown';
import type { ConversationTargetsResponse, ContentFeedbackResult } from '../api/client';
import { requestContentFeedback, uploadConversationSpeech } from '../api/client';
import { Box, Text, Button, LoadingSpinner, ErrorMessage, TimerRing, AudioPlayer, Textarea } from '../components/ui';

type ConversationProps = {token?:string|null; previewData?:ConversationTargetsResponse};
export function Conversation({token,previewData}:ConversationProps) {
  const [pick,setPick]=React.useState(0);
  const resource=useApiResource<ConversationTargetsResponse>(`/api/me/conversation-targets?pick=${pick}`,token);
  const {data,loading,error}=previewData ? {data:previewData,loading:false,error:''} : resource;
  const timer=useCountdown(120);
  const audio=useAudioRecorder(120);
  const [hints,setHints]=React.useState<Record<string,boolean>>({});
  const [typing,setTyping]=React.useState(false);
  const [typed,setTyped]=React.useState('');
  const [feedback,setFeedback]=React.useState<ContentFeedbackResult['feedback']|null>(null);
  const [feedbackError,setFeedbackError]=React.useState('');
  const [feedbackBusy,setFeedbackBusy]=React.useState(false);
  const feedbackGeneration=React.useRef(0);
  React.useEffect(()=>{if(timer.phase==='done') {if(audio.phase==='requesting') audio.cancelRecording();else audio.stopRecording();}},[timer.phase,audio.phase]);
  React.useEffect(()=>{if(timer.phase==='speaking' && audio.recordingError) timer.stop();},[timer.phase,audio.recordingError]);
  function reset() {feedbackGeneration.current++;timer.reset();audio.cancelRecording();setTyped('');setFeedback(null);setFeedbackError('');setFeedbackBusy(false);}
  function newScenario() {reset();setHints({});setPick(value=>value+1);}
  const busy=audio.phase==='recording' || audio.phase==='requesting';
  async function startRecording() {
    setFeedback(null);setFeedbackError('');
    if(await audio.startRecording()) timer.start();
  }
  function stopRecording() {audio.stopRecording();timer.stop();}
  async function getFeedback() {
    if(!data || feedbackBusy || (!token && !previewData)) return;
    const generation=++feedbackGeneration.current;
    setFeedbackBusy(true);setFeedbackError('');setFeedback(null);
    try {
      const answer=typing ? typed.trim() : audio.blob && token ? (await uploadConversationSpeech(audio.blob,token)).transcript.trim() : '';
      if(generation!==feedbackGeneration.current) return;
      if(!answer) {setFeedbackError('No speech was detected. Record again or type an answer.');return;}
      const result=previewData
        ? {feedback:{what_went_well:[{point:'You included a concrete phrase for this scenario.',quote:answer.slice(0,60).trim()}],needs_work:[{point:'Build on this phrase with a reason or example.',quote:answer.slice(0,60).trim()}]}}
        : await requestContentFeedback({response:answer,prompt:data.scenario,context:data.message,
          targets:data.targets.map(target=>target.title+': '+target.text),level:'B1'},token);
      if(generation===feedbackGeneration.current) setFeedback(result.feedback);
    } catch(caught) {if(generation===feedbackGeneration.current) setFeedbackError(caught instanceof Error ? caught.message : 'Feedback is unavailable. Please try again.');}
    finally {if(generation===feedbackGeneration.current) setFeedbackBusy(false);}
  }
  return <Box as="section" className="conversation-page">
    <Box className="conversation-header"><Text className="home-kicker">Conversation</Text><Text as="h1">À vous de parler</Text><Text>Two minutes of French, out loud.</Text></Box>
    <Box className="conversation-scenario">
      <Box className="conversation-scenario-heading"><Text className="home-kicker">Your scenario · 2 min</Text><Button variant="text" icon={RefreshCw} disabled={loading} onClick={newScenario}>New scenario</Button></Box>
      {loading && <LoadingSpinner label="Preparing your scenario…"/>}
      {error && <ErrorMessage message={error}/>}
      {data && <><Text as="h2">{data.scenario}</Text><Text>{data.message}</Text></>}
    </Box>
    {data && <>
      {timer.phase==='done' && <Box className="conversation-done" role="status"><Check size={22} aria-hidden="true"/><Box><Text as="h2">{timer.remaining===0?'Bravo — two full minutes of French':'Recording finished'}</Text><Text>Listen back, get feedback, or try again.</Text></Box></Box>}
      <Box className="conversation-drill">
        <Box className="conversation-controls">
          <TimerRing remaining={timer.remaining}/>
          <Text className="conversation-phase" role="status">{timer.phase==='speaking' ? 'Speaking' : timer.phase==='paused' ? 'Paused' : timer.phase==='done' ? 'Done' : 'Ready'}</Text>
          <Box className="conversation-buttons">
            <Button variant="text" icon={RotateCcw} onClick={reset}>Reset</Button>
          </Box>
          <Box className="conversation-record">
            {audio.browserSupported && timer.phase!=='done' && <Button variant="primary" icon={audio.phase==='recording' ? Square : Mic} disabled={audio.phase==='requesting'} onClick={audio.phase==='recording' ? stopRecording : startRecording}>{audio.phase==='requesting' ? 'Requesting microphone…' : audio.phase==='recording' ? 'Stop recording' : 'Record yourself'}</Button>}
            {audio.phase==='recording' && <Text role="status">Recording · {audio.elapsed}s</Text>}
            {audio.recordingError && <ErrorMessage message={`${audio.recordingError} You can type instead.`}/>}
            {audio.previewUrl && <><Text as="h3">Listen back</Text><AudioPlayer src={audio.previewUrl}/></>}
            {!audio.browserSupported && <Text>Recording is unavailable in this browser. You can type instead.</Text>}
            <Button variant="text" disabled={busy} aria-expanded={typing} onClick={()=>setTyping(value=>!value)}>{typing ? 'Hide typing' : 'Type instead'}</Button>
            {typing && <><Textarea value={typed} onChange={event=>setTyped(event.target.value)} rows={10} aria-label="Your conversation" placeholder="Write what you would like to say in French…"/><Text className="conversation-local-note">Your answer is sent to the feedback provider when you request feedback.</Text></>}
            {(typing ? Boolean(typed.trim()) : audio.phase==='ready') && <Button variant="primary" disabled={feedbackBusy} onClick={getFeedback}>{feedbackBusy?'Getting feedback…':'Get feedback'}</Button>}
            {feedbackError && <ErrorMessage message={feedbackError}/>}
          </Box>
        </Box>
        <Box className="conversation-suggestions">
          <Text className="home-kicker">Suggestions</Text><Text as="h2">Suggestions — try to weave these in</Text>
          {data.targets.map(target=><Box className="conversation-suggestion" key={target.id}>
            <Box><Text as="h3">{target.title}</Text><Button variant="text" aria-expanded={Boolean(hints[target.id])} aria-controls={`hint-${target.id}`} onClick={()=>setHints(value=>({...value,[target.id]:!value[target.id]}))}>{hints[target.id] ? 'Hide hint' : 'Hint'}</Button></Box>
            <Text>{target.text}</Text>
            {hints[target.id] && <Box id={`hint-${target.id}`} className="conversation-hint">{target.hint?.sentence ? <Text>« {target.hint.sentence} »</Text> : <Text>No model sentence has been authored for this concept yet.</Text>}<Text>{target.hint?.pointer || 'Try this concept in a sentence of your own.'}</Text></Box>}
          </Box>)}
        </Box>
      </Box>
      {feedback && <Box className="conversation-feedback content-feedback" aria-live="polite">
        <Text as="h2">Your feedback</Text><Text as="h3">What went well</Text>
        {feedback.what_went_well.map((item,index)=><Box key={index}><Text>{item.point}</Text><Text className="speaking-feedback-note">“{item.quote}”</Text></Box>)}
        <Text as="h3">What to work on</Text>
        {feedback.needs_work.map((item,index)=><Box key={index}><Text>{item.point}</Text><Text className="speaking-feedback-note">“{item.quote}”</Text></Box>)}
      </Box>}
      <Box as="ol" className="conversation-method"><Box as="li">Record yourself to start the two-minute timer.</Box><Box as="li">Use the suggestions to guide what you say.</Box><Box as="li">Listen back and request specific feedback.</Box></Box>
    </>}
  </Box>;
}
