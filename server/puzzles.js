import { randomUUID } from 'node:crypto';
import { pool, query } from './database.js';
import { evaluate } from './evaluate.js';
import { levelOrder, originalChoiceId, publicPuzzleQuestion, puzzleReveal, usesWordBank, validPuzzleConfig } from './puzzle-rules.js';
import { BOSS_ENCOUNTERS, MAX_BOUNTIES, expeditionAnswer, expeditionChoice, expeditionLevelOrder, freshExpeditionState, isBossEncounter, loupeRemovals, useProvision } from './expedition-rules.js';
import { chooseVerbCard, gradeVerbChoice, publicVerbQuestion, verbCard } from './verb-sprint-deck.js';

export class PuzzleError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function publicRun(row) {
  return { id: row.id, game: row.game, combo: row.combo, best_combo: row.best_combo,
    lives: row.lives_total, lives_left: row.lives_left,
    minutes: row.minutes, score: row.score, answered: row.answered_count,
    started_at: row.started_at, expires_at: row.expires_at, ended_at: row.ended_at,
    server_now: new Date().toISOString(),
    status: row.status, end_reason: row.end_reason, expedition: row.game === 'french_expedition' ? row.expedition_state : null };
}

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

const ELIGIBLE = `i.status='published' AND (
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

const QUESTION_SELECT = `SELECT i.id,i.item_type,i.cefr_level,i.current_revision,r.prompt,r.context,r.instructions,
  r.response_json,r.evaluation_json,
  (SELECT m.url FROM media_assets m WHERE m.item_id=i.id AND m.kind='audio' LIMIT 1) AS audio_url
  FROM content_items i JOIN content_revisions r ON r.item_id=i.id`;

async function nextQuestion(client, score, seen, levels = levelOrder(score)) {
  for (const level of levels) {
    const result = await client.query(`${QUESTION_SELECT} WHERE r.revision=i.current_revision AND ${ELIGIBLE}
      AND i.cefr_level=$1 AND NOT (i.id=ANY($2::text[])) ORDER BY random() LIMIT 1`, [level, seen]);
    if (result.rows[0]) return result.rows[0];
  }
  return null;
}

async function currentQuestion(client, run) {
  if (!run.current_item_id) return null;
  const result = await client.query(`${QUESTION_SELECT} WHERE i.id=$1 AND r.revision=$2`,
    [run.current_item_id, run.current_item_revision]);
  return result.rows[0] || null;
}

async function lockedRun(client, userId, runId, game = 'french_rush') {
  const result = await client.query('SELECT * FROM puzzle_runs WHERE id=$1 AND user_id=$2 FOR UPDATE', [runId, userId]);
  if (!result.rows[0] || result.rows[0].game !== game) throw new PuzzleError(404, 'Puzzle run not found.');
  return result.rows[0];
}

async function finishIfExpired(client, run) {
  if (run.status !== 'active' || !run.expires_at || new Date(run.expires_at).getTime() > Date.now()) return run;
  const result = await client.query("UPDATE puzzle_runs SET status='finished',end_reason='time',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL,current_verb_id=NULL WHERE id=$1 RETURNING *", [run.id]);
  return result.rows[0];
}

export async function puzzleSummary(userId) {
  await query("UPDATE puzzle_runs SET status='finished',end_reason='time',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL,current_verb_id=NULL WHERE user_id=? AND status='active' AND expires_at<=NOW()", [userId]);
  const records = await query("SELECT lives_total AS lives,minutes,MAX(score)::int AS best FROM puzzle_runs WHERE user_id=? AND game='french_rush' GROUP BY lives_total,minutes ORDER BY lives_total,minutes NULLS LAST", [userId]);
  const active = (await query("SELECT * FROM puzzle_runs WHERE user_id=? AND game='french_rush' AND status='active' ORDER BY started_at DESC LIMIT 1", [userId]))[0];
  const verbBest = (await query("SELECT COALESCE(MAX(score),0)::int AS best FROM puzzle_runs WHERE user_id=? AND game='verb_sprint'", [userId]))[0].best;
  const verbActive = (await query("SELECT * FROM puzzle_runs WHERE user_id=? AND game='verb_sprint' AND status='active' ORDER BY started_at DESC LIMIT 1", [userId]))[0];
  const expeditionBest = (await query("SELECT COALESCE(MAX(score),0)::int AS best FROM puzzle_runs WHERE user_id=? AND game='french_expedition'", [userId]))[0].best;
  const expeditionActive = (await query("SELECT * FROM puzzle_runs WHERE user_id=? AND game='french_expedition' AND status='active' ORDER BY started_at DESC LIMIT 1", [userId]))[0];
  return { expedition_best: expeditionBest, expedition_active: expeditionActive ? publicRun(expeditionActive) : null,
    records, best: records.reduce((max, record) => Math.max(max, record.best), 0), active: active ? publicRun(active) : null,
    verb_best: verbBest, verb_active: verbActive ? publicRun(verbActive) : null };
}

export async function startPuzzle(userId, lives, minutes) {
  if (!validPuzzleConfig(lives, minutes)) throw new PuzzleError(400, 'Choose 1, 3 or 5 lives and 3, 5 or unlimited minutes.');
  return inTransaction(async (client) => {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const question = await nextQuestion(client, 0, []);
    if (!question) throw new PuzzleError(409, 'No published puzzle questions are available yet.');
    await client.query("UPDATE puzzle_runs SET status='abandoned',end_reason='restarted',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL WHERE user_id=$1 AND game='french_rush' AND status='active'", [userId]);
    const secret = randomUUID();
    const result = await client.query(`INSERT INTO puzzle_runs
      (id,user_id,game,lives_total,lives_left,minutes,expires_at,current_item_id,current_item_revision,seen_item_ids,choice_secret)
      VALUES($1,$2,'french_rush',$3,$3,$4::smallint,CASE WHEN $4::int IS NULL THEN NULL ELSE NOW()+($4::int*INTERVAL '1 minute') END,$5,$6,ARRAY[$5]::text[],$7)
      RETURNING *`, [randomUUID(), userId, lives, minutes, question.id, question.current_revision, secret]);
    return { run: publicRun(result.rows[0]), question: publicPuzzleQuestion(question, secret) };
  });
}

export async function getPuzzle(userId, runId) {
  return inTransaction(async (client) => {
    let run = await finishIfExpired(client, await lockedRun(client, userId, runId));
    const question = run.status === 'active' ? await currentQuestion(client, run) : null;
    if (run.status === 'active' && !question) {
      const result = await client.query("UPDATE puzzle_runs SET status='finished',end_reason='questions_exhausted',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL WHERE id=$1 RETURNING *", [run.id]);
      run = result.rows[0];
    }
    return { run: publicRun(run), question: publicPuzzleQuestion(question, run.choice_secret) };
  });
}

export async function answerPuzzle(userId, runId, questionId, response) {
  if (typeof questionId !== 'string' || !(typeof response === 'string' && response.length <= 500 ||
    Array.isArray(response) && response.length <= 100 && response.every((token) => typeof token === 'string' && token.length <= 100))) {
    throw new PuzzleError(400, 'A valid question and answer are required.');
  }
  return inTransaction(async (client) => {
    const run = await finishIfExpired(client, await lockedRun(client, userId, runId));
    if (run.status !== 'active') return { run: publicRun(run), question: null, timed_out: run.end_reason === 'time' };
    if (run.current_item_id !== questionId) throw new PuzzleError(409, 'This question is no longer active. Refresh your run.');
    const current = await currentQuestion(client, run);
    if (!current) throw new PuzzleError(409, 'This question is no longer available.');
    if (current.item_type === 'word_order' ? !Array.isArray(response) : typeof response !== 'string') throw new PuzzleError(400, 'Answer format does not match this question.');
    const gradedResponse = current.item_type === 'word_order' ? response : originalChoiceId(current, response, run.choice_secret);
    if (gradedResponse === null) throw new PuzzleError(400, 'Choose one of the answers shown.');
    if (current.item_type === 'word_order' && !usesWordBank(gradedResponse, current.response_json.tokens)) {
      throw new PuzzleError(400, 'Build your answer using the words shown.');
    }
    const sourceChoice = current.item_type === 'word_order' ? null
      : current.response_json.choices.find((choice) => String(choice.id ?? choice.key) === gradedResponse);
    const correct = evaluate(current, gradedResponse) || Boolean(sourceChoice && evaluate(current, sourceChoice.text));
    const score = run.score + Number(correct);
    const livesLeft = run.lives_left - Number(!correct);
    const next = livesLeft > 0 ? await nextQuestion(client, score, run.seen_item_ids) : null;
    const endReason = livesLeft === 0 ? 'lives' : !next ? 'questions_exhausted' : null;
    const result = await client.query(`UPDATE puzzle_runs SET score=$2,lives_left=$3,answered_count=answered_count+1,
      current_item_id=$4,current_item_revision=$5,seen_item_ids=CASE WHEN $4::text IS NULL THEN seen_item_ids ELSE array_append(seen_item_ids,$4::text) END,
      status=CASE WHEN $6::text IS NULL THEN 'active' ELSE 'finished' END,end_reason=$6,ended_at=CASE WHEN $6::text IS NULL THEN NULL ELSE NOW() END
      WHERE id=$1 RETURNING *`, [run.id, score, livesLeft, next?.id ?? null, next?.current_revision ?? null, endReason]);
    return { correct, reveal: puzzleReveal(current), run: publicRun(result.rows[0]), question: publicPuzzleQuestion(next, run.choice_secret) };
  });
}

export async function endPuzzle(userId, runId) {
  return inTransaction(async (client) => {
    const run = await lockedRun(client, userId, runId);
    if (run.status !== 'active') return { run: publicRun(run), question: null };
    const result = await client.query("UPDATE puzzle_runs SET status='abandoned',end_reason='left',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL WHERE id=$1 RETURNING *", [run.id]);
    return { run: publicRun(result.rows[0]), question: null };
  });
}

export async function startVerbSprint(userId) {
  return inTransaction(async (client) => {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    await client.query("UPDATE puzzle_runs SET status='abandoned',end_reason='restarted',ended_at=NOW(),current_verb_id=NULL WHERE user_id=$1 AND game='verb_sprint' AND status='active'", [userId]);
    const first = chooseVerbCard(0, []);
    const secret = randomUUID();
    const result = await client.query(`INSERT INTO puzzle_runs
      (id,user_id,game,lives_total,lives_left,minutes,expires_at,current_verb_id,seen_item_ids,choice_secret)
      VALUES($1,$2,'verb_sprint',3,3,NULL,NOW()+INTERVAL '1 minute',$3,ARRAY[$3]::text[],$4)
      RETURNING *`, [randomUUID(), userId, first.id, secret]);
    return { run: publicRun(result.rows[0]), question: publicVerbQuestion(first, secret) };
  });
}

export async function getVerbSprint(userId, runId) {
  return inTransaction(async (client) => {
    let run = await finishIfExpired(client, await lockedRun(client, userId, runId, 'verb_sprint'));
    const question = run.status === 'active' ? verbCard(run.current_verb_id) : null;
    if (run.status === 'active' && !question) {
      const result = await client.query("UPDATE puzzle_runs SET status='finished',end_reason='questions_exhausted',ended_at=NOW(),current_verb_id=NULL WHERE id=$1 RETURNING *", [run.id]);
      run = result.rows[0];
    }
    return { run: publicRun(run), question: publicVerbQuestion(question, run.choice_secret) };
  });
}

export async function answerVerbSprint(userId, runId, questionId, response) {
  if (typeof questionId !== 'string' || typeof response !== 'string' || response.length > 100) {
    throw new PuzzleError(400, 'A valid question and answer are required.');
  }
  return inTransaction(async (client) => {
    const run = await finishIfExpired(client, await lockedRun(client, userId, runId, 'verb_sprint'));
    if (run.status !== 'active') return { run: publicRun(run), question: null, timed_out: run.end_reason === 'time' };
    if (run.current_verb_id !== questionId) throw new PuzzleError(409, 'This question is no longer active. Refresh your run.');
    const current = verbCard(questionId);
    if (!current) throw new PuzzleError(409, 'This question is no longer available. Refresh your run.');
    const correct = gradeVerbChoice(current, response, run.choice_secret);
    if (correct === null) throw new PuzzleError(400, 'Choose one of the answers shown.');
    const score = run.score + Number(correct);
    const combo = correct ? run.combo + 1 : 0;
    const next = chooseVerbCard(score, run.seen_item_ids);
    const endReason = next ? null : 'questions_exhausted';
    const result = await client.query(`UPDATE puzzle_runs SET score=$2,combo=$3,best_combo=GREATEST(best_combo,$3),
      answered_count=answered_count+1,current_verb_id=$4,
      seen_item_ids=CASE WHEN $4::text IS NULL THEN seen_item_ids ELSE array_append(seen_item_ids,$4::text) END,
      status=CASE WHEN $5::text IS NULL THEN 'active' ELSE 'finished' END,end_reason=$5,
      ended_at=CASE WHEN $5::text IS NULL THEN NULL ELSE NOW() END WHERE id=$1 RETURNING *`,
      [run.id, score, combo, next?.id ?? null, endReason]);
    return { correct, reveal: current.answer, run: publicRun(result.rows[0]), question: publicVerbQuestion(next, run.choice_secret) };
  });
}

export async function endVerbSprint(userId, runId) {
  return inTransaction(async (client) => {
    const run = await lockedRun(client, userId, runId, 'verb_sprint');
    if (run.status !== 'active') return { run: publicRun(run), question: null };
    const result = await client.query("UPDATE puzzle_runs SET status='abandoned',end_reason='left',ended_at=NOW(),current_verb_id=NULL WHERE id=$1 RETURNING *", [run.id]);
    return { run: publicRun(result.rows[0]), question: null };
  });
}

function publicExpeditionQuestion(row, secret, state) {
  const question = publicPuzzleQuestion(row, secret, state.removedChoices ?? []);
  if (!question) return null;
  return { ...question, bounty: state.activeBounty === question.id, boss: state.bossEncounter === true };
}

function expeditionProvisions(state) {
  const provisions = state.provisions ?? {};
  return { loupe: provisions.loupe ?? 0, second_chance: provisions.second_chance ?? 0, dictionary: provisions.dictionary ?? 0 };
}

// Issue the question for an upcoming encounter: a wanted bounty rematch, a
// Gardien boss gate, or a fresh question at the route's CEFR target.
async function issueExpeditionQuestion(client, run, state, encounterNumber, excludeItemId = null) {
  const boss = isBossEncounter(encounterNumber);
  const bounty = (state.bounties ?? []).find((entry) => entry.item_id !== excludeItemId);
  if (bounty && (boss || Math.random() < 0.45)) {
    const found = await client.query(`${QUESTION_SELECT} WHERE r.revision=i.current_revision AND ${ELIGIBLE} AND i.id=$1`, [bounty.item_id]);
    if (found.rows[0]) {
      return { row: found.rows[0], bountyItemId: found.rows[0].id, boss, bonus: (boss ? 2 : 0) + 2 };
    }
  }
  if (boss) {
    const guardian = await nextQuestion(client, 0, run.seen_item_ids, expeditionLevelOrder(encounterNumber - 1, 'hard'));
    if (guardian) return { row: guardian, bountyItemId: null, boss: true, bonus: 2 };
  }
  const row = await nextQuestion(client, 0, run.seen_item_ids, expeditionLevelOrder(encounterNumber - 1, state.route));
  return { row, bountyItemId: null, boss, bonus: 0 };
}

function dictionaryHint(row) {
  const reveal = puzzleReveal(row).trim();
  if (!reveal) return null;
  if (row.item_type === 'word_order') return `Premier mot : « ${reveal.split(/\s+/)[0]} »`;
  return `Ça commence par « ${reveal[0]} »`;
}

const expeditionStart = () => freshExpeditionState();

export async function startExpedition(userId) {
  return inTransaction(async (client) => {
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
    const question = await nextQuestion(client, 0, [], expeditionLevelOrder(0, 'start'));
    if (!question) throw new PuzzleError(409, 'No published expedition questions are available yet.');
    await client.query("UPDATE puzzle_runs SET status='abandoned',end_reason='restarted',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL WHERE user_id=$1 AND game='french_expedition' AND status='active'", [userId]);
    const secret = randomUUID();
    const state = expeditionStart();
    const result = await client.query(`INSERT INTO puzzle_runs
      (id,user_id,game,lives_total,lives_left,minutes,current_item_id,current_item_revision,seen_item_ids,choice_secret,expedition_state)
      VALUES($1,$2,'french_expedition',3,3,NULL,$3,$4,ARRAY[$3]::text[],$5,$6::jsonb) RETURNING *`,
      [randomUUID(), userId, question.id, question.current_revision, secret, JSON.stringify(state)]);
    return { run: publicRun(result.rows[0]), question: publicExpeditionQuestion(question, secret, state) };
  });
}

export async function getExpedition(userId, runId) {
  return inTransaction(async (client) => {
    let run = await lockedRun(client, userId, runId, 'french_expedition');
    const question = run.status === 'active' && run.expedition_state.phase === 'question' ? await currentQuestion(client, run) : null;
    if (run.status === 'active' && run.expedition_state.phase === 'question' && !question) {
      const result = await client.query("UPDATE puzzle_runs SET status='finished',end_reason='questions_exhausted',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL WHERE id=$1 RETURNING *", [run.id]);
      run = result.rows[0];
    }
    return { run: publicRun(run), question: publicExpeditionQuestion(question, run.choice_secret, run.expedition_state) };
  });
}

export async function answerExpedition(userId, runId, questionId, response) {
  if (typeof questionId !== 'string' || !(typeof response === 'string' && response.length <= 500 ||
    Array.isArray(response) && response.length <= 100 && response.every((token) => typeof token === 'string' && token.length <= 100))) {
    throw new PuzzleError(400, 'A valid question and answer are required.');
  }
  return inTransaction(async (client) => {
    const run = await lockedRun(client, userId, runId, 'french_expedition');
    const state = run.expedition_state;
    if (run.status !== 'active' || state.phase !== 'question' || run.current_item_id !== questionId) {
      throw new PuzzleError(409, 'This encounter is no longer active. Refresh your run.');
    }
    const current = await currentQuestion(client, run);
    if (!current) throw new PuzzleError(409, 'This question is no longer available.');
    if (current.item_type === 'word_order' ? !Array.isArray(response) : typeof response !== 'string') throw new PuzzleError(400, 'Answer format does not match this question.');
    const graded = current.item_type === 'word_order' ? response : originalChoiceId(current, response, run.choice_secret);
    if (graded === null) throw new PuzzleError(400, 'Choose one of the answers shown.');
    if (current.item_type === 'word_order' && !usesWordBank(graded, current.response_json.tokens)) throw new PuzzleError(400, 'Build your answer using the words shown.');
    const sourceChoice = current.item_type === 'word_order' ? null : current.response_json.choices.find((choice) => String(choice.id ?? choice.key) === graded);
    const correct = evaluate(current, graded) || Boolean(sourceChoice && evaluate(current, sourceChoice.text));
    const provisions = expeditionProvisions(state);
    // Seconde chance: the first miss of a run is forgiven — the traveler
    // keeps their life and may attempt the same encounter again.
    if (!correct && provisions.second_chance > 0) {
      const retried = { ...state, provisions: { ...state.provisions, second_chance: 0 }, combo: 0 };
      await client.query('UPDATE puzzle_runs SET expedition_state=$2::jsonb,combo=0 WHERE id=$1', [run.id, JSON.stringify(retried)]);
      return { correct: false, retry: true,
        run: publicRun({ ...run, expedition_state: retried, combo: 0 }),
        question: publicExpeditionQuestion(current, run.choice_secret, retried) };
    }
    const outcome = expeditionAnswer(state, correct, current.cefr_level, run.lives_left);
    let bounties = state.bounties ?? [];
    const misses = [...(state.misses ?? [])];
    let bountiesCleared = state.bountiesCleared ?? 0;
    let bossesBeaten = state.bossesBeaten ?? 0;
    if (!correct) {
      const entry = { item_id: current.id, revision: current.current_revision, prompt: current.prompt, reveal: puzzleReveal(current) };
      misses.push(entry);
      if (bounties.length < MAX_BOUNTIES && !bounties.some((bounty) => bounty.item_id === current.id)) bounties = [...bounties, entry];
    } else {
      if (state.activeBounty) {
        bounties = bounties.filter((bounty) => bounty.item_id !== state.activeBounty);
        bountiesCleared += 1;
      }
      if (state.bossEncounter) bossesBeaten += 1;
    }
    const nextState = { ...outcome.state, bounties, misses, bountiesCleared, bossesBeaten,
      activeBounty: null, bossEncounter: false, removedChoices: [] };
    let next = null;
    let endReason = outcome.done;
    if (!outcome.done && !correct) {
      const issued = await issueExpeditionQuestion(client, run, nextState, outcome.state.step + 1, current.id);
      if (issued.row) {
        next = issued.row;
        nextState.questionBonus = issued.bonus;
        nextState.activeBounty = issued.bountyItemId;
        nextState.bossEncounter = issued.boss;
      } else {
        endReason = 'questions_exhausted';
      }
    }
    const result = await client.query(`UPDATE puzzle_runs SET score=score+$2,lives_left=$3,answered_count=answered_count+1,
      combo=$8,best_combo=GREATEST(best_combo,$8),
      expedition_state=$4::jsonb,current_item_id=$5,current_item_revision=$6,
      seen_item_ids=CASE WHEN $5::text IS NULL THEN seen_item_ids ELSE array_append(seen_item_ids,$5::text) END,
      status=CASE WHEN $7::text IS NULL THEN 'active' ELSE 'finished' END,end_reason=$7,
      ended_at=CASE WHEN $7::text IS NULL THEN NULL ELSE NOW() END WHERE id=$1 RETURNING *`,
      [run.id, outcome.points, outcome.livesLeft, JSON.stringify(nextState), next?.id ?? null, next?.current_revision ?? null, endReason, outcome.state.combo]);
    return { correct, reveal: puzzleReveal(current), points: outcome.points, livesLost: outcome.livesLost,
      run: publicRun(result.rows[0]), question: publicExpeditionQuestion(next, run.choice_secret, nextState) };
  });
}

export async function chooseExpeditionRoute(userId, runId, route, wager = false) {
  return inTransaction(async (client) => {
    const run = await lockedRun(client, userId, runId, 'french_expedition');
    if (run.status !== 'active') throw new PuzzleError(409, 'This expedition has ended.');
    const choice = expeditionChoice(run.expedition_state, route, run.lives_left, run.lives_total, wager);
    if (!choice) throw new PuzzleError(409, 'Choose a route after a correct answer.');
    const issued = await issueExpeditionQuestion(client, run, choice, choice.step + 1);
    const endReason = issued.row ? null : 'questions_exhausted';
    const nextState = { ...choice, livesLeft: undefined, questionBonus: issued.bonus,
      activeBounty: issued.bountyItemId, bossEncounter: issued.boss, removedChoices: [] };
    const result = await client.query(`UPDATE puzzle_runs SET expedition_state=$2::jsonb,lives_left=$3,current_item_id=$4,current_item_revision=$5,
      seen_item_ids=CASE WHEN $4::text IS NULL THEN seen_item_ids ELSE array_append(seen_item_ids,$4::text) END,
      status=CASE WHEN $6::text IS NULL THEN 'active' ELSE 'finished' END,end_reason=$6,
      ended_at=CASE WHEN $6::text IS NULL THEN NULL ELSE NOW() END WHERE id=$1 RETURNING *`,
      [run.id, JSON.stringify(nextState), choice.livesLeft, issued.row?.id ?? null, issued.row?.current_revision ?? null, endReason]);
    return { run: publicRun(result.rows[0]), question: publicExpeditionQuestion(issued.row, run.choice_secret, nextState) };
  });
}

export async function useExpeditionProvision(userId, runId, kind) {
  if (kind !== 'loupe' && kind !== 'dictionary') throw new PuzzleError(400, 'Unknown provision.');
  return inTransaction(async (client) => {
    const run = await lockedRun(client, userId, runId, 'french_expedition');
    const state = run.expedition_state;
    if (run.status !== 'active' || state.phase !== 'question') throw new PuzzleError(409, 'Provisions can only be used during an encounter.');
    const current = await currentQuestion(client, run);
    if (!current || run.current_item_id !== current.id) throw new PuzzleError(409, 'This encounter is no longer active.');
    const applied = useProvision(state, kind);
    if (!applied) throw new PuzzleError(409, 'No provisions of that kind remain.');
    if (kind === 'loupe') {
      if (current.item_type === 'word_order') throw new PuzzleError(400, 'The loupe only works on choice encounters.');
      if ((state.removedChoices ?? []).length > 0) throw new PuzzleError(409, 'The loupe was already used on this encounter.');
      const data = current.response_json || {};
      const answerId = String(data.answer ?? current.evaluation_json?.answer ?? '');
      const removed = loupeRemovals(data.choices ?? [], answerId);
      if (!removed) throw new PuzzleError(409, 'There is nothing for the loupe to remove.');
      const next = { ...applied, removedChoices: removed };
      await client.query('UPDATE puzzle_runs SET expedition_state=$2::jsonb WHERE id=$1', [run.id, JSON.stringify(next)]);
      return { run: publicRun({ ...run, expedition_state: next }),
        question: publicExpeditionQuestion(current, run.choice_secret, next), provisions: expeditionProvisions(next) };
    }
    const hint = dictionaryHint(current);
    if (!hint) throw new PuzzleError(409, 'No hint is available for this encounter.');
    await client.query('UPDATE puzzle_runs SET expedition_state=$2::jsonb WHERE id=$1', [run.id, JSON.stringify(applied)]);
    return { run: publicRun({ ...run, expedition_state: applied }),
      question: publicExpeditionQuestion(current, run.choice_secret, applied),
      provisions: expeditionProvisions(applied), hint };
  });
}

export async function endExpedition(userId, runId) {
  return inTransaction(async (client) => {
    const run = await lockedRun(client, userId, runId, 'french_expedition');
    if (run.status !== 'active') return { run: publicRun(run), question: null };
    const result = await client.query("UPDATE puzzle_runs SET status='abandoned',end_reason='left',ended_at=NOW(),current_item_id=NULL,current_item_revision=NULL WHERE id=$1 RETURNING *", [run.id]);
    return { run: publicRun(result.rows[0]), question: null };
  });
}
