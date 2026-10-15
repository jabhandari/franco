import React from 'react';
import { ArrowLeft, ArrowRight, Clock3, Flame, RotateCcw, Sparkles, Trophy, Zap } from 'lucide-react';
import { apiGet, apiPost } from '../api/client.js';
import { getErrorMessage } from '../presenters/format.presenter.js';
import type { PuzzleAnswer, PuzzleQuestion, PuzzleRun, PuzzleState, PuzzleSummary } from '../types';
import { Box, Button, ErrorMessage, Text } from '../components/ui';

type Props = { token: string | null; summary: PuzzleSummary | null; onBack: () => void; onUpdated: () => void };
type Stage = 'intro' | 'playing' | 'over';
type Feedback = { correct: boolean; reveal: string; selected: string };
const ROOT = '/api/me/puzzles/verb-sprint/runs';

function clock(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function VerbSprint({ token, summary, onBack, onUpdated }: Props) {
  const [stage, setStage] = React.useState<Stage>('intro');
  const [run, setRun] = React.useState<PuzzleRun | null>(null);
  const [question, setQuestion] = React.useState<PuzzleQuestion | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [now, setNow] = React.useState(Date.now());
  const [clockOffset, setClockOffset] = React.useState(0);
  const advanceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const settlingTimer = React.useRef(false);
  const nextTimerCheck = React.useRef(0);

  React.useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);
  React.useEffect(() => {
    if (stage !== 'playing' || run?.status !== 'active') return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [stage, run?.status]);
  React.useEffect(() => {
    if (stage !== 'playing' || !run?.expires_at || run.status !== 'active' ||
      Date.parse(run.expires_at) > now + clockOffset || settlingTimer.current ||
      Date.now() < nextTimerCheck.current || !token) return;
    settlingTimer.current = true;
    apiGet<PuzzleState>(`${ROOT}/${run.id}`, token)
      .then((state) => {
        setRun(state.run); setClockOffset(Date.parse(state.run.server_now) - Date.now());
        if (state.run.status !== 'active') {
          if (advanceTimer.current) clearTimeout(advanceTimer.current);
          setStage('over'); setFeedback(null); onUpdated();
        } else nextTimerCheck.current = Date.now() + 500;
      })
      .catch((caught) => { nextTimerCheck.current = Date.now() + 3000; setError(getErrorMessage(caught)); })
      .finally(() => { settlingTimer.current = false; });
  }, [stage, run?.id, run?.expires_at, run?.status, now, clockOffset, token, onUpdated]);

  function enter(state: PuzzleState) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRun(state.run); setQuestion(state.question); setFeedback(null); setError('');
    setClockOffset(Date.parse(state.run.server_now) - Date.now()); setNow(Date.now());
    settlingTimer.current = false; nextTimerCheck.current = 0;
    setStage(state.run.status === 'active' ? 'playing' : 'over');
  }

  async function start() {
    if (!token || busy) return;
    setBusy(true); setError('');
    try { enter(await apiPost<PuzzleState>(ROOT, {}, token)); onUpdated(); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function resume() {
    if (!token || !summary?.verb_active || busy) return;
    setBusy(true); setError('');
    try { enter(await apiGet<PuzzleState>(`${ROOT}/${summary.verb_active.id}`, token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function answer(choiceId: string) {
    if (!token || !run || !question || busy || feedback) return;
    setBusy(true); setError('');
    try {
      const state = await apiPost<PuzzleAnswer>(`${ROOT}/${run.id}/answer`, { question_id: question.id, response: choiceId }, token);
      setRun(state.run); setClockOffset(Date.parse(state.run.server_now) - Date.now());
      if (state.timed_out || state.correct === undefined) { setStage('over'); onUpdated(); return; }
      setFeedback({ correct: state.correct, reveal: state.reveal || '', selected: choiceId });
      if (state.run.status !== 'active') onUpdated();
      advanceTimer.current = setTimeout(() => {
        setFeedback(null);
        if (state.run.status === 'active' && state.question) setQuestion(state.question);
        else { setStage('over'); onUpdated(); }
      }, state.correct ? 650 : 950);
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function end() {
    if (!token || !run || busy) return;
    setBusy(true); setError('');
    try {
      const state = await apiPost<PuzzleState>(`${ROOT}/${run.id}/end`, {}, token);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      setRun(state.run); setFeedback(null); setStage('over'); onUpdated();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  const remaining = run?.expires_at ? Math.max(0, Date.parse(run.expires_at) - now - clockOffset) : 60000;
  const isBest = Boolean(run && run.score > 0 && run.score >= (summary?.verb_best ?? 0));

  return <Box className="verb-sprint">
    <Button variant="text" icon={ArrowLeft} onClick={onBack}>All puzzles</Button>
    {stage === 'intro' && <>
      <Box className="verb-sprint-intro">
        <Box className="verb-sprint-intro-copy">
          <Text className="puzzles-kicker"><Zap size={16} /> THE ONE-MINUTE GAME</Text>
          <Text as="h1">Think fast. Conjugate faster.</Text>
          <Text>Choose the right present-tense verb form before the clock runs out. Keep a streak alive and beat your best score.</Text>
          <Box className="puzzles-pills"><Text as="span"><Clock3 size={15} /> 60 seconds</Text><Text as="span"><Flame size={15} /> Build a streak</Text><Text as="span"><Sparkles size={15} /> Gets harder</Text></Box>
          <Box className="puzzles-card-actions">
            {summary?.verb_active && <Button variant="primary" icon={ArrowRight} iconPosition="after" onClick={() => void resume()} disabled={busy}>Resume sprint</Button>}
            <Button variant={summary?.verb_active ? 'text' : 'primary'} icon={Zap} onClick={() => void start()} disabled={busy}>{busy ? 'Loading…' : 'Start sprint'}</Button>
          </Box>
        </Box>
        <Box className="verb-sprint-intro-record"><Trophy size={30} /><Text as="span">PERSONAL BEST</Text><Text as="strong">{summary?.verb_best ?? '—'}</Text><Text as="small">correct in one minute</Text></Box>
      </Box>
      <Text className="verb-sprint-help">A wrong answer breaks your streak, but the sprint keeps going. Answers and time are checked by the server.</Text>
    </>}
    {stage === 'playing' && run && question && <>
      <Box className="verb-sprint-run-head"><Box><Text className="puzzles-kicker">VERB SPRINT · PRESENT TENSE</Text><Text as="h1">Find the right form.</Text></Box><Button variant="text" onClick={() => void end()} disabled={busy}>End sprint</Button></Box>
      <Box className="verb-sprint-scoreboard">
        <Box><Text as="small">CORRECT</Text><Text as="strong">{run.score}</Text></Box>
        <Box><Text as="small">STREAK</Text><Text as="strong"><Flame size={23} /> {run.combo}</Text></Box>
        <Box className={remaining < 15000 ? 'is-urgent' : ''}><Text as="small">TIME LEFT</Text><Text as="strong">{clock(remaining)}</Text></Box>
      </Box>
      <Box className="verb-sprint-question" aria-live="polite">
        <Box className="verb-sprint-question-label"><Text as="span">QUESTION {run.answered + (feedback ? 0 : 1)}</Text><Text as="span">{question.level}</Text></Box>
        <Text as="h2">{question.prompt}</Text>
        <Text>Which form completes this pairing?</Text>
        {question.kind === 'choice' && <Box className="verb-sprint-choices">{question.choices.map((choice, index) => <Box as="button" type="button" key={choice.id} disabled={busy || Boolean(feedback)} className={`verb-sprint-choice${feedback?.selected === choice.id ? feedback.correct ? ' is-correct' : ' is-wrong' : ''}`} onClick={() => void answer(choice.id)}><Text as="span">{index + 1}</Text><Text as="strong">{choice.text}</Text><ArrowRight size={17} aria-hidden="true" /></Box>)}</Box>}
        {feedback && <Box className={`verb-sprint-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status">{feedback.correct ? 'Correct! Keep the streak going.' : `Not quite. The right form is ${feedback.reveal}.`}</Box>}
      </Box>
    </>}
    {stage === 'over' && run && <Box className="verb-sprint-over">
      <Box className="verb-sprint-over-icon"><Trophy size={38} /></Box>
      <Text className="puzzles-kicker">VERB SPRINT · RUN COMPLETE</Text>
      <Text as="h1">{run.end_reason === 'time' ? 'Time’s up!' : run.end_reason === 'questions_exhausted' ? 'You cleared the deck!' : 'Sprint ended.'}</Text>
      <Text>You got {run.score} right in one minute. Ready to beat it?</Text>
      <Box className="verb-sprint-over-score"><Text as="strong">{run.score}</Text><Text as="span">CORRECT ANSWERS</Text>{isBest && <Text as="small"><Sparkles size={16} /> Personal best</Text>}</Box>
      <Box className="puzzles-over-stats"><Text><Flame size={17} /> Best streak {run.best_combo}</Text><Text><Zap size={17} /> {run.answered} attempted</Text></Box>
      <Box className="puzzles-over-actions"><Button variant="primary" icon={RotateCcw} onClick={() => { setStage('intro'); setError(''); }}>Try again</Button><Button variant="text" onClick={onBack}>All puzzles</Button></Box>
    </Box>}
    {error && <ErrorMessage message={error} />}
  </Box>;
}
