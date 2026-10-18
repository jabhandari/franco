import React from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Copy, Flag, Heart, Link2, LockKeyhole, QrCode, RotateCcw, Share2, Sparkles, Trophy, Users, X } from 'lucide-react';
import { AudioPlayer, Box, Button, ErrorMessage, RaceInviteCode, Text, TextInput } from '../components/ui';
import { useRaceRealtime } from '../hooks/useRaceRealtime';
import { ApiError, apiRequest } from '../api/client.js';

type RaceConfig = {
  source: 'past_questions' | 'lesson_exercises';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  question_count: number;
  lives: 1 | 3 | 5 | null;
  timer_seconds: number | null;
};
type RaceRoom = {
  code: string;
  status: 'lobby' | 'live' | 'finished' | 'expired';
  config: RaceConfig;
  started_at: string | null;
  ends_at: string | null;
  expires_at: string;
  server_now: string;
  winner_seat?: number | 'tie' | null;
};
type RacePlayer = {
  seat: number | string;
  display_name: string;
  current_index: number;
  correct_count: number;
  lives_left: number | null;
  finished_at: string | null;
  final_score: number | null;
  review?: RaceReview[];
};
type RaceQuestion = {
  id: string;
  kind: 'choice' | 'word_order';
  prompt: string;
  context?: string | null;
  level?: string;
  audio_url?: string | null;
  choices?: { id: string; text: string }[];
  tokens?: { id: string; text: string }[];
};
type RaceReview = {
  question_id: string;
  prompt: string;
  correct: boolean;
  answer?: string | null;
  reveal?: string | null;
};
type RaceState = {
  room: RaceRoom;
  me?: RacePlayer | null;
  opponent?: RacePlayer | null;
  players?: RacePlayer[];
  you?: RacePlayer | null;
  question?: RaceQuestion | null;
  review?: RaceReview[];
  player_token?: string;
};
type RaceAnswer = RaceState & { correct?: boolean; reveal?: string | null; selected?: string | null };
type Props = { code: string | null; token: string | null; onExit: () => void };
type Feedback = { correct: boolean; reveal: string; question: RaceQuestion; selected: string };
type HostedRoom = {
  code: string;
  status: 'lobby' | 'live';
  created_at: string;
  expires_at: string;
  config: RaceConfig;
  guest_joined: boolean;
};

const DEFAULT_CONFIG: RaceConfig = { source: 'lesson_exercises', level: 'A1', question_count: 10, lives: 3, timer_seconds: 300 };
const LEVELS: RaceConfig['level'][] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const SOURCES: { id: RaceConfig['source']; label: string }[] = [{ id: 'past_questions', label: 'Past questions' }, { id: 'lesson_exercises', label: 'Lesson exercises' }];
const LIFE_OPTIONS: RaceConfig['lives'][] = [1, 3, 5, null];
const TIME_OPTIONS: { seconds: number | null; label: string }[] = [{ seconds: 180, label: '3 min' }, { seconds: 300, label: '5 min' }, { seconds: null, label: 'No limit' }];

