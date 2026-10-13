import React from 'react';
import type { AttemptItemKind } from '../../api/client';
import { reportAttempt } from '../../api/client.js';
import type { SimulateSubmit } from './ExerciseCard';
import { getErrorMessage } from '../../presenters/format.presenter.js';
import { answeredState, hasResult, feedbackTone, elapsedMs } from '../../presenters/attempt.presenter.js';
import { Box, Button, ClipPlayer, ErrorMessage, ExerciseEyebrow, ExerciseShell, Feedback, Text } from '../ui';

export type MediaAsset = {
  kind: 'audio' | 'image' | 'video' | 'document';
  url: string;
  duration_seconds?: number;
  transcript?: string;
  checksum?: string;
};

export type PronunciationDrillItem = {
  id: string;
  item_kind: AttemptItemKind;
  level?: string;
  prompt?: string;
  expected?: string;
  media?: MediaAsset[];
};

export type AttemptResult = {
  correct?: boolean;
  reveal?: string | null;
  error?: string;
};

type PronunciationDrillProps = {
  entry: PronunciationDrillItem;
  token?: string | null;
  onResult?: (result: AttemptResult) => void;
  compact?: boolean;
  sequence?: number;
  simulateSubmit?: SimulateSubmit;
};

// The answer stays hidden until the learner has listened and tried saying it.
export function PronunciationDrill({ entry, token, onResult, compact = false, sequence, simulateSubmit }: PronunciationDrillProps) {
  const [revealed, setRevealed] = React.useState(false);
  const [result, setResult] = React.useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const startRef = React.useRef(Date.now());
  const audio = (entry.media || []).find((media) => media.kind === 'audio');
  const word = entry.expected || audio?.transcript || '';

  async function selfMark(saidItRight: boolean) {
    if (result || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      // Submit the same word the learner judged themselves against: entry.expected
      // when present, otherwise the audio transcript revealed by "Show word".
      // Submitting entry.expected alone would send '' on transcript-only drills,
      // which the attempts endpoint grades as an incorrect attempt.
      const attemptResponse = saidItRight ? word : '';
      const response: AttemptResult = simulateSubmit
        ? await simulateSubmit(entry, attemptResponse)
        : await reportAttempt(entry, attemptResponse, token, {
            durationMs: elapsedMs(startRef.current),
          });
      setResult(response);
      onResult?.(response);
    } catch (attemptError) {
      setError(getErrorMessage(attemptError));
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setResult(null);
    setRevealed(false);
    setError('');
    startRef.current = Date.now();
  }

  return (
    <ExerciseShell variant="pronunciation" answered={answeredState(result)}>
      <Box className="pronunciation-drill">
        <Box className="pronunciation-copy">
          <ExerciseEyebrow level={entry.level} kind={compact && sequence ? `Sound ${String(sequence).padStart(2, '0')}` : 'Quick listen'} />
          {!compact && <Text as="h3" className="pronunciation-title">What do you hear?</Text>}
          {!compact && <Text className="pronunciation-hint">Play the sound, say it aloud, then check yourself.</Text>}
        </Box>

        <Box className="pronunciation-controls">
          <ClipPlayer src={audio?.url} />
          {!revealed && (
            <Button variant="text" onClick={() => setRevealed(true)}>Show word</Button>
          )}
        </Box>

        {revealed && (
          <Box className="pronunciation-reveal">
            <Text as="span" className="pronunciation-answer-label">THE WORD</Text>
            <Text as="strong" className="pronunciation-word">{word || 'No transcript available'}</Text>
            {!result && (
              <Box className="pronunciation-mark-row">
                <Button variant="primary" disabled={submitting} onClick={() => selfMark(true)}>Got it</Button>
                <Button variant="retry" disabled={submitting} onClick={() => selfMark(false)}>Not yet</Button>
              </Box>
            )}
          </Box>
        )}

        {hasResult(result) && (
          <Feedback
            tone={feedbackTone(result)}
            title={result?.correct ? 'Nice — logged as correct.' : 'Logged. Give it another listen.'}
            onRetry={result?.correct ? undefined : retry}
            retryLabel="Try again"
          />
        )}
        {error && <ErrorMessage message={error} />}
      </Box>
    </ExerciseShell>
  );
}
