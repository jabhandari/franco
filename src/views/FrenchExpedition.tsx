import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, Crosshair, Flag, Heart, HeartHandshake, Map, RotateCcw, Search, Sparkles, Swords, Tent, Trophy, X, Zap } from 'lucide-react';
import { apiGet, apiPost } from '../api/client.js';
import { AudioPlayer, Box, Button, ErrorMessage, ExpeditionMap, Text } from '../components/ui';
import { getErrorMessage } from '../presenters/format.presenter.js';
import type { ExpeditionProvisionResult, ExpeditionProvisions, ProvisionKind, PuzzleAnswer, PuzzleQuestion, PuzzleRun, PuzzleState, PuzzleSummary } from '../types';

type Props = { token: string | null; summary: PuzzleSummary | null; onBack: () => void; onUpdated: () => void };
type Feedback = { correct: boolean; reveal: string; points: number; retry?: boolean; livesLost?: number };
const ROOT = '/api/me/puzzles/expedition/runs';
const PLACES = ['Trailhead', 'Orchard', 'Village', 'Market', 'River', 'Forest', 'Bridge', 'Highland', 'Cloudline', 'Summit'];
const EMPTY_PROVISIONS: ExpeditionProvisions = { loupe: 0, second_chance: 0, dictionary: 0 };

