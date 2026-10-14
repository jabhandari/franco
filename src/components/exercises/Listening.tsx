import React from 'react';
import type { AttemptItemKind, SpeechTranscribeResponse } from '../../api/client';
import { getSpeechStatus, reportAttempt, uploadSpeech } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { AnswerModePicker, AudioPlayer, Box, Button, ClipPlayer, ErrorMessage, ExerciseEyebrow, ExerciseShell, Text, Textarea } from '../ui';
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

  function choose(next: AnswerMode) {
    if (next === mode || busy || result) return;
    audio.cancelRecording(); setHeard(null); setError(''); setMode(next);
  }

  function useSpokenInput() {
    if (busy || result || audio.phase === 'requesting') return;
    if (mode !== 'spoken') choose('spoken');
    if (audio.phase === 'recording' || audio.phase === 'ready' || heard) return;
    if (simulateSubmit) {
      setHeard({
        transcription_id: 'preview', transcript: phrase, duration_seconds: 2,
        feedback: { mode: 'word_diff', expected: [], heard: [] },
        pronunciation: { mode: 'recording_hints', unclear_words: [{ word: phrase || 'Bonjour', start: 0, end: 1, reason: 'uncertain_audio' }],
          word_signals: phrase.trim().split(/\s+/).filter(Boolean).map((word) => ({ word, status: 'recognized', audio_confidence_percent: 45 })) },
        quota: { user_requests_remaining_today: 0, user_audio_seconds_remaining_today: 0, resets_at: '' },
      });
      return;
    }
    if (available && audio.browserSupported) void audio.startRecording();
  }

  function recordAgain() {
    audio.cancelRecording(); setHeard(null); setError('');
    void audio.startRecording();
  }

  async function compare() {
    if (busy || result || !listened) return;
    if (mode === 'typed' ? !typed.trim() : !heard && (!audio.blob || !token)) return;
    setBusy(true); setError('');
    try {
      let transcript = mode === 'spoken' ? heard : null;
      if (mode === 'spoken' && !transcript && audio.blob && token) transcript = await uploadSpeech(entry.id, audio.blob, token);
      if (mode === 'spoken' && !transcript) throw new Error('Record an answer before comparing.');
      if (transcript && !heard) setHeard(transcript);
      const response = transcript
        ? { completed: true, transcript: transcript.transcript, transcription_id: transcript.transcription_id }
        : typed.trim();
      const saved = simulateSubmit ? await simulateSubmit(entry, response)
        : await reportAttempt(entry, response, token, { durationMs: Date.now() - started.current });
      setResult(saved); onResult?.(saved);
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  function reset() {
    audio.cancelRecording(); setResult(null); setHeard(null); setTyped(''); setMode('spoken');
    setError(''); started.current = Date.now();
  }

  const ready = mode === 'typed' ? Boolean(typed.trim()) : Boolean(heard || audio.blob);
  const answer = mode === 'spoken' ? heard?.transcript || '' : typed.trim();
  const wordSignals = heard?.pronunciation.word_signals || [];
  const recognizedWords = wordSignals.filter((word) => word.status === 'recognized').length;

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
          {mode === 'spoken' && audio.phase === 'ready' && <Button variant="primary" onClick={recordAgain}>Record again</Button>}
        </Box>
        {mode === 'typed'
          ? <Textarea rows={3} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Type what you heard…" />
          : <>
            {!available && !simulateSubmit && <Text className="speaking-task-note">Recording is unavailable. You can type your answer instead.</Text>}
            {audio.phase === 'requesting' && <Text role="status">Requesting microphone…</Text>}
            {audio.phase === 'recording' && <Text role="status">Recording · {audio.elapsed}s</Text>}
            {audio.phase === 'ready' && <Box className="answer-recording"><Text as="strong">Listen to your recording</Text><AudioPlayer src={audio.previewUrl} /></Box>}
          </>}
        {ready && <Box className="answer-submit"><Button variant="primary" wide disabled={busy} onClick={compare}>{busy ? 'Comparing…' : 'Show answer & compare'}</Button></Box>}
      </>}
      {result && <>
        {audio.previewUrl && <Box className="answer-recording"><Text as="strong">Your recording</Text><AudioPlayer src={audio.previewUrl} /></Box>}
        <Box className="answer-comparison" aria-live="polite">
          <Box><Text as="span" className="answer-comparison-label">Your answer</Text><Text as="strong">{answer || 'No words detected'}</Text></Box>
          <Box><Text as="span" className="answer-comparison-label">Words in the audio</Text><Text as="strong">{phrase || 'No transcript available'}</Text></Box>
        </Box>
        {mode === 'typed' && <Text className="speaking-feedback-note">{result.correct ? 'Your typed answer matches.' : 'Compare the words and try the sound again.'}</Text>}
        {mode === 'spoken' && <Box className="answer-hints">
          <Text as="strong">What Groq recognized</Text>
          {wordSignals.length ? <>
            <Text>Recognition match: {Math.round(recognizedWords / wordSignals.length * 100)}% · {recognizedWords} of {wordSignals.length} expected word{wordSignals.length === 1 ? '' : 's'} recognized.</Text>
            {heard?.pronunciation.audio_confidence_percent !== null && heard?.pronunciation.audio_confidence_percent !== undefined
              && <Text>Groq audio certainty: ~{heard.pronunciation.audio_confidence_percent}% for its transcript.</Text>}
            <Box className="answer-word-signals">
              {wordSignals.map((word, index) => <Box key={`${word.word}-${index}`} className="answer-word-signal">
                <Text as="strong">{word.word}</Text>
                <Text>{word.status === 'recognized' ? 'Recognized' : 'Not recognized'}</Text>
                {word.audio_confidence_percent !== null && <Text>Audio certainty ~{word.audio_confidence_percent}%</Text>}
              </Box>)}
            </Box>
            {heard?.pronunciation.audio_confidence_percent == null && !wordSignals.some((word) => word.audio_confidence_percent !== null)
              && <Text>Groq did not provide an audio certainty value for this recording.</Text>}
          </> : <Text>A word-by-word check is unavailable for this recording.</Text>}
          {heard?.pronunciation.unclear_words.length ? <Text>These words sounded unclear: {heard.pronunciation.unclear_words.map((word) => word.word).join(' · ')}</Text> : null}
          <Text className="speaking-feedback-note">Groq’s certainty is an approximate transcription signal, not a pronunciation grade. Microphone noise can affect it.</Text>
        </Box>}
        <Button variant="text" onClick={reset}>Try again</Button>
      </>}
      {error && <ErrorMessage message={error} />}
      {audio.recordingError && <ErrorMessage message={audio.recordingError} />}
    </Box>
  </ExerciseShell>;
}
