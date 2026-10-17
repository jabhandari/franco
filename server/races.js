import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { pool } from './database.js';
import { evaluate, gradeExamQuestion } from './evaluate.js';
import { abandonedRacePlayer, publicRaceQuestion, raceChoices, raceWinner, resolveRaceChoice, validRaceConfig } from './race-rules.js';
import { originalChoiceId, puzzleReveal, usesWordBank } from './puzzle-rules.js';
import { localDateString, normalizeTimeZone } from './streak.js';

export class RaceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MAX_ACTIVE_HOST_ROOMS = 3;
const MAX_HOST_CREATIONS_PER_HOUR = 10;
export const DEFAULT_RACE_CONFIG = Object.freeze({ source: 'lesson_exercises', level: 'A1',
  question_count: 10, lives: 3, timer_seconds: 300 });
let lastPruneAt = 0;

export async function pruneRaceRooms() {
  // Retain an expired-link tombstone briefly, while deleting guest tokens,
  // answer history and question snapshots at expiry.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("UPDATE race_rooms SET status='expired',question_ids='[]'::jsonb WHERE expires_at<=NOW() AND status<>'expired'");
    await client.query("DELETE FROM race_players WHERE room_id IN (SELECT id FROM race_rooms WHERE status='expired')");
    await client.query("DELETE FROM race_rooms WHERE expires_at<NOW()-INTERVAL '7 days'");
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  lastPruneAt = Date.now();
}

async function maybePruneRaceRooms() {
  if (Date.now() - lastPruneAt < 60 * 60 * 1000) return;
  // Cleanup is opportunistic and must never prevent creating a room.
  lastPruneAt = Date.now();
  try { await pruneRaceRooms(); } catch { /* retried on later traffic */ }
}

function code() {
  let result = '';
  while (result.length < 8) {
    // 62*4=248. Discard the remaining 8 byte values to avoid modulo bias.
    for (const byte of randomBytes(8)) {
      if (byte < 248 && result.length < 8) result += CODE_CHARS[byte % 62];
    }
  }
  return result;
}

function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }

function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name)) throw new RaceError(400, 'Enter a name of up to 40 characters.');
  return name;
}