export function FrenchExpedition({ token, summary, onBack, onUpdated }: Props) {
  const [run, setRun] = React.useState<PuzzleRun | null>(null);
  const [question, setQuestion] = React.useState<PuzzleQuestion | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [feedbackKey, setFeedbackKey] = React.useState(0);
  const [hint, setHint] = React.useState<string | null>(null);
  const [wager, setWager] = React.useState(false);
  const [selectedTokens, setSelectedTokens] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  function enter(state: PuzzleState) {
    setRun(state.run); setQuestion(state.question); setFeedback(null); setSelectedTokens([]); setError('');
    setHint(null); setWager(false);
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
      const result = await apiPost<PuzzleAnswer>(`${ROOT}/${run.id}/answer`, { question_id: question.id, response }, token);
      setRun(result.run);
      setQuestion(result.question ?? null);
      setFeedback({ correct: Boolean(result.correct), reveal: result.reveal || '', points: result.points ?? 0, retry: result.retry, livesLost: result.livesLost });
      setFeedbackKey((key) => key + 1);
      setHint(null);
      if (result.run.status !== 'active') onUpdated();
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function useProvision(kind: ProvisionKind) {
    if (!token || !run || busy || feedback) return;
    setBusy(true); setError('');
    try {
      const result = await apiPost<ExpeditionProvisionResult>(`${ROOT}/${run.id}/provision`, { kind }, token);
      setRun(result.run);
      setQuestion(result.question);
      setHint(result.hint ?? null);
    } catch (caught) { setError(getErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function choose(route: 'easy' | 'hard' | 'camp', wagered = false) {
    if (!token || !run || busy) return;
    setBusy(true); setError('');
    try { enter(await apiPost<PuzzleState>(`${ROOT}/${run.id}/route`, { route, wager: wagered }, token)); }
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
    setFeedback(null); setSelectedTokens([]); setHint(null);
    if (run.status !== 'active') onUpdated();
  }

  const progress = run?.expedition;
  const step = progress?.step ?? 0;
  const combo = progress?.combo ?? 0;
  const provisions = progress?.provisions ?? EMPTY_PROVISIONS;
  const multiplier = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
  const trail = progress?.trail ?? [];
  const successes = trail.filter((item) => item.kind === 'success').length;
  const accuracy = run && run.answered > 0 ? Math.round(successes / run.answered * 100) : 0;
  const isBest = Boolean(run && run.status !== 'active' && run.score > 0 && run.score >= (summary?.expedition_best ?? 0));
  const showingResult = Boolean(run && run.status !== 'active' && !feedback);
  const atFork = Boolean(run?.status === 'active' && progress?.phase === 'fork' && !feedback);
  const atQuestion = Boolean(run?.status === 'active' && progress?.phase === 'question' && question && !feedback);
  const timeOfDay = step < 4 ? 'day' : step < 7 ? 'dusk' : 'night';

  function routeCard(kind: 'easy' | 'hard' | 'camp', art: string, Icon: typeof Compass, kicker: string, title: string, copy: string) {
    return <Box className={`expedition-route is-${kind}`}>
      <Box as="button" type="button" className="expedition-route-main" disabled={busy} onClick={() => void choose(kind, kind === 'hard' && wager)} aria-label={`${title}: ${copy}`}>
        <Box className={`expedition-route-art ${art}`} aria-hidden="true"><Box className="expedition-route-sun" /><Box className="expedition-route-hill" /><Box className="expedition-route-track" /><Icon size={34} /></Box>
        <Text as="small">{kicker}</Text>
        <Text as="strong">{title}</Text>
        <Text>{copy}</Text>
        <ArrowRight size={19} />
      </Box>
      {kind === 'hard' && <Box as="button" type="button" className={`expedition-wager${wager ? ' is-on' : ''}`} aria-pressed={wager} disabled={busy} onClick={() => setWager((on) => !on)}>
        <Zap size={14} /><Text as="span">{wager ? 'Double or nothing ON · 6 pts · a miss costs 2 lives' : 'Double or nothing? 6 pts · a miss costs 2 lives'}</Text>
      </Box>}
    </Box>;
  }

  return <Box className="expedition-page">
    <Button variant="text" icon={ArrowLeft} onClick={onBack}>All puzzles</Button>
    {!run && <Box className="expedition-intro">
      <Box className="expedition-intro-copy">
        <Text className="puzzles-kicker"><Compass size={16} /> THE PATH IS YOURS</Text>
        <Text as="h1">A new route through French, every time.</Text>
        <Text>Ten encounters stand between you and the summit. Chain correct answers for combo multipliers, spend trail provisions, hunt down your bounties, face the Gardiens — or wager it all on the high road.</Text>
        <Box className="puzzles-pills"><Text as="span"><Heart size={16} /> Three lives</Text><Text as="span"><Map size={16} /> Ten encounters</Text><Text as="span"><Sparkles size={16} /> Combos · Provisions · Boss gates</Text></Box>
        <Box className="puzzles-card-actions">{summary?.expedition_active && <Button variant="primary" icon={ArrowRight} onClick={() => void resume()} disabled={busy}>Resume expedition</Button>}<Button variant={summary?.expedition_active ? 'text' : 'primary'} icon={Compass} onClick={() => void start()} disabled={busy}>{busy ? 'Preparing…' : 'Begin expedition'}</Button></Box>
      </Box>
      <Box className="expedition-intro-art" aria-hidden="true"><Box className="expedition-sun" /><Box className="expedition-mountain mountain-back" /><Box className="expedition-mountain mountain-front" /><Box className="expedition-path" /><Box className="expedition-art-badge"><Flag size={24} /><Text as="span">THE SUMMIT AWAITS</Text></Box></Box>
    </Box>}
    {run && <>
      <Box className="expedition-heading"><Box><Text className="puzzles-kicker"><Compass size={16} /> FRENCH EXPEDITION · {showingResult ? 'JOURNEY COMPLETE' : PLACES[Math.min(step, 9)].toUpperCase()}</Text><Text as="h1">{showingResult ? run.end_reason === 'summit' ? 'You reached the summit.' : run.end_reason === 'lives' ? 'The trail ends here.' : 'Expedition ended.' : atFork ? 'Choose your next path.' : feedback ? feedback.retry ? 'Seconde chance.' : feedback.correct ? 'A clear path ahead.' : 'Keep your footing.' : 'One step at a time.'}</Text></Box>{run.status === 'active' && <Button variant="text" onClick={() => void end()} disabled={busy}>End run</Button>}</Box>
      <ExpeditionMap step={step} trail={trail} complete={showingResult} place={PLACES[Math.min(step, 9)]}
        score={run.score} livesLeft={run.lives_left} livesTotal={run.lives} combo={combo} timeOfDay={timeOfDay}
        result={feedback ? (feedback.correct ? 'correct' : 'wrong') : null} resultKey={feedbackKey}
        summit={showingResult && run.end_reason === 'summit'}
        sheet={atFork ? <Box className="expedition-fork-sheet">
          <Text className="expedition-fork-title">Choose your path, voyageur.</Text>
          <Box className="expedition-routes">
            {routeCard('easy', 'art-easy', Compass, 'THE GENTLE TRAIL', 'Take it easy', 'Lower difficulty · +1 point')}
            {routeCard('hard', 'art-hard', Flag, 'THE HIGH ROAD', 'Push onward', `Higher difficulty · +${wager ? 6 : 3} points`)}
            {routeCard('camp', 'art-camp', Tent, 'THE REST STOP', 'Make camp', run.lives_left === run.lives ? 'Full hearts · next question +1 point' : 'Restore one life · next question +1 point')}
          </Box>
        </Box> : null}>
        {atQuestion && question && <Box className="expedition-question">
          <Box className="expedition-question-meta">
            <Text className="puzzles-kicker">ENCOUNTER {step + 1} · {PLACES[Math.min(step, 9)].toUpperCase()} · {question.kind === 'word_order' ? 'BUILD THE SENTENCE' : 'CHOOSE THE ANSWER'}</Text>
            <Box className="expedition-badges">
              {question.boss && <Text as="span" className="expedition-badge is-boss"><Swords size={13} /> GARDIEN · +2</Text>}
              {question.bounty && <Text as="span" className="expedition-badge is-bounty"><Crosshair size={13} /> PRIME · +2</Text>}
              <Text as="span">{question.level} · +{progress?.reward ?? 1}{multiplier > 1 ? ` ×${multiplier}` : ''} PTS</Text>
            </Box>
          </Box>
          <Text as="h2">{question.prompt}</Text>
          {question.context && <Text className="puzzles-context">{question.context}</Text>}
          {question.instructions && <Text className="puzzles-instructions">{question.instructions}</Text>}
          {question.audio_url && <AudioPlayer src={question.audio_url} />}
          <Box className="expedition-provisions" aria-label="Trail provisions">
            <Box as="button" type="button" className="expedition-provision" disabled={busy || provisions.loupe === 0 || question.kind !== 'choice'} onClick={() => void useProvision('loupe')} title="Remove two wrong answers">
              <Search size={16} /><Text as="span">Loupe</Text><Text as="small">50/50 · ×{provisions.loupe}</Text>
            </Box>
            <Box as="button" type="button" className="expedition-provision" disabled={busy || provisions.dictionary === 0} onClick={() => void useProvision('dictionary')} title="Reveal a hint">
              <BookOpen size={16} /><Text as="span">Dico</Text><Text as="small">indice · ×{provisions.dictionary}</Text>
            </Box>
            <Box className="expedition-provision is-passive" title="Your first miss of the run is forgiven with a retry">
              <HeartHandshake size={16} /><Text as="span">Seconde chance</Text><Text as="small">{provisions.second_chance > 0 ? 'filet actif' : 'épuisée'}</Text>
            </Box>
          </Box>
          {hint && <Box className="expedition-hint" role="status"><BookOpen size={15} /><Text>{hint}</Text></Box>}
          {question.kind === 'choice' && <Box className="expedition-choices">{question.choices.map((choice, index) => <Box as="button" type="button" className="expedition-choice" key={choice.id} disabled={busy} onClick={() => void answer(choice.id)}><Text as="span">{String.fromCharCode(65 + index)}</Text><Text as="strong">{choice.text}</Text><ChevronRight size={19} /></Box>)}</Box>}
          {question.kind === 'word_order' && <><Box className="puzzles-assembled" aria-label="Your sentence">{selectedTokens.length ? selectedTokens.map((id) => { const tokenItem = question.tokens.find((item) => item.id === id); return <Box as="button" type="button" key={id} onClick={() => setSelectedTokens((old) => old.filter((item) => item !== id))}>{tokenItem?.text}</Box>; }) : <Text>Tap the words to build your answer.</Text>}</Box><Box className="puzzles-token-bank">{question.tokens.filter((tokenItem) => !selectedTokens.includes(tokenItem.id)).map((tokenItem) => <Box as="button" type="button" key={tokenItem.id} onClick={() => setSelectedTokens((old) => [...old, tokenItem.id])}>{tokenItem.text}</Box>)}</Box><Button variant="primary" disabled={busy || selectedTokens.length !== question.tokens.length} onClick={() => void answer(selectedTokens.map((id) => question.tokens.find((item) => item.id === id)?.text || ''))}>Check answer</Button></>}
        </Box>}
        {feedback && <Box className={`expedition-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status"><Box>{feedback.retry ? <HeartHandshake size={25} /> : feedback.correct ? <Check size={25} /> : <X size={25} />}</Box><Text as="h2">{feedback.retry ? 'Seconde chance — your life is spared.' : feedback.correct ? `Well done. +${feedback.points} ${feedback.points === 1 ? 'point' : 'points'}.${combo >= 3 ? ` Combo ×${multiplier} !` : ''}` : (feedback.livesLost ?? 1) > 1 ? 'Two lives lost. The mountain is cruel.' : 'A life lost. The journey continues.'}</Text><Text>{feedback.retry ? 'Try this encounter again.' : <>The answer was <Text as="strong">{feedback.reveal}</Text>.</>}</Text><Button variant="primary" icon={ArrowRight} iconPosition="after" onClick={advance}>{feedback.retry ? 'Try again' : run.status !== 'active' ? 'See journey' : feedback.correct ? 'Choose your path' : 'Continue onward'}</Button></Box>}
      </ExpeditionMap>
      {showingResult && <Box className="expedition-result"><Box className="expedition-result-icon"><Trophy size={40} /></Box><Text>{run.end_reason === 'summit' ? 'You crossed all ten encounters.' : `You made it through ${step} of 10 encounters.`} The next trail will be different.</Text><Box className="expedition-result-score"><Text as="strong">{run.score}</Text><Text as="span">EXPEDITION POINTS</Text>{isBest && <Text as="small"><Sparkles size={17} /> New personal best</Text>}</Box>
        <Box className="expedition-result-stats">
          <Box><Text as="strong">{run.best_combo}</Text><Text as="span">BEST COMBO</Text></Box>
          <Box><Text as="strong">{accuracy}%</Text><Text as="span">ACCURACY</Text></Box>
          <Box><Text as="strong">{progress?.bountiesCleared ?? 0}</Text><Text as="span">BOUNTIES</Text></Box>
          <Box><Text as="strong">{progress?.bossesBeaten ?? 0}</Text><Text as="span">GARDIENS</Text></Box>
        </Box>
        {(progress?.misses?.length ?? 0) > 0 && <Box className="expedition-misses"><Text as="h3">Les mots recherchés</Text><Text>The ones that got away — drill them in Practice.</Text>{progress?.misses?.map((miss, index) => <Box key={index} className="expedition-miss"><Text>{miss.prompt}</Text><Text as="span">{miss.reveal}</Text></Box>)}</Box>}
        <Box className="puzzles-over-actions"><Button variant="primary" icon={RotateCcw} onClick={() => setRun(null)}>Explore again</Button><Button variant="text" onClick={onBack}>All puzzles</Button></Box></Box>}
    </>}
    {error && <ErrorMessage message={error} />}
  </Box>;
}
