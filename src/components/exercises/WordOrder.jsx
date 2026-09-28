import React from 'react';
import { getErrorMessage, reportAttempt, shuffle } from '../../api/client.js';
import {
  ExerciseShell,
  ExerciseEyebrow,
  Feedback,
  ErrorMessage,
  Button,
  Text,
  WordToken,
  TokenTray,
} from '../ui';

// Tap-to-order sentence builder for word_order items.
export function WordOrder({ entry, token, onResult }) {
  const [bank, setBank] = React.useState(() => shuffle(entry.tokens || []));
  const [answer, setAnswer] = React.useState([]);
  const [result, setResult] = React.useState(null);
  const startRef = React.useRef(Date.now());

  function take(index) {
    if (result) return;
    setBank((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      setAnswer((prevAnswer) => [...prevAnswer, moved]);
      return next;
    });
  }

  function giveBack(index) {
    if (result) return;
    setAnswer((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      setBank((prevBank) => [...prevBank, moved]);
      return next;
    });
  }

  async function submit() {
    if (result || !answer.length) return;
    try {
      const res = await reportAttempt(entry, answer, token, { durationMs: Date.now() - startRef.current });
      setResult(res);
      onResult?.(res);
    } catch (error) {
      setResult({ error: getErrorMessage(error) });
    }
  }

  function retry() {
    setBank(shuffle(entry.tokens || []));
    setAnswer([]);
    setResult(null);
    startRef.current = Date.now();
  }

  return (
    <ExerciseShell answered={result && !result.error ? (result.correct ? 'correct' : 'wrong') : null}>
      <ExerciseEyebrow level={entry.level} kind="word order" />
      <h2>{entry.prompt}</h2>
      <Text variant="muted">Tap the words in order to build the sentence. Tap a placed word to remove it.</Text>
      <TokenTray variant="answer" label="Your sentence" emptyHint="Your sentence appears here…">
        {answer.map((word, index) => (
          <WordToken key={`a-${index}`} placed disabled={Boolean(result)} onClick={() => giveBack(index)}>
            {word}
          </WordToken>
        ))}
      </TokenTray>
      <TokenTray variant="bank" label="Word bank">
        {bank.map((word, index) => (
          <WordToken key={`b-${index}-${word}`} disabled={Boolean(result)} onClick={() => take(index)}>
            {word}
          </WordToken>
        ))}
      </TokenTray>
      {!result && (
        <Button variant="primary" onClick={submit} disabled={!answer.length}>
          Check answer
        </Button>
      )}
      {result && !result.error && (
        <Feedback
          tone={result.correct ? 'correct' : 'incorrect'}
          title={result.correct ? 'Correct!' : 'Not quite.'}
          reveal={result.correct ? undefined : result.reveal}
          revealLabel="Correct order:"
          onRetry={result.correct ? undefined : retry}
        />
      )}
      {result?.error && <ErrorMessage message={result.error} />}
    </ExerciseShell>
  );
}
