import React from 'react';
import { getErrorMessage, getSpeechStatus, reportAttempt, uploadSpeech } from '../../api/client.js';
import { getSpeakingLesson } from '../../../shared/speaking-lessons.js';
import { speechFeedback } from '../../../shared/speech-feedback.js';
import * as UIRaw from '../ui';

// delete once FRA-63 lands: unconverted JS UI components don't resolve as
// plain `any` for JSX props under allowJs, so alias them loose here.
const {
  AudioPlayer,
  Box,
  Button,
  Feedback,
  Text,
}: Record<string, React.ComponentType<any>> = UIRaw;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
export interface SpeakingPromptItem {
  id?: string | number | null;
  external_id?: string | null;
  level?: string;
  title?: string;
  prompt?: string;
  instructions?: string;
  expectedPoints?: string[];
  followUpQuestions?: string[];
  [key: string]: unknown;
}

export interface SpeechWordToken {
  text: string;
  status: string;
}

export interface TranscriptionResult {
  transcript?: string;
  transcription_id?: string | number | null;
  feedback?: unknown;
  quota?: {
    user_requests_remaining_today?: number;
    user_audio_seconds_remaining_today?: number;
  } | null;
  [key: string]: unknown;
}

interface SpeakingPromptProps {
  entry: SpeakingPromptItem;
  token?: string | null;
  onResult?: (result: unknown) => void;
}

type RecorderPhase = 'idle' | 'requesting' | 'recording' | 'ready' | 'uploading';