function tokenKey(code: string) { return `franco_race_player_${code}`; }
function timeLabel(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
function errorText(error: string | Error) { return error instanceof Error ? error.message : error; }
function roomSummary(config: RaceConfig) {
  const pool = config.source === 'past_questions' ? 'Past questions' : 'Lesson exercises';
  return `${pool} · ${config.level} · ${config.question_count} questions`;
}
function ageLabel(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

async function raceRequest<T>(path: string, method: 'GET' | 'POST' | 'PATCH', session: string | null, player: string | null, body?: object): Promise<T> {
  try {
    return await apiRequest<T>(path, method, body, session, { racePlayerToken: player });
  } catch (error) {
    if (error instanceof ApiError && !error.serverMessage) {
      const message = error.status === 404 ? 'This race link was not found.'
        : error.status === 410 ? 'This race link has expired.'
        : error.status === 409 ? 'This race is full or has already started.'
        : 'The race could not be updated. Please try again.';
      throw new Error(message);
    }
    throw error;
  }
}

function roomPlayers(state: RaceState) {
  const me = state.me ?? state.you ?? null;
  const opponent = state.opponent ?? state.players?.find((player) => player.seat !== me?.seat) ?? null;
  return { me, opponent };
}

export function Race({ code, token, onExit }: Props) {
  const [roomCode, setRoomCode] = React.useState(code ?? null);
  const [state, setState] = React.useState<RaceState | null>(null);
  const [playerToken, setPlayerToken] = React.useState(() => code ? localStorage.getItem(tokenKey(code)) : null);
  const [displayName, setDisplayName] = React.useState('');
  const [config, setConfig] = React.useState<RaceConfig>(DEFAULT_CONFIG);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [selectedTokens, setSelectedTokens] = React.useState<string[]>([]);
  const [now, setNow] = React.useState(Date.now());
  const [clockOffset, setClockOffset] = React.useState(0);
  const [qrImage, setQrImage] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [hostedRooms, setHostedRooms] = React.useState<HostedRoom[]>([]);
  const [closingCode, setClosingCode] = React.useState<string | null>(null);
  const polling = React.useRef(false);
  const mutationVersion = React.useRef(0);
  const mounted = React.useRef(true);
  const configLoaded = React.useRef<string | null>(null);
  const refreshNow = React.useRef<() => void>(() => {});
  const { me, opponent } = state ? roomPlayers(state) : { me: null, opponent: null };
  const realtime = useRaceRealtime(roomCode, () => refreshNow.current(), me?.display_name ?? null);

  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  React.useEffect(() => {
    if (code === roomCode) return;
    setRoomCode(code ?? null);
    setPlayerToken(code ? localStorage.getItem(tokenKey(code)) : null);
    setState(null); setFeedback(null); setError(''); configLoaded.current = null;
  }, [code]);
  React.useEffect(() => {
    const syncPath = () => {
      const nextCode = window.location.pathname.match(/^\/race\/([A-Za-z0-9]{8})\/?$/)?.[1] ?? null;
      setRoomCode(nextCode);
      setPlayerToken(nextCode ? localStorage.getItem(tokenKey(nextCode)) : null);
      setState(null); setFeedback(null); setError(''); configLoaded.current = null;
    };
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  const inviteUrl = roomCode ? `${window.location.origin}/race/${encodeURIComponent(roomCode)}` : '';
  React.useEffect(() => {
    if (!inviteUrl) { setQrImage(null); return; }
    let active = true;
    void QRCode.toDataURL(inviteUrl, { width: 440, margin: 2, color: { dark: '#10283b', light: '#ffffff' } })
      .then((image) => { if (active) setQrImage(image); })
      .catch(() => { if (active) setQrImage(null); });
    return () => { active = false; };
  }, [inviteUrl]);

  React.useEffect(() => {
    if (!roomCode) return;
    let active = true;
    async function refresh() {
      if (polling.current || !roomCode) return;
      polling.current = true;
      const version = mutationVersion.current;
      try {
        const next = await raceRequest<RaceState>(`/api/races/${encodeURIComponent(roomCode)}`, 'GET', token, playerToken);
        if (!active || version !== mutationVersion.current) return;
        setState(next); setError('');
        setClockOffset(Date.parse(next.room.server_now) - Date.now());
        if (configLoaded.current !== roomCode) { setConfig(next.room.config); configLoaded.current = roomCode; }
      } catch (caught) {
        if (active) setError(errorText(caught instanceof Error ? caught : 'Could not load the race.'));
      } finally { polling.current = false; }
    }
    refreshNow.current = () => { void refresh(); };
    void refresh();
    const timer = window.setInterval(() => void refresh(), realtime.connected ? 15000 : 2000);
    const onFocus = () => void refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => { active = false; refreshNow.current = () => {}; window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, [roomCode, token, playerToken, realtime.connected]);

  React.useEffect(() => {
    if (state?.room.status !== 'live') return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [state?.room.status]);

  React.useEffect(() => {
    if (!token || roomCode) { setHostedRooms([]); return; }
    void refreshHosted();
  }, [token, roomCode]);

  async function act<T extends RaceState>(path: string, body?: object): Promise<T | null> {
    if (!roomCode || busy) return null;
    mutationVersion.current += 1;
    setBusy(true); setError('');
    try {
      const next = await raceRequest<T>(`/api/races/${encodeURIComponent(roomCode)}${path}`, path === '/config' ? 'PATCH' : 'POST', token, playerToken, body ?? {});
      if (mounted.current) {
        mutationVersion.current += 1;
        setState(next); setClockOffset(Date.parse(next.room.server_now) - Date.now());
        setNow(Date.now());
        if (path === '/config') setConfig(next.room.config);
        realtime.broadcast();
      }
      return next;
    } catch (caught) { if (mounted.current) setError(errorText(caught instanceof Error ? caught : 'The race could not be updated.')); return null; }
    finally { if (mounted.current) setBusy(false); }
  }

  async function create() {
    if (!token || busy) return;
    mutationVersion.current += 1;
    setBusy(true); setError('');
    try {
      const next = await raceRequest<RaceState>('/api/races', 'POST', token, null, {});
      if (!mounted.current) return;
      mutationVersion.current += 1;
      setState(next); setRoomCode(next.room.code); setConfig(next.room.config); setClockOffset(Date.parse(next.room.server_now) - Date.now());
      configLoaded.current = next.room.code;
      window.history.pushState({}, '', `/race/${encodeURIComponent(next.room.code)}`);
      void refreshHosted();
    } catch (caught) { if (mounted.current) setError(errorText(caught instanceof Error ? caught : 'Could not create the race.')); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function refreshHosted() {
    if (!token) { if (mounted.current) setHostedRooms([]); return; }
    try {
      const data = await raceRequest<{ rooms: HostedRoom[] }>('/api/races/hosted', 'GET', token, null);
      if (mounted.current) { setHostedRooms(data.rooms); setClosingCode(null); }
    } catch { /* The lobby list is best-effort; creation errors surface in the panel. */ }
  }

  async function closeLobby(targetCode: string) {
    if (!token || busy) return;
    if (closingCode !== targetCode) { setClosingCode(targetCode); return; }
    setClosingCode(null);
    setBusy(true); setError('');
    try {
      await raceRequest<{ code: string; status: string }>(`/api/races/${encodeURIComponent(targetCode)}/close`, 'POST', token, null, {});
      if (mounted.current) await refreshHosted();
    } catch (caught) { if (mounted.current) setError(errorText(caught instanceof Error ? caught : 'Could not close the race.')); }
    finally { if (mounted.current) setBusy(false); }
  }

  function openHosted(targetCode: string) {
    setRoomCode(targetCode);
    setPlayerToken(localStorage.getItem(tokenKey(targetCode)));
    setState(null); setFeedback(null); setError(''); configLoaded.current = null;
    window.history.pushState({}, '', `/race/${encodeURIComponent(targetCode)}`);
  }

  async function join() {
    if (!roomCode || !displayName.trim() || busy) return;
    mutationVersion.current += 1;
    setBusy(true); setError('');
    try {
      const next = await raceRequest<RaceState>(`/api/races/${encodeURIComponent(roomCode)}/join`, 'POST', token, null, { display_name: displayName.trim() });
      if (!mounted.current) return;
      mutationVersion.current += 1;
      if (next.player_token) {
        localStorage.setItem(tokenKey(roomCode), next.player_token);
        setPlayerToken(next.player_token);
      }
      setState(next); setClockOffset(Date.parse(next.room.server_now) - Date.now());
      realtime.broadcast();
    } catch (caught) {
      if (mounted.current) setError(errorText(caught instanceof Error ? caught : 'Could not join the race.'));
    }
    finally { if (mounted.current) setBusy(false); }
  }

  async function answer(question: RaceQuestion, response: string | string[], selected: string) {
    if (feedback || busy) return;
    const next = await act<RaceAnswer>('/answer', { question_id: question.id, response, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (next && typeof next.correct === 'boolean') {
      setFeedback({ correct: next.correct, reveal: next.reveal || '', question, selected });
      setSelectedTokens([]);
    }
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2500); }
    catch { setError('Copy failed. Select and copy the invitation link above.'); }
  }

  async function shareInvite() {
    if (!navigator.share) { await copyInvite(); return; }
    try { await navigator.share({ title: 'Race me in French on Franco', text: 'Join my French question race!', url: inviteUrl }); }
    catch { /* Dismissing the share sheet is not an error. */ }
  }

  const room = state?.room ?? null;
  const isHost = me?.seat === 1 || me?.seat === 'host';
  const rulesUnsaved = Boolean(room && JSON.stringify(config) !== JSON.stringify(room.config));
  const canJoin = Boolean(roomCode && room && !me && room.status === 'lobby' && (state?.players?.length ?? 1) < 2);
  const isLobby = room?.status === 'lobby';
  const isOver = room && ['finished', 'expired'].includes(room.status);
  const remaining = room?.ends_at ? Math.max(0, Date.parse(room.ends_at) - now - clockOffset) : null;
  const shownQuestion = feedback?.question ?? state?.question ?? null;
  const answered = me?.current_index ?? 0;
  const opponentAnswered = opponent?.current_index ?? 0;
  const maxQuestions = room?.config.question_count ?? config.question_count;

  return <Box className="race-page">
    <Box className="race-topline"><Button variant="text" icon={ArrowLeft} onClick={onExit}>All games</Button><Text as="span">FRANCO GAMES <ArrowRight size={13} aria-hidden="true" /> FRIEND RACE</Text></Box>

    {!roomCode && <Box className="race-intro">
      <Box className="race-intro-copy">
        <Text className="race-kicker"><Sparkles size={15} /> NEW · PLAY WITH A FRIEND</Text>
        <Text as="h1">Two minds.<Text as="span">One finish line.</Text></Text>
        <Text>Create a room, send a private link, then choose the rules together before the race starts. Every answer moves you closer to the finish.</Text>
        <Box className="race-intro-pills"><Text as="span"><Users size={16} /> Two players</Text><Text as="span"><Clock3 size={16} /> Your pace</Text><Text as="span"><Trophy size={16} /> One winner</Text></Box>
        {!token && <Box className="race-signin-note"><LockKeyhole size={20} /><Text>Sign in to create a race. Friends can join your link without an account.</Text></Box>}
      </Box>
      <Box className="race-intro-art" aria-hidden="true"><Box className="race-art-track"><Box className="race-art-lane race-art-lane-one"><Text as="span">01</Text><Box /><Box /><Box className="race-art-runner">FR</Box></Box><Box className="race-art-lane race-art-lane-two"><Text as="span">02</Text><Box /><Box className="race-art-runner">VOUS</Box><Box /></Box></Box><Box className="race-art-finish"><Flag size={31} /><Text as="span">FINISH</Text></Box></Box>
      {token && <Box className="race-create-panel">
        <Box><Text className="race-kicker">ONE CLICK TO THE STARTING LINE</Text><Text as="h2">Create your race room.</Text><Text>Your invite link appears immediately. Set the level, question pool, lives and clock in the lobby before you start.</Text></Box>
        <Button variant="primary" icon={ArrowRight} iconPosition="after" disabled={busy} onClick={() => void create()}>{busy ? 'Creating race…' : 'Create invite link'}</Button>
        {error && <ErrorMessage message={error} />}
      </Box>}
      {token && <Box className="race-hosted">
        <Box><Text className="race-kicker">YOUR OPEN RACES</Text><Text as="h2">Rooms you’re hosting.</Text><Text>Pick up a race or close a lobby you no longer need. You can host three open rooms at a time.</Text></Box>
        {hostedRooms.length === 0 && <Text className="race-hosted-empty">No open rooms yet. Create an invite to get started.</Text>}
        {hostedRooms.map((hosted) => <Box className="race-hosted-row" key={hosted.code}>
          <Box className="race-hosted-info">
            <Text as="strong">Room {hosted.code}</Text>
            <Text>{roomSummary(hosted.config)} · {hosted.guest_joined ? 'Friend joined' : 'Waiting for friend'} · opened {ageLabel(hosted.created_at)}</Text>
          </Box>
          <Box className="race-hosted-actions">
            <Button variant="text" onClick={() => openHosted(hosted.code)}>{hosted.status === 'live' ? 'Resume race' : 'Open lobby'}</Button>
            {hosted.status === 'lobby' && <Button variant="text" disabled={busy} onClick={() => void closeLobby(hosted.code)}>{closingCode === hosted.code ? 'Confirm close' : 'Close'}</Button>}
          </Box>
        </Box>)}
      </Box>}
    </Box>}

    {roomCode && !room && !error && <Box className="race-loading"><Box className="race-loading-orbit" /><Text>Finding your race…</Text></Box>}
    {roomCode && !room && error && <Box className="race-not-found"><QrCode size={42} /><Text as="h1">Race unavailable</Text><Text>{error}</Text><Button variant="primary" onClick={onExit}>Browse games</Button></Box>}

    {room && <>
      <Box className="race-room-head"><Box><Text className="race-kicker">FRIEND RACE · ROOM {room.code}</Text><Text as="h1">{isOver ? 'A race to remember.' : room.status === 'live' ? 'The race is on.' : 'The starting line.'}</Text><Text>{isOver ? 'Review the result below.' : room.status === 'live' ? 'The same questions. Your own pace.' : !me && canJoin ? 'Enter your name and join the race. The host can start once both players are in.' : isHost ? 'Share the link, then start when you are both ready.' : me ? 'You’ve joined the race. Wait for the host to start.' : 'You’ve been invited to this race.'}</Text></Box><Box className="race-room-badge"><Box /><Text>{isOver ? 'FINISHED' : room.status === 'live' ? 'LIVE RACE' : 'WAITING ROOM'}</Text></Box></Box>

      {isLobby && <Box className={isHost ? "race-lobby-grid" : "race-lobby-grid race-lobby-invited"}>
        <Box className="race-lobby-main">
          {canJoin && <Box className="race-join-panel"><Text className="race-kicker">YOU’RE INVITED</Text><Text as="h2">Enter your name to join</Text><Text>Choose the name your friend will see, then select Join race. You won’t have a seat until you join.</Text><TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your display name" autoComplete="nickname" onKeyDown={(event) => { if (event.key === 'Enter') void join(); }} /><Button variant="primary" icon={ArrowRight} iconPosition="after" disabled={busy || !displayName.trim()} onClick={() => void join()}>{busy ? 'Joining…' : error ? 'Retry joining' : 'Join race'}</Button></Box>}
          <Box className="race-lobby-card"><Text className="race-kicker">ON YOUR MARKS</Text><Text as="h2">{me ? 'You’re in the starting line-up.' : 'Join the starting line-up.'}</Text><Box className="race-runners"><RaceRunner player={me} label="YOU" count={maxQuestions} /><Box className="race-versus">VS</Box><RaceRunner player={opponent} label={isHost ? "YOUR FRIEND" : "HOST"} count={maxQuestions} /></Box>{me && opponent && <Box className="race-ready"><CheckCircle2 size={18} /> Both players are here. The host can start the race.</Box>}</Box>
          {isHost && <Box className="race-lobby-settings"><Box><Text className="race-kicker">RACE RULES</Text><Text as="h2">Choose your challenge.</Text></Box><RaceSettings value={config} onChange={setConfig} disabled={busy} /><Box className="race-lobby-actions"><Button variant="text" disabled={busy || !rulesUnsaved} onClick={() => void act('/config', config)}>{rulesUnsaved ? 'Save rules' : 'Rules saved'}</Button><Button variant="primary" icon={ArrowRight} iconPosition="after" disabled={busy || !opponent || rulesUnsaved} onClick={() => void act('/start')}>{busy ? 'Starting…' : 'Start race'}</Button></Box><Text className="race-footnote">You can edit the rules until the race starts. Your friend sees each saved change.</Text></Box>}
          {!isHost && <Box className="race-lobby-settings"><Box><Text className="race-kicker">RACE RULES</Text><Text as="h2">Your challenge.</Text></Box><Box className="race-rule-summary"><Text>{room.config.source === 'past_questions' ? 'Past questions' : 'Lesson exercises'} · {room.config.level}</Text><Text>{room.config.question_count} questions · {room.config.lives === null ? 'Unlimited' : room.config.lives} lives · {room.config.timer_seconds === null ? 'No time limit' : `${Math.round(room.config.timer_seconds / 60)} min`}</Text></Box><Text className="race-footnote">The host can update the rules until the race starts.</Text></Box>}

          {!me && !canJoin && <Box className="race-guest-wait"><LockKeyhole size={24} /><Text as="h2">Both seats are taken.</Text><Text>Ask the host to create another race for you.</Text></Box>}
          {!isHost && me && <Box className="race-guest-wait"><Clock3 size={24} /><Text as="h2">You’re in. Waiting for the host.</Text><Text>This page will update when the race begins.</Text></Box>}
        </Box>
        {isHost && <Box className="race-invite-panel"><Box className="race-invite-heading"><Box className="race-invite-icon"><Link2 size={22} /></Box><Text as="h2">Invite a friend</Text><Text>Only the person with this link can enter the open seat.</Text></Box><RaceInviteCode image={qrImage} url={inviteUrl} /><Box className="race-invite-link"><Text as="small">PRIVATE INVITE LINK</Text><Text as="span">{inviteUrl}</Text></Box><Box className="race-invite-actions"><Button variant="primary" icon={copied ? Check : Copy} onClick={() => void copyInvite()}>{copied ? 'Copied!' : 'Copy link'}</Button><Button variant="text" icon={Share2} onClick={() => void shareInvite()}>Share</Button></Box><Text className="race-footnote">The link expires if no race begins. Keep it between you and your friend.</Text></Box>}
      </Box>}

      {(room.status === 'live' || Boolean(feedback)) && <>
        <Box className="race-scoreboard"><RaceScore player={me} title="YOU" count={maxQuestions} /><Box className="race-scoreboard-clock"><Clock3 size={20} /><Text as="small">TIME LEFT</Text><Text as="strong">{remaining === null ? '∞' : timeLabel(remaining)}</Text></Box><RaceScore player={opponent} title="FRIEND" count={maxQuestions} /></Box>
        {me && shownQuestion && (!me.finished_at || Boolean(feedback)) && <Box className="race-question"><Box className="race-question-top"><Text className="race-kicker">QUESTION {Math.min(maxQuestions, answered + (feedback ? 0 : 1))} OF {maxQuestions}</Text><Text as="span">{shownQuestion.level || room.config.level}</Text></Box><Text as="h2">{shownQuestion.prompt}</Text>{shownQuestion.context && <Text className="race-context">{shownQuestion.context}</Text>}{shownQuestion.audio_url && <AudioPlayer src={shownQuestion.audio_url} />}
          {shownQuestion.kind === 'choice' && <Box className="race-choices">{shownQuestion.choices?.map((choice, index) => <Box as="button" type="button" key={choice.id} disabled={busy || Boolean(feedback)} className={`race-choice${feedback?.selected === choice.id ? feedback.correct ? ' is-correct' : ' is-wrong' : ''}`} onClick={() => void answer(shownQuestion, choice.id, choice.id)}><Text as="span">{String.fromCharCode(65 + index)}</Text><Text as="strong">{choice.text}</Text><ArrowRight size={18} aria-hidden="true" /></Box>)}</Box>}
          {shownQuestion.kind === 'word_order' && <><Box className="race-word-answer">{selectedTokens.length ? selectedTokens.map((id) => { const item = shownQuestion.tokens?.find((tokenItem) => tokenItem.id === id); return <Box as="button" type="button" key={id} disabled={busy || Boolean(feedback)} onClick={() => setSelectedTokens((previous) => previous.filter((candidate) => candidate !== id))}>{item?.text}</Box>; }) : <Text>Tap words to build your answer.</Text>}</Box><Box className="race-word-bank">{shownQuestion.tokens?.filter((item) => !selectedTokens.includes(item.id)).map((item) => <Box as="button" type="button" key={item.id} disabled={busy || Boolean(feedback)} onClick={() => setSelectedTokens((previous) => [...previous, item.id])}>{item.text}</Box>)}</Box>{!feedback && <Button variant="primary" disabled={busy || selectedTokens.length !== shownQuestion.tokens?.length} onClick={() => void answer(shownQuestion, selectedTokens.map((id) => shownQuestion.tokens?.find((item) => item.id === id)?.text || ''), selectedTokens.join(','))}>Check answer</Button>}</>}
          {feedback && <Box className={`race-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`} role="status"><Box className="race-feedback-icon">{feedback.correct ? <Check size={22} /> : <X size={22} />}</Box><Box><Text as="strong">{feedback.correct ? 'Nicely done. Keep moving!' : 'Not this time. Keep racing!'}</Text>{feedback.reveal && <Text>Answer: {feedback.reveal}</Text>}</Box><Button variant="primary" onClick={() => setFeedback(null)} icon={ArrowRight} iconPosition="after">Continue</Button></Box>}
        </Box>}
        {me?.finished_at && !feedback && room.status === 'live' && <Box className="race-finished-wait"><Trophy size={36} /><Text as="h2">You crossed the finish line.</Text><Text>Your score is in. Waiting for your friend to finish…</Text>{room.config.timer_seconds === null && <Text>If your friend disconnects, the race ends after 10 minutes of inactivity.</Text>}</Box>}
        {!me && <Box className="race-finished-wait"><LockKeyhole size={34} /><Text as="h2">This race has started.</Text><Text>Only the two invited players can race. Ask for a new invite if you missed the start.</Text></Box>}
        {me && !shownQuestion && !me.finished_at && <Box className="race-finished-wait"><Clock3 size={28} /><Text as="h2">Loading your next question…</Text></Box>}
        {me && !me.finished_at && !feedback && room.status === 'live' && <Box className="race-leave-action"><Button variant="text" onClick={() => void act('/finish')} disabled={busy}>Finish my race early</Button></Box>}
      </>}

      {room.status === 'expired' && <Box className="race-not-found"><Clock3 size={42} /><Text as="h2">This invite has expired.</Text><Text>Race links last 24 hours. Start a fresh room to play again.</Text><Button variant="primary" onClick={onExit}>Browse games</Button></Box>}
      {room.status === 'finished' && !me && <Box className="race-not-found"><LockKeyhole size={42} /><Text as="h2">Both seats are taken.</Text><Text>Only the two players can review this race. Ask your friend for a new invite.</Text><Button variant="primary" onClick={onExit}>Browse games</Button></Box>}
      {room.status === 'finished' && me && !feedback && <Box className="race-results"><Box className="race-results-hero"><Box className="race-trophy"><Trophy size={43} /></Box><Text className="race-kicker">RACE COMPLETE</Text><Text as="h2">{!opponent ? 'Your race is complete.' : room.winner_seat === 'tie' ? 'It’s a tie!' : room.winner_seat === me.seat ? 'You won the race!' : 'Your friend won this one.'}</Text><Text>Same questions. Two different journeys. Ready for a rematch?</Text></Box><Box className="race-result-cards"><RaceScore player={me} title="YOU" count={maxQuestions} /><Box className="race-versus">VS</Box><RaceScore player={opponent} title="FRIEND" count={maxQuestions} /></Box>{(state?.review ?? me?.review ?? []).length > 0 && <Box className="race-review"><Text as="h3">Your question review</Text>{(state?.review ?? me?.review ?? []).map((item, index) => <Box className="race-review-row" key={`${item.question_id}-${index}`}><Box className={item.correct ? 'is-correct' : 'is-wrong'}>{item.correct ? <Check size={17} /> : <X size={17} />}</Box><Text>{item.prompt}</Text><Text as="small">{item.reveal || item.answer}</Text></Box>)}</Box>}<Button variant="primary" icon={RotateCcw} onClick={onExit}>Play another game</Button></Box>}
    </>}
    {room && error && <ErrorMessage message={error} />}
  </Box>;
}

function RaceSettings({ value, onChange, disabled }: { value: RaceConfig; onChange: (next: RaceConfig) => void; disabled: boolean }) {
  return <Box className="race-settings"><Box className="race-setting"><Text as="strong">Question pool</Text><Box role="group" aria-label="Question pool">{SOURCES.map((item) => <Box as="button" type="button" key={item.id} aria-pressed={value.source === item.id} disabled={disabled} onClick={() => onChange({ ...value, source: item.id })}>{item.label}</Box>)}</Box></Box><Box className="race-setting"><Text as="strong">Starting level</Text><Box role="group" aria-label="Starting level">{LEVELS.map((level) => <Box as="button" type="button" key={level} aria-pressed={value.level === level} disabled={disabled} onClick={() => onChange({ ...value, level })}>{level}</Box>)}</Box></Box><Box className="race-setting"><Text as="strong">Questions</Text><Box role="group" aria-label="Number of questions">{[10, 20, 30].map((count) => <Box as="button" type="button" key={count} aria-pressed={value.question_count === count} disabled={disabled} onClick={() => onChange({ ...value, question_count: count })}>{count}</Box>)}</Box></Box><Box className="race-setting"><Text as="strong"><Heart size={16} /> Lives</Text><Box role="group" aria-label="Number of lives">{LIFE_OPTIONS.map((lives) => <Box as="button" type="button" key={lives ?? 'unlimited'} aria-pressed={value.lives === lives} disabled={disabled} onClick={() => onChange({ ...value, lives })}>{lives ?? 'Unlimited'}</Box>)}</Box></Box><Box className="race-setting"><Text as="strong"><Clock3 size={16} /> Clock</Text><Box role="group" aria-label="Race timer">{TIME_OPTIONS.map((item) => <Box as="button" type="button" key={item.label} aria-pressed={value.timer_seconds === item.seconds} disabled={disabled} onClick={() => onChange({ ...value, timer_seconds: item.seconds })}>{item.label}</Box>)}</Box></Box></Box>;
}

function RaceRunner({ player, label, count }: { player: RacePlayer | null; label: string; count: number }) {
  return <Box className={`race-runner${player ? ' is-here' : ''}`}><Box className="race-runner-avatar">{player ? player.display_name.slice(0, 1).toUpperCase() : '?'}</Box><Text as="small">{label}</Text><Text as="strong">{player?.display_name || 'Open seat'}</Text><Text>{player ? `${count} questions ahead` : 'Waiting for a challenger'}</Text></Box>;
}

function RaceScore({ player, title, count }: { player: RacePlayer | null; title: string; count: number }) {
  return <Box className="race-score"><Box className="race-score-avatar">{player?.display_name.slice(0, 1).toUpperCase() || '?'}</Box><Box className="race-score-person"><Text as="small">{title}</Text><Text as="strong">{player?.display_name || 'Waiting…'}</Text><Text>{player ? `${Math.min(player.current_index, count)} of ${count} answered · ${player.lives_left === null ? '∞' : player.lives_left} lives` : 'No player yet'}</Text></Box><Box className="race-score-points"><Text as="strong">{player?.final_score ?? player?.correct_count ?? 0}</Text><Text as="small">CORRECT</Text></Box></Box>;
}
