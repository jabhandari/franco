import React from 'react';
import { Mic, Square, RotateCcw, RefreshCw, Check } from 'lucide-react';
import { useApiResource } from '../hooks/useApi';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useCountdown } from '../hooks/useCountdown';
import type { ConversationTargetsResponse } from '../api/client';
import { Box, Text, Button, LoadingSpinner, ErrorMessage, TimerRing, AudioPlayer, Textarea } from '../components/ui';

type ConversationProps = {token?:string|null};
export function Conversation({token}:ConversationProps) {
  const [pick,setPick]=React.useState(0);
  const {data,loading,error}=useApiResource<ConversationTargetsResponse>(`/api/me/conversation-targets?pick=${pick}`,token);
  const timer=useCountdown(120);
  const audio=useAudioRecorder(120);
  const [hints,setHints]=React.useState<Record<string,boolean>>({});
  const [typing,setTyping]=React.useState(false);
  const [typed,setTyped]=React.useState('');
  React.useEffect(()=>{if(timer.phase==='done') {if(audio.phase==='requesting') audio.cancelRecording();else audio.stopRecording();}},[timer.phase,audio.phase]);
  function reset() {timer.reset();audio.cancelRecording();setTyped('');}
  function newScenario() {reset();setHints({});setPick(value=>value+1);}
  const busy=audio.phase==='recording' || audio.phase==='requesting';
  return <Box as="section" className="conversation-page">
    <Box className="conversation-header"><Text className="home-kicker">Conversation</Text><Text as="h1">À vous de parler</Text><Text>Two minutes of French, out loud.</Text></Box>
    <Box className="conversation-scenario">
      <Box className="conversation-scenario-heading"><Text className="home-kicker">Your scenario · 2 min</Text><Button variant="text" icon={RefreshCw} disabled={loading} onClick={newScenario}>New scenario</Button></Box>
      {loading && <LoadingSpinner label="Preparing your scenario…"/>}
      {error && <ErrorMessage message={error}/>}
      {data && <><Text as="h2">{data.scenario}</Text><Text>{data.message}</Text></>}
    </Box>
    {data && <>
      {timer.phase==='done' && <Box className="conversation-done" role="status"><Check size={22} aria-hidden="true"/><Box><Text as="h2">Bravo — two full minutes of French</Text><Text>You made time to talk. Listen back and try again whenever you like.</Text></Box></Box>}
      <Box className="conversation-drill">
        <Box className="conversation-controls">
          <TimerRing remaining={timer.remaining}/>
          <Text className="conversation-phase" role="status">{timer.phase==='speaking' ? 'Speaking' : timer.phase==='paused' ? 'Paused' : timer.phase==='done' ? 'Done' : 'Ready'}</Text>
          <Box className="conversation-buttons">
            {timer.phase==='done' ? <Button variant="primary" onClick={reset}>Again</Button> : <Button variant="primary" onClick={timer.phase==='speaking' ? timer.pause : timer.start}>{timer.phase==='speaking' ? 'Pause' : timer.phase==='paused' ? 'Resume' : 'Start'}</Button>}
            <Button variant="text" icon={RotateCcw} onClick={reset}>Reset</Button>
          </Box>
          <Box className="conversation-record">
            {audio.browserSupported && timer.phase!=='done' && <Button variant="primary" icon={audio.phase==='recording' ? Square : Mic} disabled={audio.phase==='requesting'} onClick={audio.phase==='recording' ? audio.stopRecording : audio.startRecording}>{audio.phase==='requesting' ? 'Requesting microphone…' : audio.phase==='recording' ? 'Stop recording' : audio.previewUrl ? 'Record again' : 'Record yourself'}</Button>}
            {audio.phase==='recording' && <Text role="status">Recording · {audio.elapsed}s</Text>}
            {audio.recordingError && <ErrorMessage message={`${audio.recordingError} You can type instead.`}/>}
            {audio.previewUrl && <><Text as="h3">Listen back</Text><AudioPlayer src={audio.previewUrl}/></>}
            {!audio.browserSupported && <Text>Recording is unavailable in this browser. You can type instead.</Text>}
            <Button variant="text" disabled={busy} aria-expanded={typing} onClick={()=>setTyping(value=>!value)}>{typing ? 'Hide typing' : 'Type instead'}</Button>
            {typing && <><Textarea value={typed} onChange={event=>setTyped(event.target.value)} rows={4} aria-label="Your conversation" placeholder="Write what you would like to say in French…"/><Text className="conversation-local-note">Your text and recording stay on this device for this drill.</Text></>}
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
      <Box as="ol" className="conversation-method"><Box as="li">Start the timer — two minutes of French.</Box><Box as="li">Glance at the suggestions — prompts to help you talk.</Box><Box as="li">Record and listen back — notice a phrase to try again.</Box></Box>
    </>}
  </Box>;
}
