import React from 'react';
import type { AttemptItemKind, SpeechTranscribeResponse } from '../../api/client';
import { getSpeechStatus, reportAttempt, uploadSpeech } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { Mic, RotateCcw, Square } from 'lucide-react';
import { AudioPlayer, Box, Button, ErrorMessage, ExerciseEyebrow, ExerciseShell, Feedback, Text } from '../ui';

type Entry = { id: string; item_kind: AttemptItemKind; level?: string; prompt?: string; expected?: string };
type AttemptResult = { correct?: boolean; reveal?: string | null; error?: string };
type Props = { entry: Entry; token?: string | null; onResult?: (result: AttemptResult) => void; simulateSubmit?: SimulateSubmit };

export function ReadAloud({ entry, token, onResult, simulateSubmit }: Props) {
  const [available, setAvailable] = React.useState(false);
  const [heard, setHeard] = React.useState<SpeechTranscribeResponse | null>(null);
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const recorder = useAudioRecorder(60);
  const started = React.useRef(Date.now());
  const phrase = entry.expected || entry.prompt || '';

  React.useEffect(() => {
    if (!token || simulateSubmit) return;
    let active = true;
    getSpeechStatus(token).then((status) => { if (active) setAvailable(status.available); }).catch(() => {});
    return () => { active = false; };
  }, [token, simulateSubmit]);

  async function transcribe() {
    if (!recorder.blob || !token) return;
    setBusy(true); setError('');
    try { setHeard(await uploadSpeech(entry.id, recorder.blob, token)); recorder.releasePreview(); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!heard || busy) return;
    setBusy(true); setError('');
    try {
      const response = { completed: true, transcript: heard.transcript, transcription_id: heard.transcription_id };
      const saved = simulateSubmit ? await simulateSubmit(entry, response)
        : await reportAttempt(entry, response, token, { durationMs: Date.now() - started.current });
      setResult(saved); onResult?.(saved); recorder.cancelRecording();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  function recordAgain() {
    if (busy) return;
    recorder.cancelRecording(); setHeard(null); setError('');
    if (!simulateSubmit) void recorder.startRecording();
  }

  return <ExerciseShell>
    <Box className="read-aloud-exercise">
      <ExerciseEyebrow level={entry.level} kind="Read aloud" />
      <Text as="h2">Read this aloud</Text>
      <Text className="read-aloud-phrase">{phrase}</Text>
      <Text className="speaking-task-note">Say exactly the text shown. Hints describe what the recording sounded like, not a pronunciation grade.</Text>
      {!result && <>
        {!heard && <Box className="practice-recording-stage">
          {simulateSubmit && <Button variant="primary" onClick={() => setHeard({
            transcription_id: 'preview', transcript: phrase, duration_seconds: 3,
            feedback: { mode: 'word_diff', expected: [], heard: [] },
            pronunciation: { mode: 'recording_hints', unclear_words: [{ word: 'français', start: 1, end: 2, reason: 'uncertain_audio' }] },
            quota: { user_requests_remaining_today: 0, user_audio_seconds_remaining_today: 0, resets_at: '' },
          })} icon={Mic}>Preview recording feedback</Button>}
          {!available && !simulateSubmit && <Text className="speaking-task-note">Recording is unavailable right now. Please try again later.</Text>}
          {available && recorder.browserSupported && recorder.phase === 'idle' && <Button variant="primary" icon={Mic} onClick={recorder.startRecording}>Record reading</Button>}
          {recorder.phase === 'requesting' && <Text role="status">Requesting microphone…</Text>}
          {recorder.phase === 'recording' && <Box className="practice-recording-live"><Text role="status">Recording <Text as="span">{recorder.elapsed}s / 60s</Text></Text><Button variant="primary" icon={Square} onClick={recorder.stopRecording}>Finish recording</Button></Box>}
          {recorder.phase === 'ready' && <><Box className="answer-recording"><Text as="strong">Listen to your recording</Text><AudioPlayer src={recorder.previewUrl} /></Box><Box className="practice-recording-actions"><Button variant="primary" disabled={busy} onClick={transcribe}>{busy ? 'Checking…' : 'Check reading'}</Button><Button variant="text" disabled={busy} icon={RotateCcw} onClick={recordAgain}>Record again</Button></Box></>}
        </Box>}
        {heard && <Box className="speech-feedback" aria-live="polite">
          <Text as="strong">What was heard</Text><Text>{heard.transcript}</Text>
          {heard.pronunciation.unclear_words.length > 0 && <><Text as="strong">These words sounded unclear — try again</Text><Text>{heard.pronunciation.unclear_words.map((word) => word.word).join(' · ')}</Text></>}
          <Button variant="primary" disabled={busy} onClick={save}>Save practice</Button>
          <Button variant="text" disabled={busy} onClick={recordAgain}>Try again</Button>
        </Box>}
      </>}
      {result && <Feedback tone="correct" title="Reading saved." />}
      {recorder.recordingError && <ErrorMessage message={recorder.recordingError} />}
      {error && <ErrorMessage message={error} />}
    </Box>
  </ExerciseShell>;
}
