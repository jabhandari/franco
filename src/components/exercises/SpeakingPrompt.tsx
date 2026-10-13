import React from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import type { AttemptItemKind } from '../../api/client';
import { getErrorMessage, getSpeechStatus, reportAttempt, uploadSpeech } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getSpeakingLesson } from '../../../shared/speaking-lessons.js';
import { speechFeedback } from '../../../shared/speech-feedback.js';
import * as UIRaw from '../ui';
import { Textarea } from '../ui';

type AudioPlayerProps = {
  src?: string;
};

// Box and Text are polymorphic (`as`) and take a wide mix of HTML/SVG/aria
// props in this file (aria-*, viewBox, d, …). The union covers them without
// an escape-hatch index signature.
type BoxProps = React.AllHTMLAttributes<HTMLElement> &
  React.SVGAttributes<SVGSVGElement> & {
    as?: string;
  };

type ButtonProps = {
  variant?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
};

type FeedbackProps = {
  tone?: 'correct' | 'incorrect' | 'info';
  title?: string;
  children?: React.ReactNode;
};

type TextProps = React.AllHTMLAttributes<HTMLElement> &
  React.SVGAttributes<SVGSVGElement> & {
    as?: string;
  };

// Interim ui/ bridge (deleted once FRA-63 lands): src/components/ui is still
// .jsx, so its exports resolve as `any` under allowJs and precise prop types
// are unknowable from this file. Justification for each `as` below: the
// assertion restores a typed surface — precise where the props are narrow,
// HTML/SVG/aria attribute unions where they vary widely — until the library
// converts to TSX, when this block is removed.
const AudioPlayer = UIRaw.AudioPlayer as React.ComponentType<AudioPlayerProps>;
const Box = UIRaw.Box as React.ComponentType<BoxProps>;
const Button = UIRaw.Button as React.ComponentType<ButtonProps>;
const Feedback = UIRaw.Feedback as React.ComponentType<FeedbackProps>;
const Text = UIRaw.Text as React.ComponentType<TextProps>;

// Minimal local content-item shapes (FRA-64). The canonical API types are
// owned by FRA-61 — see "Notes for FRA-68" in the PR description.
//
// Entry shape after sanitizeEntry() (src/presenters/entry.presenter.js):
// server snake_case fields normalized to camelCase where this component
// reads them (expectedPoints/followUpQuestions).
export type SpeakingPromptItem = {
  id: string;
  item_kind: AttemptItemKind;
  external_id?: string | null;
  level?: string;
  title?: string;
  prompt?: string;
  instructions?: string;
  expectedPoints?: string[];
  followUpQuestions?: string[];
};

// Word statuses produced by speechFeedback() (shared/speech-feedback.js):
// 'matched' (green) | 'missed' (red, not heard) | 'extra' (amber).
export type SpeechWordToken = {
  text: string;
  status: 'matched' | 'missed' | 'extra';
};

// speechFeedback() returns { mode: 'transcript_only' } when there is no
// model phrase, otherwise the word_diff token arrays.
export type SpeechFeedback =
  | { mode: 'transcript_only' }
  | { mode: 'word_diff'; expected: SpeechWordToken[]; heard: SpeechWordToken[] };

// Response shape of POST /api/speech/transcribe (server/speech.js).
export type TranscriptionResult = {
  transcript?: string;
  transcription_id?: string | number | null;
  feedback?: SpeechFeedback;
  quota?: {
    user_requests_remaining_today?: number;
    user_audio_seconds_remaining_today?: number;
    resets_at?: string;
  } | null;
};

// Shape saved by markComplete via reportAttempt: a completion marker plus
// the optional transcription it was built from. This is the request payload;
// the server's attempt response (stored in `result` below) has the
// AttemptResult shape.
export type SavedAttemptResult = {
  typed_text?: string;
  completed: boolean;
  transcript?: string;
  transcription_id?: string;
};

