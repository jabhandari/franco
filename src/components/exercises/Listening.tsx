import React from 'react';
import type { AttemptItemKind, SpeechTranscribeResponse } from '../../api/client';
import { getSpeechStatus, reportAttempt, uploadSpeech } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { AudioPlayer, Box, Button, ClipPlayer, ErrorMessage, ExerciseEyebrow, ExerciseShell, Feedback, Text, Textarea } from '../ui';

export type MediaAsset = { kind: 'audio' | 'image' | 'video' | 'document'; url: string; duration_seconds?: number; transcript?: string; checksum?: string };
export type ListenRepeatItem = { id: string; item_kind: AttemptItemKind; level?: string; prompt?: string; expected?: string; media?: MediaAsset[] };
type AttemptResult = { correct?: boolean; reveal?: string | null; error?: string };
type Props = { entry: ListenRepeatItem; token?: string | null; onResult?: (result: AttemptResult) => void; compact?: boolean; sequence?: number; simulateSubmit?: SimulateSubmit };

export function ListenRepeat({ entry, token, onResult, compact = false, sequence, simulateSubmit }: Props) {
  const [revealed, setRevealed] = React.useState(false);
  const [listened, setListened] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const [typed, setTyped] = React.useState('');
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [heard, setHeard] = React.useState<SpeechTranscribeResponse | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [available, setAvailable] = React.useState(false);
  const started = React.useRef(Date.now());
  const audio = useAudioRecorder(60);
  const clip = entry.media?.find((media) => media.kind === 'audio');
  const phrase = entry.expected || clip?.transcript || '';

  React.useEffect(() => {
    if (!token || simulateSubmit) return;
    let active = true;
    getSpeechStatus(token).then((status) => { if (active) setAvailable(status.available); }).catch(() => {});
    return () => { active = false; };
  }, [token, simulateSubmit]);

  async function save(response: string | { completed: true; transcript: string; transcription_id: string }) {
    if (busy || result) return;
    setBusy(true); setError('');
    try {
      const saved = simulateSubmit ? await simulateSubmit(entry, response)
        : await reportAttempt(entry, response, token, { durationMs: Date.now() - started.current });
      setResult(saved); onResult?.(saved); audio.cancelRecording();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function transcribe() {
    if (!audio.blob || !token) return;
    setBusy(true); setError('');
    try { setHeard(await uploadSpeech(entry.id, audio.blob, token)); audio.releasePreview(); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  function reset() {
    audio.cancelRecording(); setResult(null); setHeard(null); setTyped(''); setTyping(false);
    setRevealed(false); setListened(false); setError(''); started.current = Date.now();
  }

  return <ExerciseShell variant="pronunciation" answered={result ? (result.correct ? 'correct' : 'wrong') : null}>
    <Box className="pronunciation-drill">
      <ExerciseEyebrow level={entry.level} kind={compact && sequence ? 'Sound ' + String(sequence).padStart(2, '0') : 'Listen & repeat'} />
      {!compact && <Text as="h3" className="pronunciation-title">Listen, then say what you hear</Text>}
      <Text className="pronunciation-hint">Play the sound first. Reveal the words when you are ready.</Text>
      <ClipPlayer src={clip?.url} onPlay={() => setListened(true)} />
      {!revealed && <Button variant="text" disabled={!listened} onClick={() => setRevealed(true)}>Show words</Button>}
      {revealed && <Box className="pronunciation-reveal"><Text as="span" className="pronunciation-answer-label">THE WORDS</Text><Text as="strong" className="pronunciation-word">{phrase || 'No transcript available'}</Text></Box>}
      {!result && <Box className="listen-repeat-actions">
        {available && audio.browserSupported && !typing && <>
          {audio.phase === 'idle' && <Button variant="primary" onClick={audio.startRecording}>Record yourself</Button>}
          {audio.phase === 'requesting' && <Text role="status">Requesting microphone…</Text>}
          {audio.phase === 'recording' && <><Text role="status">Recording · {audio.elapsed}s</Text><Button variant="primary" onClick={audio.stopRecording}>Stop</Button></>}
          {audio.phase === 'ready' && <><AudioPlayer src={audio.previewUrl} /><Button variant="primary" disabled={busy} onClick={transcribe}>{busy ? 'Transcribing…' : 'Check recording'}</Button><Button variant="text" onClick={audio.cancelRecording}>Discard</Button></>}
        </>}
        <Button variant="text" onClick={() => { audio.cancelRecording(); setTyping(!typing); }} disabled={busy}>{typing ? 'Hide typing' : 'Type instead'}</Button>
        {typing && <Box className="speaking-type-fallback"><Textarea rows={3} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type what you heard…" /><Button variant="primary" disabled={!typed.trim() || busy} onClick={() => save(typed)}>Check answer</Button></Box>}
      </Box>}
      {heard && !result && <Box className="speech-feedback" aria-live="polite">
        <Text as="strong">What was heard</Text><Text>{heard.transcript}</Text>
        {heard.pronunciation.unclear_words.length > 0 && <><Text as="strong">These words sounded unclear — try again</Text><Text>{heard.pronunciation.unclear_words.map((word) => word.word).join(' · ')}</Text></>}
        <Text className="speaking-feedback-note">Recording hints can be affected by microphone noise; they are not a pronunciation grade.</Text>
        <Button variant="primary" disabled={busy} onClick={() => save({ completed: true, transcript: heard.transcript, transcription_id: heard.transcription_id })}>Save practice</Button>
        <Button variant="text" onClick={() => { setHeard(null); audio.cancelRecording(); }}>Try again</Button>
      </Box>}
      {result && <Feedback tone={result.correct ? 'correct' : 'incorrect'} title={result.correct ? 'Practice saved.' : 'Not quite — listen again.'} reveal={result.correct ? undefined : result.reveal} onRetry={result.correct ? undefined : reset} />}
      {error && <ErrorMessage message={error} />}
      {audio.recordingError && <ErrorMessage message={audio.recordingError} />}
    </Box>
  </ExerciseShell>;
}