const MAX_BYTES = 8388608;
const FORMATS = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function WordTokens({ title, tokens }: { title: string; tokens: SpeechWordToken[] }) {
  return (
    <Box className="speech-token-row">
      <Text as="strong">{title}</Text>
      <Box className="speech-tokens">
        {tokens.map((word, index) => (
          <Text as="span" key={index} className={`speech-word speech-word-${word.status}`} aria-label={`${word.text}: ${word.status}`}>
            {word.text}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

export function SpeakingPrompt({ entry, token, onResult }: SpeakingPromptProps) {
  const lesson = getSpeakingLesson(entry.external_id, entry.id);
  const [mode, setMode] = React.useState<string>(lesson ? 'guided' : 'free');
  const [phraseIndex, setPhraseIndex] = React.useState<number>(0);
  const phrase = lesson?.phrases[phraseIndex];
  const [result, setResult] = React.useState<unknown>(null);
  const [completionError, setCompletionError] = React.useState<string>('');
  const [recordingError, setRecordingError] = React.useState<string>('');
  const [phase, setPhase] = React.useState<RecorderPhase>('idle');
  const [elapsed, setElapsed] = React.useState<number>(0);
  const [blob, setBlob] = React.useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');
  const [transcription, setTranscription] = React.useState<TranscriptionResult | null>(null);
  const shownFeedback = mode === 'guided' && phrase && transcription
    ? speechFeedback(phrase.french, transcription.transcript) : transcription?.feedback;
  const [quota, setQuota] = React.useState<TranscriptionResult['quota']>(null);
  const [serverAvailable, setServerAvailable] = React.useState<boolean | null>(null);
  const [maxSeconds, setMaxSeconds] = React.useState<number>(60);
  const startedAt = React.useRef<number>(Date.now());
  const mounted = React.useRef<boolean>(true);
  const completed = React.useRef<boolean>(false);
  const stream = React.useRef<MediaStream | null>(null);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const interval = React.useRef<number | null>(null);
  const cutoff = React.useRef<number | null>(null);
  const preview = React.useRef<string | null>(null);
  const points: string[] = entry.expectedPoints || [];
  const followUps: string[] = entry.followUpQuestions || [];
  const browserSupported = typeof window !== 'undefined' && window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';

  const recordingSupported = browserSupported && serverAvailable === true;

  React.useEffect(() => {
    let cancelled = false;
    getSpeechStatus(token).then((status) => { if (!cancelled) { setServerAvailable(Boolean(status.available)); setMaxSeconds(Number(status.max_seconds) || 60); } }).catch(() => { if (!cancelled) setServerAvailable(false); });
    return () => { cancelled = true; };
  }, [token]);

  const releasePreview = React.useCallback(() => {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
    if (mounted.current) {
      setPreviewUrl('');
      setBlob(null);
    }
  }, []);

  const stopTracks = React.useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    if (cutoff.current) clearTimeout(cutoff.current);
    interval.current = null;
    cutoff.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      recorder.current && (recorder.current.onstop = null);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stopTracks();
      if (preview.current) URL.revokeObjectURL(preview.current);
    };
  }, [stopTracks]);

  async function startRecording() {
    if (!recordingSupported || completed.current || phase === 'recording' || phase === 'uploading') return;
    setRecordingError('');
    setTranscription(null);
    releasePreview();
    setPhase('requesting');
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || completed.current) {
        microphone.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = microphone;
      const mimeType = FORMATS.find((value) => MediaRecorder.isTypeSupported?.(value));
      const current = mimeType ? new MediaRecorder(microphone, { mimeType }) : new MediaRecorder(microphone);
      recorder.current = current;
      chunks.current = [];
      current.ondataavailable = (event) => {
        if (event.data?.size) chunks.current.push(event.data);
      };
      current.onstop = () => {
        stopTracks();
        if (!mounted.current) return;
        const recorded = new Blob(chunks.current, { type: current.mimeType || mimeType || '' });
        chunks.current = [];
        if (!recorded.size || recorded.size > MAX_BYTES) {
          setRecordingError(recorded.size ? 'This recording is too large. Try a shorter sample.' : 'No audio was recorded. Please try again.');
          setPhase('idle');
          return;
        }
        preview.current = URL.createObjectURL(recorded);
        setPreviewUrl(preview.current);
        setBlob(recorded);
        setPhase('ready');
      };
      current.onerror = () => {
        current.onstop = null;
        stopTracks();
        if (mounted.current) {
          setRecordingError('The recording failed. Please try again.');
          setPhase('idle');
        }
      };
      current.start();
      const start = Date.now();
      setElapsed(0);
      setPhase('recording');
      interval.current = setInterval(() => setElapsed(Math.min(maxSeconds, Math.floor((Date.now() - start) / 1000))), 250);
      cutoff.current = setTimeout(() => {
        if (current.state === 'recording') current.stop();
      }, Math.max(100, maxSeconds * 1000 - 500));
    } catch {
      stopTracks();
      if (mounted.current) {
        setRecordingError('Microphone access was denied or unavailable. You can still mark this exercise complete.');
        setPhase('idle');
      }
    }
  }

  function stopRecording() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }

  async function transcribe() {
    if (!blob || phase !== 'ready') return;
    setRecordingError('');
    setPhase('uploading');
    try {
      const response: TranscriptionResult = await uploadSpeech(entry.id, blob, token, mode === 'guided' ? phrase?.id : null);
      if (!mounted.current || completed.current) return;
      setTranscription(response);
      setQuota(response.quota);
      releasePreview();
      setPhase('idle');
    } catch (error) {
      if (!mounted.current || completed.current) return;
      setRecordingError(getErrorMessage(error));
      setPhase('ready');
    }
  }

  async function markComplete() {
    if (result) return;
    setCompletionError('');
    try {
      const response: Record<string, unknown> = { completed: true };
      if (transcription) {
        response.transcript = transcription.transcript;
        response.transcription_id = transcription.transcription_id;
      }
      const saved = await reportAttempt(entry, response, token, { durationMs: Date.now() - startedAt.current });
      completed.current = true;
      setResult(saved);
      onResult?.(saved);
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === 'recording') recorder.current.stop();
      }
      stopTracks();
      releasePreview();
    } catch (error) {
      setCompletionError(getErrorMessage(error));
    }
  }

  const choosingDisabled = phase === 'recording' || phase === 'requesting' || phase === 'uploading';
  function choosePractice(nextMode: string, nextIndex: number = phraseIndex) {
    if (choosingDisabled) return;
    releasePreview();
    setTranscription(null);
    setRecordingError('');
    setPhase('idle');
    setMode(nextMode);
    setPhraseIndex(nextIndex);
  }

  return (
    <Box as="article" className="exercise-preview mcq-card speaking-lesson">
      <Box as="header" className="speaking-lesson-heading">
        <Text className="speaking-kicker">{entry.level} · Speaking</Text>
        <Text as="h2">{lesson?.focus || entry.title || 'Speaking practice'}</Text>
      </Box>
      {lesson && (
        <Box className="speaking-route" role="group" aria-label="Speaking practice mode">
          <Box as="button" type="button" className={mode === 'guided' ? 'active' : ''} aria-pressed={mode === 'guided'} onClick={() => choosePractice('guided')} disabled={choosingDisabled || Boolean(result)}>Practice a phrase</Box>
          <Box as="button" type="button" className={mode === 'free' ? 'active' : ''} aria-pressed={mode === 'free'} onClick={() => choosePractice('free')} disabled={choosingDisabled || Boolean(result)}>Answer the prompt</Box>
        </Box>
      )}
      {mode === 'guided' && lesson ? (
        <Box as="section" className="speaking-step" aria-label="Guided phrase practice">
          <Box className="speaking-step-intro">
            <Text as="h3">Choose a phrase</Text>
            <Text>{lesson.strategy}</Text>
          </Box>
          <Box className="speaking-phrase-list" role="group" aria-label="Choose a phrase to practice">
            {lesson.phrases.map((option, index) => (
              <Box as="button" key={option.id} type="button" className={`speaking-phrase ${phraseIndex === index ? 'selected' : ''}`} aria-pressed={phraseIndex === index} onClick={() => choosePractice('guided', index)} disabled={choosingDisabled || Boolean(result)}>
                <Text as="span" className="speaking-choice-mark" aria-hidden="true">{phraseIndex === index ? '✓' : ''}</Text>
                <Box className="speaking-phrase-copy"><Text as="strong">{option.french}</Text><Text as="small">{option.english}</Text></Box>
              </Box>
            ))}
          </Box>
          <Text className="speaking-tip"><Text as="strong">Tip:</Text> {phrase?.tip}</Text>
        </Box>
      ) : (
        <Box as="section" className="speaking-step" aria-label="Open speaking prompt">
          <Text className="speaking-task">{entry.prompt}</Text>
          {entry.instructions && <Text className="speaking-task-note">{entry.instructions}</Text>}
          {points.length > 0 && <Box className="speaking-prep"><Text as="strong">Ideas to include</Text><Box as="ul">{points.map((point, index) => <Box as="li" key={index}>{point}</Box>)}</Box></Box>}
          {followUps.length > 0 && <Box as="details" className="speaking-followups"><Box as="summary">Try a follow-up question</Box><Box as="ul">{followUps.map((question, index) => <Box as="li" key={index}>{question}</Box>)}</Box></Box>}
          <Text className="speaking-task-note">Record up to {maxSeconds} seconds of your answer. Open answers have no single correct sentence.</Text>
        </Box>
      )}
      {!result && (
        <Box className="speaking-action">
          {!browserSupported && <Text className="speaking-task-note">Recording needs microphone support and HTTPS or localhost.</Text>}
          {browserSupported && serverAvailable === false && <Text className="speaking-task-note">Transcription is unavailable. You can still practice aloud and finish this task.</Text>}
          {recordingSupported && (
            <Box className="speech-controls">
              {phase === 'idle' && <Box className="speaking-button-row">
                <Button variant="primary" onClick={startRecording}>{mode === 'guided' ? 'Record phrase' : 'Record answer'}</Button>
                {mode === 'guided' && lesson ? <Button variant="text" onClick={() => choosePractice('free')}>Continue to full prompt →</Button> : <Button variant="text" onClick={markComplete}>Finish practice</Button>}
              </Box>}
              {phase === 'requesting' && <Text role="status">Requesting microphone access…</Text>}
              {phase === 'recording' && <Box className="speaking-button-row"><Text role="status">Recording · {elapsed}s / {maxSeconds}s</Text><Button variant="primary" onClick={stopRecording}>Stop recording</Button></Box>}
              {(phase === 'ready' || phase === 'uploading') && <>
                <AudioPlayer src={previewUrl} />
                <Text className="speaking-privacy">Audio is sent to Groq for transcription. Franco does not save the audio.</Text>
                <Box className="speaking-button-row">
                  <Button variant="primary" onClick={transcribe} disabled={phase === 'uploading'}>{phase === 'uploading' ? 'Transcribing…' : mode === 'guided' ? 'Compare transcript' : 'Show transcript'}</Button>
                  <Button variant="text" onClick={startRecording} disabled={phase === 'uploading'}>Record again</Button>
                  <Button variant="text" onClick={() => { releasePreview(); setPhase('idle'); }} disabled={phase === 'uploading'}>Discard</Button>
                </Box>
              </>}
            </Box>
          )}
          {!recordingSupported && <Box className="speaking-button-row">{mode === 'guided' && lesson ? <Button variant="text" onClick={() => choosePractice('free')}>Continue to full prompt →</Button> : <Button variant="text" onClick={markComplete}>Finish practice</Button>}</Box>}
          {recordingError && <Text className="error-message" role="alert">{recordingError}</Text>}
          {transcription && <Box className="speech-feedback" aria-live="polite">
            <Text as="strong">{mode === 'guided' ? 'Transcript comparison' : 'Your transcript'}</Text>
            {shownFeedback?.mode === 'word_diff' ? <>
              <WordTokens title="Model phrase" tokens={shownFeedback.expected || []} />
              {(shownFeedback.heard || []).some((word) => word.status === 'extra') && <WordTokens title="What was heard" tokens={shownFeedback.heard || []} />}
              <Text className="speaking-feedback-note">Green: matched · Red: not heard · Amber: extra. This reflects the transcript, not a pronunciation grade.</Text>
            </> : <Text>{transcription.transcript}</Text>}
          </Box>}
          {quota && <Box as="details" className="speaking-usage"><Box as="summary">Daily usage</Box><Text>{quota.user_requests_remaining_today} requests and {Math.floor(quota.user_audio_seconds_remaining_today)} audio seconds remain today.</Text></Box>}
          {completionError && <Text className="error-message" role="alert">{completionError}</Text>}
        </Box>
      )}
      {result && <Feedback tone="correct" title="Practice saved."><Text as="span">You can revisit this exercise any time.</Text></Feedback>}
    </Box>
  );
}
