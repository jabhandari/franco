import React from 'react';
import type { AttemptItemKind, ContentFeedbackResult, SpeechTranscribeResponse } from '../../api/client';
import { getSpeechStatus, reportAttempt, requestContentFeedback, uploadSpeech } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { AudioPlayer, Box, Button, ErrorMessage, ExerciseEyebrow, ExerciseShell, Text, Textarea } from '../ui';

type Entry = { id: string; item_kind: AttemptItemKind; level?: string; prompt?: string; context?: string; instructions?: string; example?: string };
type AttemptResult = { correct?: boolean; reveal?: string | null; error?: string };
type FreeformResponse = { text: string; modality: 'typed' | 'spoken'; transcription_id?: string };
type Props = { entry: Entry; token?: string | null; onResult?: (result: AttemptResult) => void; simulateSubmit?: SimulateSubmit };
const GUIDANCE: Record<string, string> = {
  A1: 'A few words or one short sentence is enough.',
  A2: 'Try two short sentences.',
  B1: 'Aim for three or four connected sentences.',
  B2: 'Develop your answer in a short paragraph.',
  C1: 'Give a reasoned paragraph with an example.',
  C2: 'Write a nuanced mini paragraph with supporting detail.',
};

export function FreeText({ entry, token, onResult, simulateSubmit }: Props) {
  const [mode, setMode] = React.useState<'typed' | 'spoken'>('typed');
  const [value, setValue] = React.useState('');
  const [heard, setHeard] = React.useState<SpeechTranscribeResponse | null>(null);
  const [feedback, setFeedback] = React.useState<ContentFeedbackResult['feedback'] | null>(null);
  const [pendingResponse, setPendingResponse] = React.useState<FreeformResponse | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [available, setAvailable] = React.useState(false);
  const started = React.useRef(Date.now());
  const recorder = useAudioRecorder(60);

  React.useEffect(() => {
    if (!token || simulateSubmit) return;
    let active = true;
    getSpeechStatus(token).then((status) => { if (active) setAvailable(status.available); }).catch(() => {});
    return () => { active = false; };
  }, [token, simulateSubmit]);

  function choose(next: 'typed' | 'spoken') {
    recorder.cancelRecording(); setHeard(null); setError(''); setMode(next);
  }

  async function transcribe() {
    if (!recorder.blob || !token) return;
    setBusy(true); setError('');
    try { setHeard(await uploadSpeech(entry.id, recorder.blob, token)); recorder.releasePreview(); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function saveResponse(response: FreeformResponse) {
    try {
      const saved: AttemptResult = simulateSubmit ? await simulateSubmit(entry, response)
        : await reportAttempt(entry, response, token, { durationMs: Date.now() - started.current });
      setPendingResponse(null); onResult?.(saved); recorder.cancelRecording();
    } catch (caught) { setError('Feedback is ready, but practice could not be saved. ' + getErrorMessage(caught)); }
  }

  async function submit() {
    const answer = mode === 'spoken' ? heard?.transcript?.trim() : value.trim();
    if (!answer || busy || feedback) return;
    setBusy(true); setError('');
    try {
      const responseFeedback = simulateSubmit
        ? { what_went_well: [{ point: 'You supplied a concrete phrase for this prompt.', quote: answer.slice(0, 60).trim() }],
            needs_work: [{ point: 'Explain one reason or add a supporting detail.', quote: answer.slice(0, 60).trim() }] }
        : (await requestContentFeedback({ response: answer, prompt: entry.prompt || '', context: entry.context || '', level: entry.level }, token)).feedback;
      const response = { text: answer, modality: mode, ...(mode === 'spoken' && heard ? { transcription_id: heard.transcription_id } : {}) };
      setFeedback(responseFeedback); setPendingResponse(response);
      await saveResponse(response);
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  return <ExerciseShell>
    <Box className="freeform-exercise">
      <ExerciseEyebrow level={entry.level} kind="Free Text" />
      <Text as="h2">{entry.prompt}</Text>
      {entry.context && <Text>{entry.context}</Text>}
      {entry.instructions && <Text>{entry.instructions}</Text>}
      <Text className="speaking-task-note">{GUIDANCE[entry.level || 'A1'] || GUIDANCE.A1}</Text>
      {entry.example && <Box as="details" className="speaking-followups"><Box as="summary">See an example</Box><Text>{entry.example}</Text></Box>}
      {!feedback && <>
        <Box className="speaking-route" role="group" aria-label="Answer mode">
          <Box as="button" type="button" className={mode === 'typed' ? 'active' : ''} aria-pressed={mode === 'typed'} onClick={() => choose('typed')}>Type answer</Box>
          <Box as="button" type="button" className={mode === 'spoken' ? 'active' : ''} aria-pressed={mode === 'spoken'} onClick={() => choose('spoken')}>Speak answer</Box>
        </Box>
        {mode === 'typed' ? <Textarea rows={7} value={value} onChange={(event) => setValue(event.target.value)} placeholder="Write your answer in French…" />
          : <Box className="speech-controls">
            {simulateSubmit && !heard && <Button variant="primary" onClick={() => setHeard({
              transcription_id: 'preview', transcript: 'J’aime le parc parce que je peux me promener avec mes amis.', duration_seconds: 5,
              feedback: { mode: 'transcript_only' }, pronunciation: { mode: 'recording_hints', unclear_words: [] },
              quota: { user_requests_remaining_today: 0, user_audio_seconds_remaining_today: 0, resets_at: '' },
            })}>Preview spoken transcript</Button>}
            {!available && !simulateSubmit && <Text className="speaking-task-note">Recording is unavailable. You can type your answer instead.</Text>}
            {available && recorder.browserSupported && recorder.phase === 'idle' && <Button variant="primary" onClick={recorder.startRecording}>Record answer</Button>}
            {recorder.phase === 'recording' && <><Text role="status">Recording · {recorder.elapsed}s / 60s</Text><Button variant="primary" onClick={recorder.stopRecording}>Stop recording</Button></>}
            {recorder.phase === 'requesting' && <Text role="status">Requesting microphone…</Text>}
            {recorder.phase === 'ready' && <><AudioPlayer src={recorder.previewUrl} /><Button variant="primary" disabled={busy} onClick={transcribe}>Transcribe</Button><Button variant="text" onClick={recorder.cancelRecording}>Discard</Button></>}
            {heard && <Text>Your transcript: {heard.transcript}</Text>}
          </Box>}
        <Button variant="primary" disabled={busy || !(mode === 'typed' ? value.trim() : heard?.transcript?.trim())} onClick={submit}>{busy ? 'Getting feedback…' : 'Get feedback'}</Button>
      </>}
      {feedback && <Box className="content-feedback" aria-live="polite">
        <Text as="h3">What went well</Text>
        {feedback.what_went_well.map((item, index) => <Box key={index}><Text>{item.point}</Text><Text className="speaking-feedback-note">“{item.quote}”</Text></Box>)}
        <Text as="h3">What to work on</Text>
        {feedback.needs_work.map((item, index) => <Box key={index}><Text>{item.point}</Text><Text className="speaking-feedback-note">“{item.quote}”</Text></Box>)}
      </Box>}
      {pendingResponse && <Button variant="primary" disabled={busy} onClick={async () => { setBusy(true); setError(''); await saveResponse(pendingResponse); setBusy(false); }}>Retry saving practice</Button>}
      {recorder.recordingError && <ErrorMessage message={recorder.recordingError} />}
      {error && <ErrorMessage message={error} />}
    </Box>
  </ExerciseShell>;
}