// Attempt rows returned by POST /api/me/attempts (server/index.js):
// { attempt, correct, score, reveal, next_due_at }. This component only
// uses the result as a completion marker, but the value flowing through
// onResult is the server response — the same shape the other renderers use.
export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type SpeakingPromptProps = {
  entry: SpeakingPromptItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
  simulateSubmit?: SimulateSubmit;
};

// Lesson shape from shared/speaking-lessons.js (getSpeakingLesson): six
// authored models keyed by external_id, each with practice phrases.
type SpeakingPhrase = {
  id: string;
  french: string;
  english: string;
  tip: string;
};

type SpeakingLesson = {
  focus: string;
  strategy: string;
  phrases: SpeakingPhrase[];
};

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

export function SpeakingPrompt({ entry, token, onResult, simulateSubmit }: SpeakingPromptProps) {
  const lesson: SpeakingLesson | null = getSpeakingLesson(entry.external_id, entry.id);
  const [mode, setMode] = React.useState<string>(lesson ? 'guided' : 'free');
  const [phraseIndex, setPhraseIndex] = React.useState<number>(0);
  const phrase = lesson?.phrases[phraseIndex];
  const [typing,setTyping]=React.useState(false);
  const [typedText,setTypedText]=React.useState('');
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [completionError, setCompletionError] = React.useState<string>('');
  const [transcription, setTranscription] = React.useState<TranscriptionResult | null>(null);
  const shownFeedback = mode === 'guided' && phrase && transcription
    ? speechFeedback(phrase.french, transcription.transcript) : transcription?.feedback;
  const [quota, setQuota] = React.useState<TranscriptionResult['quota']>(null);
  const [serverAvailable, setServerAvailable] = React.useState<boolean | null>(null);
  const [maxSeconds, setMaxSeconds] = React.useState<number>(60);
  const startedAt = React.useRef<number>(Date.now());
  const completed = React.useRef<boolean>(false);
  const audio = useAudioRecorder(maxSeconds);
  const {phase,setPhase,recordingError,setRecordingError,elapsed,blob,previewUrl,browserSupported,mounted,releasePreview,cancelRecording,stopRecording} = audio;
  const points: string[] = entry.expectedPoints || [];
  const followUps: string[] = entry.followUpQuestions || [];
  const recordingSupported = browserSupported && serverAvailable === true;

  React.useEffect(() => {
    let cancelled = false;
    getSpeechStatus(token).then((status) => { if (!cancelled) { setServerAvailable(Boolean(status.available)); setMaxSeconds(Number(status.max_seconds) || 60); } }).catch(() => { if (!cancelled) setServerAvailable(false); });
    return () => { cancelled = true; };
  }, [token]);

  async function startRecording() {
    if(!recordingSupported || completed.current) return;
    setTranscription(null);
    await audio.startRecording();
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

  async function markComplete(typedAnswer = '') {
    if (result) return;
    setCompletionError('');
    try {
      const response: SavedAttemptResult = { completed: true };
      if(typeof typedAnswer==='string' && typedAnswer.trim()) {response.typed_text=typedAnswer.trim();}
      else if (transcription) {
        response.transcript = transcription.transcript;
        if (transcription.transcription_id != null) {
          response.transcription_id = String(transcription.transcription_id);
        }
      }
      const saved = simulateSubmit
        ? await simulateSubmit(entry, response)
        : await reportAttempt(entry, response, token, { durationMs: Date.now() - startedAt.current });
      completed.current = true;
      setResult(saved);
      onResult?.(saved);
      cancelRecording();
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
          <Button variant="text" disabled={choosingDisabled} onClick={()=>setTyping(value=>!value)}>{typing ? 'Hide typing' : 'Type instead'}</Button>
          {typing && <Box className="speaking-type-fallback"><Textarea rows={4} value={typedText} onChange={event=>setTypedText(event.target.value)} aria-label="Typed speaking answer" placeholder="Write the phrase you would say in French…"/><Button variant="primary" disabled={!typedText.trim()} onClick={()=>markComplete(typedText)}>Submit typed answer</Button></Box>}
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
