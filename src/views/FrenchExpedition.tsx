import React from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Compass, Flag, Heart, Map, RotateCcw, Sparkles, Tent, Trophy, X } from 'lucide-react';
import { apiGet, apiPost } from '../api/client.js';
import { AudioPlayer, Box, Button, ErrorMessage, ExpeditionMap, Text } from '../components/ui';
import { getErrorMessage } from '../presenters/format.presenter.js';
import type { PuzzleAnswer, PuzzleQuestion, PuzzleRun, PuzzleState, PuzzleSummary } from '../types';

type Props = { token: string | null; summary: PuzzleSummary | null; onBack: () => void; onUpdated: () => void };
type Feedback = { correct: boolean; reveal: string; points: number; next: PuzzleQuestion | null; };
const ROOT = '/api/me/puzzles/expedition/runs';
const PLACES = ['Trailhead', 'Orchard', 'Village', 'Market', 'River', 'Forest', 'Bridge', 'Highland', 'Cloudline', 'Summit'];

export function FrenchExpedition({ token, summary, onBack, onUpdated }: Props) {
  const [run, setRun] = React.useState<PuzzleRun | null>(null);
  const [question, setQuestion] = React.useState<PuzzleQuestion | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [selectedTokens, setSelectedTokens] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  function enter(state: PuzzleState) {
    setRun(state.run); setQuestion(state.question); setFeedback(null); setSelectedTokens([]); setError('');
    onUpdated();
  }

  async function start() {
    if (!token || busy) return;
    setBusy(true); setError('');
    try { enter(await apiPost<PuzzleState>(ROOT, {}, token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function resume() {
    if (!token || !summary?.expedition_active || busy) return;
    setBusy(true); setError('');
    try { enter(await apiGet<PuzzleState>(`${ROOT}/${summary.expedition_active.id}`, token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function answer(response: string | string[]) {
    if (!token || !run || !question || busy || feedback) return;
    setBusy(true); setError('');
    try {
      const result = await apiPost<PuzzleAnswer & { points: number }>(`${ROOT}/${run.id}/answer`, { question_id: question.id, response }, token);
      setRun(result.run);
      setFeedback({ correct: Boolean(result.correct), reveal: result.reveal || '', points: result.points, next: result.question });
      if (result.run.status !== 'active') onUpdated();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function choose(route: 'easy' | 'hard' | 'camp') {
    if (!token || !run || busy) return;
    setBusy(true); setError('');
    try { enter(await apiPost<PuzzleState>(`${ROOT}/${run.id}/route`, { route }, token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function end() {
    if (!token || !run || busy) return;
    setBusy(true); setError('');
    try { enter(await apiPost<PuzzleState>(`${ROOT}/${run.id}/end`, {}, token)); }
    catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  function advance() {
    if (!feedback || !run) return;
    setFeedback(null); setSelectedTokens([]);
    if (run.status === 'active') setQuestion(feedback.next);
    else onUpdated();
  }

  const progress = run?.expedition;
  const step = progress?.step ?? 0;
  const isBest = Boolean(run && run.status !== 'active' && run.score > 0 && run.score >= (summary?.expedition_best ?? 0));
  const showingResult = Boolean(run && run.status !== 'active' && !feedback);
  const atFork = Boolean(run?.status === 'active' && progress?.phase === 'fork' && !feedback);
  const atQuestion = Boolean(run?.status === 'active' && progress?.phase === 'question' && question && !feedback);

  return <Box className="expedition-page">
    <Button variant="text" icon={ArrowLeft} onClick={onBack}>All puzzles</Button>
    {!run && <Box className="expedition-intro">
      <Box className="expedition-intro-copy">
        <Text className="puzzles-kicker"><Compass size={16} /> THE PATH IS YOURS</Text>
        <Text as="h1">A new route through French, every time.</Text>
        <Text>Ten encounters stand between you and the summit. After a correct answer, choose a gentle trail, brave a harder climb for triple points, or stop at camp to recover a life.</Text>
        <Box className="puzzles-pills"><Text as="span"><Heart size={16} /> Three lives</Text><Text as="span"><Map size={16} /> Ten encounters</Text><Text as="span"><Sparkles size={16} /> No timer</Text></Box>
        <Box className="puzzles-card-actions">{summary?.expedition_active && <Button variant="primary" icon={ArrowRight} onClick={() => void resume()} disabled={busy}>Resume expedition</Button>}<Button variant={summary?.expedition_active ? 'text' : 'primary'} icon={Compass} onClick={() => void start()} disabled={busy}>{busy ? 'Preparing…' : 'Begin expedition'}</Button></Box>
      </Box>
      <Box className="expedition-intro-art" aria-hidden="true"><Box className="expedition-sun" /><Box className="expedition-mountain mountain-back" /><Box className="expedition-mountain mountain-front" /><Box className="expedition-path" /><Box className="expedition-art-badge"><Flag size={24} /><Text as="span">THE SUMMIT AWAITS</Text></Box></Box>
    </Box>}
    {run && <>
      <Box className="expedition-heading"><Box><Text className="puzzles-kicker"><Compass size={16} /> FRENCH EXPEDITION · {showingResult ? 'JOURNEY COMPLETE' : PLACES[Math.min(step, 9)].toUpperCase()}</Text><Text as="h1">{showingResult ? run.end_reason === 'summit' ? 'You reached the summit.' : run.end_reason === 'lives' ? 'The trail ends here.' : 'Expedition ended.' : atFork ? 'Choose your next path.' : feedback ? feedback.correct ? 'A clear path ahead.' : 'Keep your footing.' : 'One step at a time.'}</Text></Box>{run.status === 'active' && <Button variant="text" onClick={() => void end()} disabled={busy}>End run</Button>}</Box>
      <Box className="expedition-status"><Box><Text as="small">YOUR SCORE</Text><Text as="strong">{run.score}</Text></Box><Box><Text as="small">LIVES</Text><Box className="expedition-hearts" aria-label={`${run.lives_left} of 3 lives left`}>{[0, 1, 2].map((index) => <Heart key={index} size={24} fill="currentColor" className={index >= run.lives_left ? 'is-lost' : ''} />)}</Box></Box><Box><Text as="small">DISTANCE</Text><Text as="strong">{step} <Text as="span">/ 10</Text></Text></Box></Box>
      <ExpeditionMap step={step} trail={progress?.trail ?? []} complete={showingResult} place={PLACES[Math.min(step, 9)]}>
      {atQuestion && question && <Box className="expedition-question"><Box className="expedition-question-meta"><Text className="puzzles-kicker">ENCOUNTER {step + 1} · {question.kind === 'word_order' ? 'BUILD THE SENTENCE' : 'CHOOSE THE ANSWER'}</Text><Text as="span">{question.level} · +{progress?.reward ?? 1} {progress?.reward === 1 ? 'POINT' : 'POINTS'}</Text></Box><Text as="h2">{question.prompt}</Text>{question.context && <Text className="puzzles-context">{question.context}</Text>}{question.instructions && <Text className="puzzles-instructions">{question.instructions}</Text>}{question.audio_url && <AudioPlayer src={question.audio_url} />}{question.kind === 'choice' && <Box className="expedition-choices">{question.choices.map((choice, index) => <Box as="button" type="button" className="expedition-choice" key={choice.id} disabled={busy} onClick={() => void answer(choice.id)}><Text as="span">{String.fromCharCode(65 + index)}</Text><Text as="strong">{choice.text}</Text><ChevronRight size={19} /></Box>)}</Box>}{question.kind === 'word_order' && <><Box className="puzzles-assembled" aria-label="Your sentence">{selectedTokens.length ? selectedTokens.map((id) => { const tokenItem = question.tokens.find((item) => item.id === id); return <Box as="button" type="button" key={id} onClick={() => setSelectedTokens((old) => old.filter((item) => item !== id))}>{tokenItem?.text}</Box>; }) : <Text>Tap the words to build your answer.</Text>}</Box><Box className="puzzles-token-bank">{question.tokens.filter((tokenItem) => !selectedTokens.includes(tokenItem.id)).map((tokenItem) => <Box as="button" type="button" key={tokenItem.id} onClick={() => setSelectedTokens((old) => [...old, tokenItem.id])}>{tokenItem.text}</Box>)}</Box><Button variant="primary" disabled={busy || selectedTokens.length !== question.tokens.length} onClick={() => void answer(selectedTokens.map((id) => question.tokens.find((item) => item.id === id)?.text || ''))}>Check answer</Button></>}</Box>}
      {feedback && <Box className={`expedition-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status"><Box>{feedback.correct ? <Check size={25} /> : <X size={25} />}</Box><Text as="h2">{feedback.correct ? `Well done. +${feedback.points} ${feedback.points === 1 ? 'point' : 'points'}.` : 'A life lost. The journey continues.'}</Text><Text>The answer was <Text as="strong">{feedback.reveal}</Text>.</Text><Button variant="primary" icon={ArrowRight} iconPosition="after" onClick={advance}>{run.status !== 'active' ? 'See journey' : feedback.correct ? 'Choose your path' : 'Continue onward'}</Button></Box>}
      </ExpeditionMap>
      {atFork && <Box className="expedition-fork"><Text>Choose the terrain for your next encounter.</Text><Box className="expedition-routes"><Box as="button" type="button" className="expedition-route" disabled={busy} onClick={() => void choose('easy')}><Box className="expedition-route-art art-easy" aria-hidden="true"><Box className="expedition-route-sun"/><Box className="expedition-route-hill"/><Box className="expedition-route-track"/><Compass size={34}/></Box><Text as="small">THE GENTLE TRAIL</Text><Text as="strong">Take it easy</Text><Text>Lower difficulty · +1 point</Text><ArrowRight size={19} /></Box><Box as="button" type="button" className="expedition-route is-hard" disabled={busy} onClick={() => void choose('hard')}><Box className="expedition-route-art art-hard" aria-hidden="true"><Box className="expedition-route-sun"/><Box className="expedition-route-hill"/><Box className="expedition-route-track"/><Flag size={34}/></Box><Text as="small">THE HIGH ROAD</Text><Text as="strong">Push onward</Text><Text>Higher difficulty · +3 points</Text><ArrowRight size={19} /></Box><Box as="button" type="button" className="expedition-route is-camp" disabled={busy} onClick={() => void choose('camp')}><Box className="expedition-route-art art-camp" aria-hidden="true"><Box className="expedition-route-sun"/><Box className="expedition-route-hill"/><Box className="expedition-route-track"/><Tent size={34}/></Box><Text as="small">THE REST STOP</Text><Text as="strong">Make camp</Text><Text>{run.lives_left === 3 ? 'Full hearts · next question +1 point' : 'Restore one life · next question +1 point'}</Text><ArrowRight size={19} /></Box></Box></Box>}
      {showingResult && <Box className="expedition-result"><Box className="expedition-result-icon"><Trophy size={40} /></Box><Text>{run.end_reason === 'summit' ? 'You crossed all ten encounters.' : `You made it through ${step} of 10 encounters.`} The next trail will be different.</Text><Box className="expedition-result-score"><Text as="strong">{run.score}</Text><Text as="span">EXPEDITION POINTS</Text>{isBest && <Text as="small"><Sparkles size={17} /> New personal best</Text>}</Box><Box className="puzzles-over-actions"><Button variant="primary" icon={RotateCcw} onClick={() => setRun(null)}>Explore again</Button><Button variant="text" onClick={onBack}>All puzzles</Button></Box></Box>}
    </>}
    {error && <ErrorMessage message={error} />}
  </Box>;
}