function requireConfig(config) {
  if (!validRaceConfig(config)) throw new RaceError(400, 'Choose a source, level, 1–30 questions, optional 1/3/5 lives, and an optional 1–30 minute timer.');
  return config;
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await work(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function publicPlayer(player, includeHistory = false) {
  if (!player) return null;
  return { seat: player.seat, display_name: player.display_name, current_index: player.current_index,
    correct_count: player.correct_count, lives_left: player.lives_left === -1 ? null : player.lives_left,
    finished_at: player.finished_at, forfeited_at: player.forfeited_at, final_score: player.final_score,
    ...(includeHistory ? { review: player.answer_history_json } : {}) };
}

function publicRoom(room, players) {
  return { code: room.code, status: room.status, config: room.config_json,
    started_at: room.started_at, ends_at: room.ends_at, expires_at: room.expires_at,
    server_now: new Date().toISOString(), winner_seat: room.status === 'finished' ? raceWinner(players) : null };
}

async function lockRoom(client, roomCode) {
  if (typeof roomCode !== 'string' || !/^[0-9A-Za-z]{8}$/.test(roomCode)) throw new RaceError(404, 'Race not found.');
  const result = await client.query('SELECT * FROM race_rooms WHERE code=$1 FOR UPDATE', [roomCode]);
  if (!result.rows[0]) throw new RaceError(404, 'Race not found.');
  let room = result.rows[0];
  const expired = new Date(room.expires_at).getTime() <= Date.now();
  const timedOut = room.status === 'live' && room.ends_at && new Date(room.ends_at).getTime() <= Date.now();
  if (expired && room.status !== 'expired') {
    room = (await client.query("UPDATE race_rooms SET status='expired',question_ids='[]'::jsonb WHERE id=$1 RETURNING *", [room.id])).rows[0];
    await client.query('DELETE FROM race_players WHERE room_id=$1', [room.id]);
    return room;
  }
  if (timedOut) {
    room = (await client.query("UPDATE race_rooms SET status='finished' WHERE id=$1 RETURNING *", [room.id])).rows[0];
    await client.query('UPDATE race_players SET finished_at=COALESCE(finished_at,NOW()),final_score=COALESCE(final_score,correct_count) WHERE room_id=$1', [room.id]);
  } else if (room.status === 'live' && !room.ends_at) {
    // Unlimited means no race clock, but a player who has finished should
    // not wait forever for a disconnected opponent. Reads from each active
    // player refresh their heartbeat; allow ten minutes to reconnect.
    const players = (await client.query('SELECT id,finished_at,last_seen_at FROM race_players WHERE room_id=$1 FOR UPDATE', [room.id])).rows;
    const abandoned = abandonedRacePlayer(players);
    if (abandoned) {
      await client.query('UPDATE race_players SET finished_at=NOW(),forfeited_at=NOW(),final_score=correct_count WHERE id=$1', [abandoned.id]);
      room = (await client.query("UPDATE race_rooms SET status='finished' WHERE id=$1 RETURNING *", [room.id])).rows[0];
    }
  }
  return room;
}

async function playersFor(client, room) {
  return (await client.query('SELECT * FROM race_players WHERE room_id=$1 ORDER BY seat FOR UPDATE', [room.id])).rows;
}

function identify(players, userId, playerToken) {
  if (userId) {
    const accountPlayer = players.find((player) => player.user_id === userId);
    if (accountPlayer) return accountPlayer;
  }
  if (typeof playerToken === 'string' && /^[a-f0-9]{64}$/.test(playerToken)) {
    const digest = Buffer.from(hashToken(playerToken), 'hex');
    return players.find((player) => typeof player.player_token_hash === 'string'
      && /^[a-f0-9]{64}$/.test(player.player_token_hash)
      && timingSafeEqual(Buffer.from(player.player_token_hash, 'hex'), digest)) ?? null;
  }
  return null;
}

function requireHost(room, players, userId) {
  const host = players.find((player) => player.id === room.host_player_id);
  if (!host || !userId || host.user_id !== userId) throw new RaceError(403, 'Only the host can change or start this race.');
  return host;
}

async function fetchQuestion(client, item) {
  if (!item || !['exam_question', 'content_item'].includes(item.kind)) return null;
  if (item.row) return item.row;
  const query = item.kind === 'exam_question'
    ? 'SELECT id,cefr_section,prompt,context,choices_json,answer,explanation FROM exam_questions WHERE id=$1'
    : `SELECT i.id,i.item_type,i.cefr_level,i.current_revision,r.prompt,r.context,r.instructions,
      r.response_json,r.evaluation_json,
      (SELECT m.url FROM media_assets m WHERE m.item_id=i.id AND m.kind='audio' LIMIT 1) AS audio_url
      FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE i.id=$1`;
  return (await client.query(query, [item.id])).rows[0] ?? null;
}

async function state(client, room, players, player, extra = {}) {
  const opponent = players.find((entry) => entry.id !== player?.id) ?? null;
  const ref = room.status === 'live' && player && !player.finished_at ? room.question_ids[player.current_index] : null;
  const questionRow = ref ? await fetchQuestion(client, ref) : null;
  // The room ID is an unguessable per-room choice key. Choice IDs cannot be
  // transformed into a correct answer without the server's source row.
  const me = publicPlayer(player, Boolean(player));
  return { room: publicRoom(room, players), me, you: me,
    opponent: publicPlayer(opponent, Boolean(player) && room.status === 'finished'),
    players: players.map((entry) => publicPlayer(entry, Boolean(player) && (room.status === 'finished' || entry.id === player.id))),
    review: me?.review ?? [],
    question: questionRow ? publicRaceQuestion(questionRow, room.choice_secret, ref.kind) : null, ...extra };
}

const ELIGIBLE_CONTENT = `i.status='published' AND (
  (i.item_type<>'word_order' AND (r.evaluation_json->>'mode')='choice' AND CASE WHEN jsonb_typeof(r.response_json->'choices')='array'
    THEN jsonb_array_length(r.response_json->'choices')>=2 AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.response_json->'choices') AS c(value)
      WHERE jsonb_typeof(c.value)<>'object' OR NOT (c.value ? 'id' OR c.value ? 'key')
        OR jsonb_typeof(c.value->'text')<>'string') ELSE FALSE END
    AND jsonb_typeof(r.response_json->'answer')='string'
    AND (i.item_type<>'listening' OR EXISTS (SELECT 1 FROM media_assets m WHERE m.item_id=i.id AND m.kind='audio')))
  OR (i.item_type='word_order' AND (r.evaluation_json->>'mode')='token_order'
    AND CASE WHEN jsonb_typeof(r.response_json->'tokens')='array'
      THEN jsonb_array_length(r.response_json->'tokens')>=2 AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(r.response_json->'tokens') AS token(value)
        WHERE jsonb_typeof(token.value)<>'string') ELSE FALSE END)
)`;

async function selectQuestions(client, config) {
  const isExam = config.source === 'past_questions';
  const result = isExam
    ? await client.query(`SELECT id,cefr_section,prompt,context,choices_json,answer FROM exam_questions
      WHERE cefr_section=$1 AND choices_json IS NOT NULL AND answer IS NOT NULL ORDER BY random() LIMIT 1500`, [config.level])
    : await client.query(`SELECT i.id,i.item_type,i.cefr_level,i.current_revision,r.prompt,r.context,r.instructions,
      r.response_json,r.evaluation_json,
      (SELECT m.url FROM media_assets m WHERE m.item_id=i.id AND m.kind='audio' LIMIT 1) AS audio_url
      FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision
      WHERE i.cefr_level=$1 AND ${ELIGIBLE_CONTENT} ORDER BY random() LIMIT 1500`, [config.level]);
  const eligible = isExam ? result.rows.filter((row) => raceChoices(row)) : result.rows;
  if (eligible.length < config.question_count) throw new RaceError(409,
    `Only ${eligible.length} race-ready ${config.source === 'past_questions' ? 'past questions' : 'lesson exercises'} are available at ${config.level}. Choose fewer questions or another level.`);
  // Snapshot the full server-only source row. Reimports or edits cannot give
  // the two players different choices or answers halfway through a race.
  return eligible.slice(0, config.question_count).map((row) => ({ kind: isExam ? 'exam_question' : 'content_item',
    id: row.id, revision: isExam ? null : row.current_revision,
    row: isExam ? { id: row.id, cefr_section: row.cefr_section, prompt: row.prompt,
      context: row.context ?? null, choices_json: row.choices_json, answer: row.answer }
      : { id: row.id, item_type: row.item_type, cefr_level: row.cefr_level, current_revision: row.current_revision,
        prompt: row.prompt, context: row.context, instructions: row.instructions,
        response_json: row.response_json, evaluation_json: row.evaluation_json, audio_url: row.audio_url } }));
}

export async function createRoom(userId, config, displayName) {
  if (!userId) throw new RaceError(401, 'Log in to create a race.');
  config ??= DEFAULT_RACE_CONFIG;
  requireConfig(config);
  await maybePruneRaceRooms();
  return transaction(async (client) => {
    // Serialize the host's concurrent room creations across API instances.
    const account = (await client.query('SELECT id,name FROM users WHERE id=$1 FOR UPDATE', [userId])).rows[0];
    if (!account) throw new RaceError(401, 'Log in to create a race.');
    const name = cleanName(displayName ?? account.name);
    const count = (await client.query(`SELECT COUNT(*) FILTER (WHERE r.created_at>NOW()-INTERVAL '1 hour')::int AS hourly,
      COUNT(*) FILTER (WHERE r.status IN ('lobby','live') AND r.expires_at>NOW()
        AND (r.ends_at IS NULL OR r.ends_at>NOW()))::int AS active
      FROM race_rooms r JOIN race_players p ON p.id=r.host_player_id WHERE p.user_id=$1`, [userId])).rows[0];
    if (count.hourly >= MAX_HOST_CREATIONS_PER_HOUR || count.active >= MAX_ACTIVE_HOST_ROOMS) throw new RaceError(429, 'Too many active races. Finish one or try again later.');
    const roomId = randomUUID();
    const hostId = randomUUID();
    let room;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const roomCode = code();
      room = (await client.query(`INSERT INTO race_rooms(id,code,status,config_json,choice_secret,expires_at)
        VALUES($1,$2,'lobby',$3::jsonb,$4,NOW()+INTERVAL '24 hours')
        ON CONFLICT(code) DO NOTHING RETURNING *`,
      [roomId, roomCode, JSON.stringify(config), randomBytes(32).toString('hex')])).rows[0];
      if (room) break;
    }
    if (!room) throw new RaceError(503, 'Could not create an invite code. Try again.');
    const host = (await client.query(`INSERT INTO race_players(id,room_id,user_id,display_name,seat,lives_left)
      VALUES($1,$2,$3,$4,1,$5) RETURNING *`, [hostId, roomId, userId, name, config.lives ?? -1])).rows[0];
    room = (await client.query('UPDATE race_rooms SET host_player_id=$2 WHERE id=$1 RETURNING *', [roomId, hostId])).rows[0];
    return state(client, room, [host], host);
  });
}

export async function getRoom(roomCode, userId = null, playerToken = null) {
  return transaction(async (client) => {
    const room = await lockRoom(client, roomCode);
    const players = await playersFor(client, room);
    let player = identify(players, userId, playerToken);
    if (room.status === 'live' && player && !player.finished_at) {
      const updated = (await client.query(`UPDATE race_players SET last_seen_at=NOW() WHERE id=$1
        AND last_seen_at<NOW()-INTERVAL '15 seconds' RETURNING *`, [player.id])).rows[0];
      if (updated) player = updated;
    }
    return state(client, room, players, player);
  });
}

export async function joinRoom(roomCode, userId, displayName) {
  return transaction(async (client) => {
    const room = await lockRoom(client, roomCode);
    if (room.status !== 'lobby') throw new RaceError(409, room.status === 'live' ? 'This race has already started.' : 'This race is no longer available.');
    const players = await playersFor(client, room);
    if (userId) {
      const existing = players.find((player) => player.user_id === userId);
      if (existing) return state(client, room, players, existing);
    }
    if (players.length >= 2) throw new RaceError(409, 'This race is full.');
    const account = userId ? (await client.query('SELECT name FROM users WHERE id=$1', [userId])).rows[0] : null;
    if (userId && !account) throw new RaceError(401, 'Log in again to join.');
    const name = cleanName(userId ? account.name : displayName);
    const guestToken = userId ? null : randomBytes(32).toString('hex');
    const player = (await client.query(`INSERT INTO race_players
      (id,room_id,user_id,display_name,player_token_hash,seat,lives_left)
      VALUES($1,$2,$3,$4,$5,2,$6) RETURNING *`,
    [randomUUID(), room.id, userId || null, name, guestToken ? hashToken(guestToken) : null, room.config_json.lives ?? -1])).rows[0];
    return state(client, room, [...players, player], player, guestToken ? { player_token: guestToken } : {});
  });
}

export async function configureRoom(roomCode, userId, config) {
  requireConfig(config);
  return transaction(async (client) => {
    let room = await lockRoom(client, roomCode);
    const players = await playersFor(client, room);
    requireHost(room, players, userId);
    if (room.status !== 'lobby') throw new RaceError(409, 'Race settings can only change before the start.');
    room = (await client.query('UPDATE race_rooms SET config_json=$2::jsonb WHERE id=$1 RETURNING *', [room.id, JSON.stringify(config)])).rows[0];
    const updated = (await client.query('UPDATE race_players SET lives_left=$2 WHERE room_id=$1 RETURNING *', [room.id, config.lives ?? -1])).rows;
    return state(client, room, updated, updated.find((player) => player.id === room.host_player_id));
  });
}

export async function startRoom(roomCode, userId) {
  return transaction(async (client) => {
    let room = await lockRoom(client, roomCode);
    const players = await playersFor(client, room);
    const host = requireHost(room, players, userId);
    if (room.status !== 'lobby') throw new RaceError(409, 'This race cannot be started again.');
    if (players.length !== 2) throw new RaceError(409, 'Wait for a friend to join.');
    const questions = await selectQuestions(client, room.config_json);
    const readyPlayers = (await client.query('UPDATE race_players SET last_seen_at=NOW() WHERE room_id=$1 RETURNING *', [room.id])).rows;
    room = (await client.query(`UPDATE race_rooms SET status='live',question_ids=$2::jsonb,started_at=NOW(),
      ends_at=CASE WHEN $3::int IS NULL THEN NULL ELSE NOW()+($3::int * INTERVAL '1 second') END
      WHERE id=$1 RETURNING *`, [room.id, JSON.stringify(questions), room.config_json.timer_seconds])).rows[0];
    return state(client, room, readyPlayers, readyPlayers.find((player) => player.id === host.id));
  });
}

async function recordAttempt(client, room, player, ref, response, correct, timeZone) {
  if (!player.user_id) return;
  const kind = ref.kind;
  const count = (await client.query(`SELECT COUNT(*)::int AS count FROM learning_attempts
    WHERE user_id=$1 AND item_kind=$2 AND COALESCE(item_id,legacy_ref)=$3`, [player.user_id, kind, ref.id])).rows[0].count;
  await client.query(`INSERT INTO learning_attempts
    (id,user_id,item_id,item_kind,legacy_ref,revision,response_json,evaluation_json,score,correct,attempt_number,session_id)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12)`,
  [randomUUID(), player.user_id, kind === 'content_item' ? ref.id : null, kind,
    kind === 'exam_question' ? ref.id : null, ref.revision ?? 1,
    JSON.stringify(response), JSON.stringify({ correct, evaluator: 'race' }), Number(correct), correct, count + 1, room.id]);
  await client.query(`INSERT INTO learner_activity_days(user_id,activity_date,attempts_count,first_activity_at,last_activity_at)
    VALUES($1,$2,1,NOW(),NOW())
    ON CONFLICT(user_id,activity_date) DO UPDATE SET attempts_count=learner_activity_days.attempts_count+1,
      first_activity_at=LEAST(learner_activity_days.first_activity_at,EXCLUDED.first_activity_at),
      last_activity_at=GREATEST(learner_activity_days.last_activity_at,EXCLUDED.last_activity_at)`,
  [player.user_id, localDateString(new Date(), normalizeTimeZone(timeZone))]);
}

export async function answerRoom(roomCode, userId, playerToken, questionId, response, timeZone) {
  if (typeof questionId !== 'string' || questionId.length > 100 || !(
    typeof response === 'string' && response.length <= 100
    || Array.isArray(response) && response.length <= 100 && response.every((word) => typeof word === 'string' && word.length <= 100))) {
    throw new RaceError(400, 'Choose an answer for the current question.');
  }
  return transaction(async (client) => {
    let room = await lockRoom(client, roomCode);
    let players = await playersFor(client, room);
    const player = identify(players, userId, playerToken);
    if (!player) throw new RaceError(401, 'Join this race before answering.');
    const past = player.answer_history_json.find((entry) => entry.question_id === questionId
      && JSON.stringify(entry.response) === JSON.stringify(response));
    if (past) return state(client, room, players, player, { correct: past.correct, reveal: past.reveal, duplicate: true });
    if (room.status !== 'live') throw new RaceError(409, 'This race has ended.');
    if (player.finished_at) throw new RaceError(409, 'You have finished this race.');
    const ref = room.question_ids[player.current_index];
    if (!ref || ref.id !== questionId) throw new RaceError(409, 'This question is no longer active. Refresh the race.');
    const source = await fetchQuestion(client, ref);
    if (!source || ref.kind === 'exam_question' && !raceChoices(source)) throw new RaceError(409, 'This question is no longer available.');
    let gradedResponse;
    let selectedText;
    let correct;
    let reveal;
    if (ref.kind === 'exam_question') {
      const selected = resolveRaceChoice(source, response, room.choice_secret);
      if (!selected) throw new RaceError(400, 'Choose one of the displayed answers.');
      gradedResponse = selected.text;
      selectedText = selected.text;
      correct = gradeExamQuestion(source, selected.id) || gradeExamQuestion(source, selected.text);
      reveal = raceChoices(source).find((choice) => gradeExamQuestion(source, choice.id)
        || gradeExamQuestion(source, choice.text))?.text ?? source.answer;
    } else if (source.item_type === 'word_order') {
      if (!Array.isArray(response) || !usesWordBank(response, source.response_json.tokens)) {
        throw new RaceError(400, 'Build your answer from the words shown.');
      }
      gradedResponse = response;
      selectedText = response.join(' ');
      correct = evaluate(source, response);
      reveal = puzzleReveal(source);
    } else {
      if (typeof response !== 'string') throw new RaceError(400, 'Choose one of the displayed answers.');
      const choiceId = originalChoiceId(source, response, room.choice_secret);
      if (choiceId === null) throw new RaceError(400, 'Choose one of the displayed answers.');
      const selected = source.response_json.choices.find((choice) => String(choice.id ?? choice.key) === choiceId);
      gradedResponse = choiceId;
      selectedText = selected?.text ?? '';
      correct = evaluate(source, choiceId) || Boolean(selected && evaluate(source, selected.text));
      reveal = puzzleReveal(source);
    }
    const livesLeft = player.lives_left === -1 ? -1 : Math.max(0, player.lives_left - Number(!correct));
    const nextIndex = player.current_index + 1;
    const finished = livesLeft === 0 || nextIndex >= room.question_ids.length;
    const history = [...player.answer_history_json, { question_id: questionId, prompt: source.prompt, index: player.current_index,
      response, selected: selectedText, correct, reveal, answered_at: new Date().toISOString() }];
    const updated = (await client.query(`UPDATE race_players SET current_index=$2,correct_count=correct_count+$3,
      lives_left=$4,answer_history_json=$5::jsonb,last_seen_at=NOW(),
      finished_at=CASE WHEN $6 THEN NOW() ELSE finished_at END,
      final_score=CASE WHEN $6 THEN correct_count+$3 ELSE final_score END WHERE id=$1 RETURNING *`,
    [player.id, nextIndex, Number(correct), livesLeft, JSON.stringify(history), finished])).rows[0];
    await recordAttempt(client, room, player, ref, gradedResponse, correct, timeZone);
    players = players.map((entry) => entry.id === player.id ? updated : entry);
    if (players.length === 2 && players.every((entry) => entry.finished_at)) {
      room = (await client.query("UPDATE race_rooms SET status='finished' WHERE id=$1 RETURNING *", [room.id])).rows[0];
    }
    return state(client, room, players, updated, { correct, reveal, duplicate: false });
  });
}

export async function finishRoom(roomCode, userId, playerToken) {
  return transaction(async (client) => {
    let room = await lockRoom(client, roomCode);
    let players = await playersFor(client, room);
    const player = identify(players, userId, playerToken);
    if (!player) throw new RaceError(401, 'Join this race before finishing.');
    if (room.status === 'lobby') throw new RaceError(409, 'Start the race first.');
    if (room.status !== 'live' || player.finished_at) return state(client, room, players, player);
    const updated = (await client.query('UPDATE race_players SET finished_at=NOW(),forfeited_at=NOW(),final_score=correct_count WHERE id=$1 RETURNING *', [player.id])).rows[0];
    players = players.map((entry) => entry.id === player.id ? updated : entry);
    if (players.length === 2 && players.every((entry) => entry.finished_at)) {
      room = (await client.query("UPDATE race_rooms SET status='finished' WHERE id=$1 RETURNING *", [room.id])).rows[0];
    }
    return state(client, room, players, updated);
  });
}
