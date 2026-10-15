import React from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Flame, Heart, Map, RotateCcw, Sparkles, Swords, Trophy, X, Zap } from 'lucide-react';
import { apiGet, apiPost } from '../api/client.js';
import { getErrorMessage } from '../presenters/format.presenter.js';
import type { PuzzleAnswer, PuzzleQuestion, PuzzleRun, PuzzleState, PuzzleSummary } from '../types';
import { AudioPlayer, Box, Button, ErrorMessage, GameArtImage, Text } from '../components/ui';
import { VerbSprint } from './VerbSprint';
import { FrenchExpedition } from './FrenchExpedition';

type Stage = 'gallery' | 'setup' | 'playing' | 'over' | 'verb' | 'expedition';
type Feedback = { correct: boolean; reveal: string; next: PuzzleQuestion | null; selected: string | null };
type Props = { token: string | null; onRace: () => void };

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const KIND_LABELS: Record<string, string> = {
  multiple_choice: 'Choose the answer', word_order: 'Build the sentence', reading: 'Reading', listening: 'Listening',
};
const LIFE_OPTIONS: Array<1 | 3 | 5> = [1, 3, 5];
const TIME_OPTIONS: Array<3 | 5 | null> = [3, 5, null];

function clockLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function Puzzles({ token, onRace }: Props) {
  const [stage, setStage] = React.useState<Stage>('gallery');
  const [summary, setSummary] = React.useState<PuzzleSummary | null>(null);
  const [run, setRun] = React.useState<PuzzleRun | null>(null);
  const [question, setQuestion] = React.useState<PuzzleQuestion | null>(null);
  const [lives, setLives] = React.useState<1 | 3 | 5>(3);
  const [minutes, setMinutes] = React.useState<3 | 5 | null>(3);
  const [selectedTokens, setSelectedTokens] = React.useState<string[]>([]);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [now, setNow] = React.useState(Date.now());
  const [clockOffset, setClockOffset] = React.useState(0);
  const settlingTimer = React.useRef(false);
  const nextTimerCheck = React.useRef(0);

  const refreshSummary = React.useCallback(async () => {
    if (!token) return;
    try { setSummary(await apiGet<PuzzleSummary>('/api/me/puzzles', token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
  }, [token]);

  React.useEffect(() => { void refreshSummary(); }, [refreshSummary]);
  React.useEffect(() => {
    if (stage !== 'playing' || !run?.expires_at || run.status !== 'active') return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [stage, run?.expires_at, run?.status]);
  React.useEffect(() => {
    if (stage !== 'playing' || !run?.expires_at || run.status !== 'active' ||
      Date.parse(run.expires_at) > now + clockOffset || settlingTimer.current ||
      Date.now() < nextTimerCheck.current || !token) return;
    settlingTimer.current = true;
    apiGet<PuzzleState>(`/api/me/puzzles/runs/${run.id}`, token)
      .then((state) => {
        setRun(state.run); setClockOffset(Date.parse(state.run.server_now) - Date.now());
        if (state.run.status !== 'active') { setStage('over'); setFeedback(null); void refreshSummary(); }
      })
      .catch((caught) => { nextTimerCheck.current = Date.now() + 3000; setError(getErrorMessage(caught)); })
      .finally(() => { settlingTimer.current = false; });
  }, [stage, run?.id, run?.expires_at, run?.status, now, clockOffset, token, refreshSummary]);

  function enterRun(state: PuzzleState) {
    setRun(state.run); setClockOffset(Date.parse(state.run.server_now) - Date.now());
    setQuestion(state.question); setSelectedTokens([]); setFeedback(null);
    setError(''); setNow(Date.now()); settlingTimer.current = false; nextTimerCheck.current = 0;
    setStage(state.run.status === 'active' ? 'playing' : 'over');
  }

  async function start() {
    if (!token || busy) return;
    setBusy(true); setError('');
    try {
      enterRun(await apiPost<PuzzleState>('/api/me/puzzles/runs', { lives, minutes }, token));
      void refreshSummary();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function resume() {
    if (!token || !summary?.active || busy) return;
    setBusy(true); setError('');
    try { enterRun(await apiGet<PuzzleState>(`/api/me/puzzles/runs/${summary.active.id}`, token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function submit(response: string | string[], selected: string | null = null) {
    if (!token || !run || !question || busy || feedback) return;
    setBusy(true); setError('');
    try {
      const result = await apiPost<PuzzleAnswer>(`/api/me/puzzles/runs/${run.id}/answer`,
        { question_id: question.id, response }, token);
      setRun(result.run); setClockOffset(Date.parse(result.run.server_now) - Date.now());
      if (result.timed_out || result.correct === undefined) {
        setStage('over'); void refreshSummary();
      } else {
        setFeedback({ correct: result.correct, reveal: result.reveal || '', next: result.question, selected });
        if (result.run.status !== 'active') void refreshSummary();
      }
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  function advance() {
    if (!feedback || !run) return;
    if (run.status !== 'active' || !feedback.next) { setFeedback(null); setStage('over'); void refreshSummary(); return; }
    setQuestion(feedback.next); setSelectedTokens([]); setFeedback(null);
  }

  async function leave() {
    if (!token || !run || busy) return;
    setBusy(true); setError('');
    try {
      const result = await apiPost<PuzzleState>(`/api/me/puzzles/runs/${run.id}/end`, {}, token);
      setRun(result.run); setFeedback(null); setStage('over'); void refreshSummary();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  const configBest = summary?.records.find((record) => record.lives === lives && record.minutes === minutes)?.best ?? 0;
  const remaining = run?.expires_at ? Math.max(0, Date.parse(run.expires_at) - now - clockOffset) : null;
  const priorBest = run ? summary?.records.find((record) => record.lives === run.lives && record.minutes === run.minutes)?.best ?? 0 : 0;
  const newBest = Boolean(summary && run && run.score > 0 && run.score >= priorBest);
  const currentLevel = question?.level || LEVELS[Math.min(5, Math.floor((run?.score || 0) / 4))];
  const levelIndex = Math.max(0, LEVELS.indexOf(currentLevel));

  return <Box as="section" className="puzzles-page">
    {stage === 'gallery' && <>
      <Box className="puzzles-hero">
        <Box className="puzzles-hero-copy">
          <Text className="puzzles-kicker"><Sparkles size={16} aria-hidden="true" /> A NEW WAY TO PRACTICE</Text>
          <Text as="h1">Make every answer count.</Text>
          <Text>Quick French puzzles, rising difficulty, and just enough pressure to keep you sharp.</Text>
          <Box className="puzzles-hero-facts"><Text as="span">One question at a time</Text><Text as="span">Your pace, your rules</Text></Box>
        </Box>
        <Box className="puzzles-best" aria-label={`Your best French Rush score is ${summary?.best ?? 0}`}>
          <Trophy size={26} aria-hidden="true" />
          <Text as="span">BEST FRENCH RUSH</Text>
          <Text as="strong">{summary?.best ?? '—'}</Text>
          <Text as="small">correct answers</Text>
        </Box>
      </Box>

      <Box className="puzzles-gallery-layout"><Box className="puzzles-solo-games">
      <Box className="puzzles-section-heading"><Box><Text className="puzzles-kicker">CHOOSE A PUZZLE</Text><Text as="h2">Ready when you are</Text></Box><Text>3 games available</Text></Box>
      <Box className="puzzles-game-card">
        <Box className="puzzles-game-art" aria-hidden="true"><Box className="puzzles-art-ring"><GameArtImage game="rush" /><Zap size={46} /></Box><Text as="span">A1 → C2</Text></Box>
        <Box className="puzzles-game-copy">
          <Text className="puzzles-kicker">THE ENDURANCE GAME</Text>
          <Text as="h3">French Rush</Text>
          <Text>Build a streak of correct answers. Miss a question, lose a life. How far can you climb?</Text>
          <Box className="puzzles-pills"><Text as="span"><Heart size={15} /> 1, 3 or 5 lives</Text><Text as="span"><Clock3 size={15} /> Timed or unlimited</Text><Text as="span"><Zap size={15} /> Gets harder</Text></Box>
          <Box className="puzzles-card-actions">
            {summary?.active && <Button variant="primary" onClick={() => void resume()} disabled={busy} icon={ArrowRight} iconPosition="after">Resume run</Button>}
            <Button variant={summary?.active ? 'text' : 'primary'} onClick={() => { setError(''); setStage('setup'); }} icon={ChevronRight} iconPosition="after">{summary?.active ? 'Start a new run' : 'Choose your challenge'}</Button>
          </Box>
        </Box>
      </Box>
      <Box className="puzzles-game-card puzzles-verb-card">
        <Box className="puzzles-game-art puzzles-verb-art" aria-hidden="true"><Box className="puzzles-art-ring"><GameArtImage game="sprint" /><Flame size={46} /></Box><Text as="span">60 SECONDS</Text></Box>
        <Box className="puzzles-game-copy">
          <Text className="puzzles-kicker">THE SPEED GAME</Text>
          <Text as="h3">Verb Sprint</Text>
          <Text>Race through present-tense conjugations. Correct answers build your streak; a miss resets it, but the clock keeps running.</Text>
          <Box className="puzzles-pills"><Text as="span"><Clock3 size={15} /> One minute</Text><Text as="span"><Flame size={15} /> Streaks</Text><Text as="span"><Trophy size={15} /> Best {summary?.verb_best ?? '—'}</Text></Box>
          <Box className="puzzles-card-actions"><Button variant="primary" onClick={() => { setError(''); setStage('verb'); }} icon={ChevronRight} iconPosition="after">{summary?.verb_active ? 'Resume or restart' : 'Play Verb Sprint'}</Button></Box>
        </Box>
      </Box>

      </Box>
      <Box className="puzzles-friend-promo">
        <Box className="puzzles-game-art" aria-hidden="true"><Box className="puzzles-art-ring"><GameArtImage game="race" /><Swords size={46} /></Box><Text as="span">TWO PLAYERS</Text></Box>
        <Box className="puzzles-friend-copy">
          <Text className="puzzles-kicker">PLAY TOGETHER</Text>
          <Text as="h3">Race a friend</Text>
          <Text>Create a room, send its invite link or QR code, then answer the same French questions at your own pace. First to the finish has bragging rights.</Text>
          <Box className="puzzles-pills"><Text as="span"><Swords size={15} /> Head to head</Text><Text as="span"><Clock3 size={15} /> Your rules</Text><Text as="span"><Heart size={15} /> Lives or timer</Text></Box>
          <Box className="puzzles-card-actions"><Button variant="primary" onClick={onRace} icon={ChevronRight} iconPosition="after">Invite a friend</Button></Box>
      <Box className="puzzles-game-card puzzles-expedition-card">
        <Box className="puzzles-game-art puzzles-expedition-art" aria-hidden="true"><Box className="puzzles-art-ring"><Map size={46} /></Box><Text as="span">10 ENCOUNTERS</Text></Box>
        <Box className="puzzles-game-copy">
          <Text className="puzzles-kicker">THE CHOOSE-YOUR-PATH GAME</Text>
          <Text as="h3">French Expedition</Text>
          <Text>Cross a changing trail of French challenges. Take the safe path, risk a harder climb for more points, or rest at camp to regain a life.</Text>
          <Box className="puzzles-pills"><Text as="span"><Heart size={15} /> 3 lives</Text><Text as="span"><Map size={15} /> Your route, your run</Text><Text as="span"><Trophy size={15} /> Best {summary?.expedition_best ?? '—'}</Text></Box>
          <Box className="puzzles-card-actions"><Button variant="primary" onClick={() => { setError(''); setStage('expedition'); }} icon={ChevronRight} iconPosition="after">{summary?.expedition_active ? 'Resume or restart' : 'Explore the trail'}</Button></Box>
        </Box>
      </Box>
        </Box>
      </Box>
      </Box>
    </>}

    {stage === 'expedition' && <FrenchExpedition token={token} summary={summary} onBack={() => { setStage('gallery'); void refreshSummary(); }} onUpdated={refreshSummary} />}

    {stage === 'verb' && <VerbSprint token={token} summary={summary} onBack={() => { setStage('gallery'); void refreshSummary(); }} onUpdated={refreshSummary} />}

    {stage === 'setup' && <>
      <Button variant="text" icon={ArrowLeft} onClick={() => { setStage('gallery'); setError(''); }}>All puzzles</Button>
      <Box className="puzzles-setup-heading"><Text className="puzzles-kicker">FRENCH RUSH · SET YOUR RULES</Text><Text as="h1">Your run, your rules.</Text><Text>Pick your safety net and set the clock. You can always try again.</Text></Box>
      <Box className="puzzles-setup-grid">
        <Box className="puzzles-setting-card">
          <Box className="puzzles-setting-icon"><Heart size={22} aria-hidden="true" /></Box>
          <Text as="h2">How many lives?</Text><Text>Every wrong answer costs one life.</Text>
          <Box className="puzzles-option-grid" role="group" aria-label="Number of lives">
            {LIFE_OPTIONS.map((count) => <Box as="button" type="button" key={count} className={`puzzles-option${lives === count ? ' is-selected' : ''}`} aria-pressed={lives === count} onClick={() => setLives(count)}><Heart size={17} aria-hidden="true" /><Text as="strong">{count}</Text><Text as="small">{count === 1 ? 'Sudden death' : count === 3 ? 'Classic' : 'Room to learn'}</Text></Box>)}
          </Box>
        </Box>
        <Box className="puzzles-setting-card">
          <Box className="puzzles-setting-icon"><Clock3 size={22} aria-hidden="true" /></Box>
          <Text as="h2">Race the clock?</Text><Text>Your run ends when time runs out.</Text>
          <Box className="puzzles-option-grid" role="group" aria-label="Time limit">
            {TIME_OPTIONS.map((duration) => <Box as="button" type="button" key={duration ?? 'none'} className={`puzzles-option${minutes === duration ? ' is-selected' : ''}`} aria-pressed={minutes === duration} onClick={() => setMinutes(duration)}><Clock3 size={17} aria-hidden="true" /><Text as="strong">{duration ?? '∞'}</Text><Text as="small">{duration ? `${duration} minutes` : 'No timer'}</Text></Box>)}
          </Box>
        </Box>
      </Box>
      <Box className="puzzles-launch-bar"><Box><Text as="strong">Best with these rules: {configBest}</Text><Text>Start easy. Questions get harder as you score.</Text></Box><Button variant="primary" onClick={() => void start()} disabled={busy} icon={ArrowRight} iconPosition="after">{busy ? 'Starting…' : 'Start French Rush'}</Button></Box>
    </>}

    {stage === 'playing' && run && question && <>
      <Box className="puzzles-run-head"><Box><Text className="puzzles-kicker">FRENCH RUSH · QUESTION {run.answered + (feedback ? 0 : 1)}</Text><Text as="h1">Keep going.</Text></Box><Button variant="text" onClick={() => void leave()} disabled={busy}>End run</Button></Box>
      <Box className="puzzles-scoreboard">
        <Box><Text as="small">SCORE</Text><Text as="strong">{run.score}</Text></Box>
        <Box><Text as="small">LIVES LEFT</Text><Box className="puzzles-hearts" aria-label={`${run.lives_left} of ${run.lives} lives left`}>{Array.from({ length: run.lives }, (_, index) => <Heart key={index} size={24} className={index >= run.lives_left ? 'is-lost' : ''} fill="currentColor" aria-hidden="true" />)}</Box></Box>
        <Box className={remaining !== null && remaining < 30000 ? 'is-urgent' : ''}><Text as="small">TIME LEFT</Text><Text as="strong">{remaining === null ? '∞' : clockLabel(remaining)}</Text></Box>
      </Box>
      <Box className="puzzles-level-track" aria-label={`Current level ${currentLevel}`}><Text as="span">A1</Text><Box className="puzzles-track-line"><Box className={`puzzles-track-fill level-${levelIndex}`} /></Box><Text as="span">C2</Text><Text as="strong">{currentLevel}</Text></Box>
      <Box className="puzzles-question-card">
        <Box className="puzzles-question-top"><Text className="puzzles-kicker">{KIND_LABELS[question.type] || (question.kind === 'word_order' ? 'Build the sentence' : 'Choose the answer')}</Text><Text as="span">{question.level}</Text></Box>
        <Text as="h2">{question.prompt}</Text>
        {question.context && <Text className="puzzles-context">{question.context}</Text>}
        {question.instructions && <Text className="puzzles-instructions">{question.instructions}</Text>}
        {question.audio_url && <Box className="puzzles-audio"><AudioPlayer src={question.audio_url} /></Box>}
        {question.kind === 'choice' && <Box className="puzzles-choices">
          {question.choices.map((choice, index) => <Box as="button" type="button" key={choice.id} disabled={busy || Boolean(feedback)} className={`puzzles-choice${feedback?.selected === choice.id ? feedback.correct ? ' is-correct' : ' is-wrong' : ''}`} onClick={() => void submit(choice.id, choice.id)}><Text as="span">{String.fromCharCode(65 + index)}</Text><Text as="strong">{choice.text}</Text><ChevronRight size={20} aria-hidden="true" /></Box>)}
        </Box>}
        {question.kind === 'word_order' && <>
          <Box className="puzzles-assembled" aria-label="Your sentence">{selectedTokens.length ? selectedTokens.map((id) => { const token = question.tokens.find((item) => item.id === id); return <Box as="button" type="button" key={id} disabled={busy || Boolean(feedback)} onClick={() => setSelectedTokens((previous) => previous.filter((item) => item !== id))}>{token?.text}</Box>; }) : <Text>Tap the words below to build your sentence.</Text>}</Box>
          {selectedTokens.length < question.tokens.length && <Box className="puzzles-token-bank">{question.tokens.filter((token) => !selectedTokens.includes(token.id)).map((token) => <Box as="button" type="button" key={token.id} disabled={busy || Boolean(feedback)} onClick={() => setSelectedTokens((previous) => [...previous, token.id])}>{token.text}</Box>)}</Box>}
          {!feedback && <Box className="puzzles-order-actions"><Button variant="text" disabled={!selectedTokens.length || busy} onClick={() => setSelectedTokens((previous) => previous.slice(0, -1))}>Undo last</Button><Button variant="primary" disabled={busy || selectedTokens.length !== question.tokens.length} onClick={() => void submit(selectedTokens.map((id) => question.tokens.find((token) => token.id === id)?.text || ''))}>{busy ? 'Checking…' : 'Check answer'}</Button></Box>}
        </>}
        {feedback && <Box className={`puzzles-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status">
          <Box className="puzzles-feedback-icon">{feedback.correct ? <Check size={22} aria-hidden="true" /> : <X size={22} aria-hidden="true" />}</Box>
          <Box><Text as="strong">{feedback.correct ? 'That’s right! +1 point' : 'Not quite. One life lost.'}</Text><Text>Answer: {feedback.reveal}</Text></Box>
          <Button variant="primary" onClick={advance} icon={ArrowRight} iconPosition="after">{run.status === 'active' ? 'Next question' : 'See results'}</Button>
        </Box>}
      </Box>
    </>}

    {stage === 'over' && run && <Box className="puzzles-over">
      <Box className="puzzles-over-icon"><Trophy size={38} aria-hidden="true" /></Box>
      <Text className="puzzles-kicker">FRENCH RUSH · RUN COMPLETE</Text>
      <Text as="h1">{run.end_reason === 'time' ? 'Time’s up.' : run.end_reason === 'lives' ? 'No lives left.' : run.end_reason === 'questions_exhausted' ? 'You cleared the board!' : 'Run ended.'}</Text>
      <Text>You got {run.score} question{run.score === 1 ? '' : 's'} right. Every attempt helps you get sharper.</Text>
      <Box className="puzzles-over-score"><Text as="strong">{run.score}</Text><Text as="span">CORRECT ANSWERS</Text>{newBest && <Text as="small"><Sparkles size={16} /> Your best with these rules</Text>}</Box>
      <Box className="puzzles-over-stats"><Text><Check size={17} /> {run.score} correct</Text><Text><X size={17} /> {run.answered - run.score} missed</Text><Text><Heart size={17} /> {run.lives} lives</Text><Text><Clock3 size={17} /> {run.minutes ? `${run.minutes} min` : 'Unlimited'}</Text></Box>
      <Box className="puzzles-over-actions"><Button variant="primary" icon={RotateCcw} onClick={() => { setStage('setup'); setError(''); }}>Play again</Button><Button variant="text" onClick={() => { setStage('gallery'); setError(''); }}>All puzzles</Button></Box>
    </Box>}
    {error && <ErrorMessage message={error} />}
  </Box>;
}
