import React from 'react';
import type { AttemptItemKind } from '../../api/client';
import { reportAttempt } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { AnswerModePicker, AudioPlayer, Box, Button, ClipPlayer, ErrorMessage, ExerciseEyebrow, ExerciseShell, PronunciationComparison, Text, Textarea } from '../ui';
import type { AnswerMode } from '../ui';

export type MediaAsset = { kind: 'audio' | 'image' | 'video' | 'document'; url: string; duration_seconds?: number; transcript?: string; checksum?: string };
export type ListenRepeatItem = { id: string; item_kind: AttemptItemKind; level?: string; prompt?: string; expected?: string; media?: MediaAsset[] };
type AttemptResult = { correct?: boolean; reveal?: string | null; error?: string };
type Props = { entry: ListenRepeatItem; token?: string | null; onResult?: (result: AttemptResult) => void; compact?: boolean; sequence?: number; simulateSubmit?: SimulateSubmit };

export function ListenRepeat({ entry, token, onResult, compact = false, sequence, simulateSubmit }: Props) {
  const [listened, setListened] = React.useState(false);
  const [mode, setMode] = React.useState<AnswerMode>('spoken');
  const [typed, setTyped] = React.useState('');
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const started = React.useRef(Date.now());
  const audio = useAudioRecorder(60);
  const clip = entry.media?.find((media) => media.kind === 'audio');
  const phrase = clip?.transcript || entry.expected || '';

  function choose(next: AnswerMode) {
    if (next === mode || busy || result) return;
    audio.cancelRecording(); setError(''); setMode(next);
  }

  function useSpokenInput() {
    if (busy || result || audio.phase === 'requesting') return;
    if (mode !== 'spoken') choose('spoken');
    if (audio.phase === 'recording' || audio.phase === 'ready') return;
    if (audio.browserSupported) void audio.startRecording();
  }

  function recordAgain() {
    audio.cancelRecording(); setError('');
    void audio.startRecording();
  }

  async function compare() {
    if (busy || result || !listened) return;
    if (mode === 'typed' ? !typed.trim() : !audio.blob) return;
    setBusy(true); setError('');
    try {
      // Spoken mode is fully browser-driven: the pronunciation comparison
      // runs on-device. No Groq transcription — submit completion only.
      const response = mode === 'spoken' ? { completed: true } : typed.trim();
      const saved = simulateSubmit ? await simulateSubmit(entry, response)
        : await reportAttempt(entry, response, token, { durationMs: Date.now() - started.current });
      setResult(saved); onResult?.(saved);
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  function reset() {
    audio.cancelRecording(); setResult(null); setTyped(''); setMode('spoken');
    setError(''); started.current = Date.now();
  }

  const ready = mode === 'typed' ? Boolean(typed.trim()) : Boolean(audio.blob);

  return <ExerciseShell variant="pronunciation" answered={result ? (result.correct ? 'correct' : 'wrong') : null}>
    <Box className="pronunciation-drill">
      <ExerciseEyebrow level={entry.level} kind={compact && sequence ? 'Sound ' + String(sequence).padStart(2, '0') : 'Listen & repeat'} />
      {!compact && <Text as="h3" className="pronunciation-title">Listen, then say what you hear</Text>}
      <Text className="pronunciation-hint">{!listened ? 'Play the sound to begin.' : result ? 'Listen back and compare your answer with the words in the audio.' : 'Choose how to answer, then compare with the words in the audio.'}</Text>
      <ClipPlayer src={clip?.url} onPlay={() => setListened(true)} />
      {listened && !result && <>
        <Box className="answer-mode-row">
          <AnswerModePicker value={mode} onChange={choose} onSpokenAction={useSpokenInput} disabled={busy || audio.phase === 'requesting'}
            spokenLabel={simulateSubmit ? 'Use sample recording' : audio.phase === 'recording' || audio.phase === 'ready' ? 'Record yourself' : 'Start recording'} />
          {mode === 'spoken' && audio.phase === 'recording' && <Button variant="primary" onClick={audio.stopRecording}>Finish recording</Button>}
        </Box>
        {mode === 'typed'
          ? <Textarea rows={3} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type what you heard…" />
          : <>
            {!audio.browserSupported && !simulateSubmit && <Text className="speaking-task-note">Recording is unavailable in this browser. You can type your answer instead.</Text>}
            {audio.phase === 'requesting' && <Text role="status">Requesting microphone…</Text>}
            {audio.phase === 'recording' && <Text role="status">Recording · {audio.elapsed}s</Text>}
            {audio.phase === 'ready' && <Box className="answer-recording-row"><Box className="answer-recording"><Text as="strong">Listen to your recording</Text><AudioPlayer src={audio.previewUrl} /></Box><Button variant="primary" onClick={recordAgain}>Record again</Button></Box>}
          </>}
        {ready && <Box className="answer-submit"><Button variant="primary" wide disabled={busy} onClick={compare}>{busy ? 'Comparing…' : 'Show answer & compare'}</Button></Box>}
      </>}
      {result && <>
        {audio.previewUrl && <Box className="answer-recording"><Text as="strong">Your recording</Text><AudioPlayer src={audio.previewUrl} /></Box>}
        <Box className="answer-comparison" aria-live="polite">
          <Box><Text as="span" className="answer-comparison-label">Words in the audio</Text><Text as="strong">{phrase || 'No transcript available'}</Text></Box>
        </Box>
        {mode === 'typed' && <Text className="speaking-feedback-note">{result.correct ? 'Your typed answer matches.' : 'Compare the words and try the sound again.'}</Text>}
        {mode === 'spoken' && audio.blob && phrase && <PronunciationComparison recording={audio.blob} referenceUrl={clip?.url} targetText={phrase} attemptId={entry.id} />}
        <Button variant="text" onClick={reset}>Try again</Button>
      </>}
      {error && <ErrorMessage message={error} />}
      {audio.recordingError && <ErrorMessage message={audio.recordingError} />}
    </Box>
  </ExerciseShell>;
}
