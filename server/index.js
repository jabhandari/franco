import { createStoryService } from './stories.js';
import { curriculumConcepts } from './curriculum-contract.js';
import { createHash, pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { reviewCurriculum } from './curriculum-editorial.js';
import { createServer } from 'node:http';
import { query, pool, migrate, createProfileForUser } from './database.js';
import { CONTENT_SCHEMA_VERSION, normalizeItem, schemaDocument, validateBatch } from './content-contract.js';
import { sm2Update, masteryDelta } from './sm2.js';
import { localDateString, normalizeTimeZone, shiftDate, summarizeActivity } from './streak.js';
import { evaluate, gradeExamQuestion, gradeExerciseItem, normalizeText } from './evaluate.js';
import { SpeechError, speechConfig, audioMime, readAudio, audioDuration, transcribeSpeech, validateSpeakingCompletion } from './speech.js';
import { conversationScenario } from './conversation.js';
import { contentFeedback, ContentFeedbackError } from './content-feedback.js';

import { googleConfig,beginGoogle,consumeGoogleState,googleStateCookie,stateCookie,googleIdentity,googleReturn,googleAccount,issueAuthCode,consumeAuthCode } from './google-auth.js';

import { translateText, TranslationError } from './translation.js';
import { getSpeakingLesson } from '../shared/speaking-lessons.js';
import { getPort, getHost, corsOrigin, getEnforceEmailVerification } from './config.js';
import { displayName, isNonEmptyName } from './user-names.js';
import { getLearnerProgress } from './learner-progress.js';
import { getLessonPosition,saveLessonPosition } from './lesson-positions.js';
import { PuzzleError, puzzleSummary, startPuzzle, getPuzzle, answerPuzzle, endPuzzle, startVerbSprint, getVerbSprint, answerVerbSprint, endVerbSprint } from './puzzles.js';
import { RaceError, createRoom, getRoom, joinRoom, configureRoom, startRoom, answerRoom, finishRoom, pruneRaceRooms } from './races.js';
import { allowAuthEmail, authClientIp, genericEmailResponse, hashEmailToken, sendAuthEmail, validEmailToken } from './auth-email.js';
import { emailConfigured } from './email.js';

const PORT = getPort(); const HOST = getHost(); const hashToken = (v) => createHash('sha256').update(v).digest('hex');
const json = (res, status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-headers': 'content-type, authorization, x-race-player-token', 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS', 'access-control-expose-headers': 'retry-after', ...headers }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((resolve, reject) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}) } catch (e) { reject(e) } }); });
const password = (p, s = randomBytes(16).toString('hex')) => ({ salt: s, hash: pbkdf2Sync(p, s, 120000, 64, 'sha512').toString('hex') });
async function user(req) { const h = req.headers.authorization || ''; if (!h.startsWith('Bearer ')) return null; const r = await query('SELECT u.id,u.email,u.name,u.first_name,u.last_name,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?', [hashToken(h.slice(7))]); return r[0] && new Date(r[0].expires_at) > new Date() ? r[0] : null; }
// Public user payload shape shared by signup/login, /api/me, and /api/me/profile (FRA-56).
const userPayload = (row) => ({ id: row.id, email: row.email, name: row.name, first_name: row.first_name ?? null, last_name: row.last_name ?? null });
async function source(id) { const r = await query('SELECT name,url,license,attribution,imported_at FROM content_sources WHERE id=?', [id]); return r[0] || null; }
// DEPRECATED (legacy track): served the UD-generated example_sentences /
// exercise_items content. New UI reads the canonical content_items track via
// /api/content/v1/items and /api/me/session-plan. Kept working for old clients.
async function sections() { return { source: await source('ud-fr-gsd'), sections: await query('SELECT cefr_section AS section,COUNT(*) AS example_count,(SELECT COUNT(*) FROM exercise_items e WHERE e.cefr_section=example_sentences.cefr_section) AS exercise_count,ROUND(AVG(token_count),1) AS average_tokens FROM example_sentences GROUP BY cefr_section ORDER BY cefr_section'), note: 'CEFR sections are local difficulty heuristics.' }; }
// DEPRECATED (legacy track): see sections(). When a limit is used (session
// plans), ordering is deterministic by difficulty instead of ORDER BY RANDOM()
// so queues are reproducible and review scheduling stays meaningful.
async function section(s, exerciseLimit = null) { s = s.toUpperCase(); const examples = await query('SELECT * FROM example_sentences WHERE cefr_section=? ORDER BY difficulty_score,token_count,text', [s]); const exerciseSql = exerciseLimit ? `SELECT e.*,x.text AS source_text FROM exercise_items e JOIN example_sentences x ON x.id=e.example_id WHERE e.cefr_section=? ORDER BY x.difficulty_score,e.id LIMIT ${Math.max(1, Math.min(50, Number(exerciseLimit)))}` : 'SELECT e.*,x.text AS source_text FROM exercise_items e JOIN example_sentences x ON x.id=e.example_id WHERE e.cefr_section=? ORDER BY x.difficulty_score,e.exercise_type'; const exercises = await query(exerciseSql, [s]); return { section: s, examples, exercises: exercises.map(x => ({ ...x, choices: x.choices_json, choices_json: undefined })) }; }
const apiKey = async (req, scope) => { const supplied = req.headers['x-api-key']; if (!supplied) return false; const hash = createHash('sha256').update(supplied).digest('hex'); const rows = await query('SELECT scopes FROM content_api_keys WHERE key_hash=? AND revoked_at IS NULL', [hash]); return Boolean(rows[0]?.scopes?.includes(scope)); };
// Explicit scope routing for the content API (no substring matching).
// Returns the required scope, or null when the route is public.
function contentApiScope(method, pathname) {
  if (method === 'POST' && pathname === '/api/content/v1/batches') return 'content:write';
  if (method === 'POST' && /^\/api\/content\/v1\/items\/[^/]+\/(approve|reject|publish)$/.test(pathname)) return 'content:review';
  if (method === 'GET' && /^\/api\/content\/v1\/batches(\/|$)/.test(pathname)) return 'content:write';
  return null; // public: schema, published items, item detail, concepts
}
const canonical = (item) => JSON.stringify({ type: item.type, prompt: item.prompt, context: item.context || '', response: item.response, evaluation: item.evaluation });
const similarity = (a, b) => { const words = (s) => new Set(String(s).toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean)); const x = words(a), y = words(b); if (!x.size || !y.size) return 0; const intersection = [...x].filter(v => y.has(v)).length; return intersection / (x.size + y.size - intersection); };

// Normalize exam choices to [{key, text}] regardless of stored shape.
function normalizeChoices(raw) {
  let choices = raw;
  if (typeof choices === 'string') { try { choices = JSON.parse(choices); } catch { return []; } }
  if (Array.isArray(choices)) return choices.map((c) => ({ key: String(c.key ?? c.id ?? ''), text: String(c.text ?? '') })).filter((c) => c.text);
  if (choices && typeof choices === 'object') return Object.entries(choices).map(([key, text]) => ({ key: String(key), text: String(text) }));
  return [];
}

// ---- Adaptive session plan ------------------------------------------------
// Queue order: due SM-2 reviews -> new items at the learner's level ->
// weak-concept items -> exam practice -> extra legacy drills.
const USABLE_STATUSES = `('published')`;
// Learner reports needed from distinct users before an item is auto-demoted
// back to pending_review for human re-review.
const REPORT_THRESHOLD = 3;
const REPORT_REASONS = new Set(['wrong_answer', 'unclear_prompt', 'typo', 'offensive', 'other']);
const STATUS_ORDER = `CASE i.status WHEN 'published' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END`;

async function sessionContentItems(where, params, orderBy, limit) {
  const items = await query(
    `SELECT i.id, i.external_id, i.item_type, i.cefr_level, i.difficulty_score, i.status, i.created_at,
            r.title, r.prompt, r.instructions, r.context, r.response_json, r.evaluation_json, r.metadata_json
     FROM content_items i
     JOIN content_revisions r ON r.item_id = i.id AND r.revision = i.current_revision
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT ${limit}`,
    params
  );
  const mediaByItem = {};
  if (items.length) {
    const media = await query('SELECT item_id, kind, url, duration_seconds, transcript FROM media_assets WHERE item_id = ANY(?)', [items.map((i) => i.id)]);
    for (const m of media) { (mediaByItem[m.item_id] = mediaByItem[m.item_id] || []).push({ kind: m.kind, url: m.url, duration_seconds: m.duration_seconds, transcript: m.transcript }); }
  }
  return { items, mediaByItem };
}

function shapeContentItem(row, queueKind, mediaByItem) {
  const ev = row.evaluation_json || {};
  const resp = row.response_json || {};
  const entry = {
    external_id: row.external_id, queue_kind: queueKind, item_kind: 'content_item', id: row.id,
    level: row.cefr_level, type: row.item_type,
    title: row.title, prompt: row.prompt, instructions: row.instructions, context: row.context,
    media: mediaByItem[row.id] || [],
    evaluation_mode: ev.mode || null,
  };
  if (row.item_type === 'multiple_choice' && Array.isArray(resp.choices)) entry.choices = resp.choices;
  if (row.item_type === 'word_order' && Array.isArray(resp.tokens)) entry.tokens = resp.tokens;
  if (ev.rubric) entry.rubric = ev.rubric;
  if (ev.expected_points) entry.expected_points = ev.expected_points;
  if (ev.follow_up_questions) entry.follow_up_questions = ev.follow_up_questions;
  if (resp.expected !== undefined) entry.expected = resp.expected;
  else if (ev.expected !== undefined) entry.expected = ev.expected;
  else if (typeof resp.answer === 'string') entry.expected = resp.answer;
  else if (typeof ev.answer === 'string') entry.expected = ev.answer;
  if (row.item_type === 'free_text' && typeof resp.example === 'string') entry.example = resp.example;
  return entry;
}

async function attachDrillChoices(drills, level) {
  const needy = drills.filter((d) => !d.choices_json && (d.exercise_type === 'reading' || d.exercise_type === 'grammar_focus'));
  if (!needy.length) return;
  const pool = {};
  for (const t of [...new Set(needy.map((d) => d.exercise_type))]) {
    pool[t] = (await query('SELECT answer FROM exercise_items WHERE exercise_type=? AND cefr_section=? LIMIT 200', [t, level])).map((r) => r.answer);
  }
  for (const d of needy) {
    const distractors = [...new Set((pool[d.exercise_type] || []).filter((a) => a && normalizeText(a) !== normalizeText(d.answer)))].slice(0, 3);
    d.choices = [{ key: 'A', text: d.answer }, ...distractors.map((text, i) => ({ key: String.fromCharCode(66 + i), text }))];
  }
}

async function buildSessionPlan(userId, level) {
  const queue = [];
  // 1. Due SM-2 reviews.
  const mediaByItem = {};
  const reviewRows = await query(
    `SELECT i.id, i.external_id, i.item_type, i.cefr_level, i.difficulty_score, i.status, i.created_at,
            r.title, r.prompt, r.instructions, r.context, r.response_json, r.evaluation_json, r.metadata_json, s.due_at
     FROM learner_item_state s
     JOIN content_items i ON i.id = s.item_id
     JOIN content_revisions r ON r.item_id = i.id AND r.revision = i.current_revision
     WHERE s.user_id = ? AND s.due_at <= NOW() AND i.status IN ${USABLE_STATUSES}
     ORDER BY s.due_at LIMIT 10`,
    [userId]
  );
  if (reviewRows.length) {
    const media = await query('SELECT item_id, kind, url, duration_seconds, transcript FROM media_assets WHERE item_id = ANY(?)', [reviewRows.map((i) => i.id)]);
    for (const m of media) { (mediaByItem[m.item_id] = mediaByItem[m.item_id] || []).push({ kind: m.kind, url: m.url, duration_seconds: m.duration_seconds, transcript: m.transcript }); }
  }
  for (const row of reviewRows) queue.push(shapeContentItem(row, 'review', mediaByItem));

  // 2. New items at the learner's level (never attempted).
  const fresh = await sessionContentItems(
    `i.cefr_level = ? AND i.status IN ${USABLE_STATUSES} AND NOT EXISTS (SELECT 1 FROM learning_attempts a WHERE a.user_id = ? AND a.item_id = i.id)`,
    [level, userId], `${STATUS_ORDER}, i.difficulty_score NULLS LAST, i.created_at`, 12
  );
  for (const row of fresh.items) queue.push(shapeContentItem(row, 'new', fresh.mediaByItem));

  // 3. Weak-concept items (mastery below 0.4).
  const weak = await query(
    `SELECT i.id, i.external_id, i.item_type, i.cefr_level, i.difficulty_score, i.status, i.created_at,
            r.title, r.prompt, r.instructions, r.context, r.response_json, r.evaluation_json, r.metadata_json, m.mastery
     FROM learner_concept_mastery m
     JOIN content_concepts cc ON cc.concept_id = m.concept_id
     JOIN content_items i ON i.id = cc.item_id
     JOIN content_revisions r ON r.item_id = i.id AND r.revision = i.current_revision
     WHERE m.user_id = ? AND m.mastery < 0.4 AND i.cefr_level = ? AND i.status IN ${USABLE_STATUSES}
       AND NOT EXISTS (SELECT 1 FROM learning_attempts a WHERE a.user_id = ? AND a.item_id = i.id)
     ORDER BY m.mastery ASC, ${STATUS_ORDER} LIMIT 6`,
    [userId, level, userId]
  );
  const weakMedia = {};
  if (weak.length) {
    const media = await query('SELECT item_id, kind, url, duration_seconds, transcript FROM media_assets WHERE item_id = ANY(?)', [weak.map((i) => i.id)]);
    for (const m of media) { (weakMedia[m.item_id] = weakMedia[m.item_id] || []).push({ kind: m.kind, url: m.url, duration_seconds: m.duration_seconds, transcript: m.transcript }); }
  }
  const seen = new Set(queue.map((q) => q.id));
  for (const row of weak) { if (!seen.has(row.id)) { seen.add(row.id); queue.push(shapeContentItem(row, 'weak', weakMedia)); } }

  // 4. Exam practice (authored QCMs at level, not yet attempted).
  const exam = await query(
    `SELECT id, exam_name, cefr_section, skill, prompt, context, choices_json
     FROM exam_questions
     WHERE cefr_section = ?
       AND NOT EXISTS (SELECT 1 FROM learning_attempts a WHERE a.user_id = ? AND a.item_kind = 'exam_question' AND a.legacy_ref = exam_questions.id)
     ORDER BY skill, external_id LIMIT 6`,
    [level, userId]
  );
  for (const q of exam) {
    queue.push({
      queue_kind: 'exam', item_kind: 'exam_question', id: q.id, level: q.cefr_section,
      type: 'multiple_choice', skill: q.skill, title: q.exam_name, prompt: q.prompt, context: q.context,
      choices: normalizeChoices(q.choices_json), media: [],
    });
  }

  // 5. Extra legacy drills (UD-generated; deprecated track, kept for practice volume).
  const drills = await query(
    `SELECT id, exercise_type, cefr_section, prompt, answer, choices_json
     FROM exercise_items
     WHERE cefr_section = ?
       AND NOT EXISTS (SELECT 1 FROM learning_attempts a WHERE a.user_id = ? AND a.item_kind = 'exercise' AND a.legacy_ref = exercise_items.id)
     ORDER BY exercise_type, created_at LIMIT 6`,
    [level, userId]
  );
  await attachDrillChoices(drills, level);
  for (const d of drills) {
    const entry = {
      queue_kind: 'drill', item_kind: 'exercise', id: d.id, level: d.cefr_section,
      type: d.exercise_type, prompt: d.prompt, media: [],
    };
    if (d.exercise_type === 'word_order') {
      try { entry.tokens = JSON.parse(d.choices_json); } catch { entry.tokens = []; }
    } else {
      entry.choices = d.choices || normalizeChoices(d.choices_json);
    }
    queue.push(entry);
  }

  return {
    section: level,
    reviewsDue: Number((await query(`SELECT COUNT(*)::int AS count FROM learner_item_state s JOIN content_items i ON i.id=s.item_id WHERE s.user_id=? AND s.due_at<=NOW() AND i.status='published'`,[userId]))[0].count),
    queue,
    estimatedMinutes: Math.max(2, Math.round(queue.length * 1.2)),
    message: 'Adaptive queue: due reviews, then new items at your level, then weak concepts, exam practice, and drills.',
  };
}

async function ingestBatch(batch) {
  const checked = validateBatch(batch);
  if (!checked.valid) return { status: 422, body: { error: 'Content batch validation failed.', schema_version: CONTENT_SCHEMA_VERSION, errors: checked.errors } };
  const existing = (await query('SELECT id,status,item_count,validation_errors FROM content_batches WHERE idempotency_key=?', [batch.idempotency_key]))[0];
  if (existing) return { status: 200, body: { batch_id: existing.id, status: existing.status, item_count: existing.item_count, validation_errors: existing.validation_errors, idempotent_replay: true } };
  const requestedConcepts = [...new Set(batch.items.flatMap(item => item.concepts ?? []))];
  if (requestedConcepts.length) {
    const known = await query('SELECT slug FROM concepts WHERE slug=ANY(?)', [requestedConcepts]);
    const knownSlugs = new Set(known.map(row => row.slug)); const unknown = requestedConcepts.filter(slug => !knownSlugs.has(slug));
    if (unknown.length) return { status: 422, body: { error: 'Content references unknown concepts.', schema_version: CONTENT_SCHEMA_VERSION, errors: unknown.map(slug => ({ path: '$.items[].concepts', message: `Unknown concept slug: ${slug}` })), available_concepts: '/api/content/v1/concepts' } };
  }
  const source = batch.source;
  // Trusted batches (ingested with a content:review-scoped key) may skip the
  // review queue entirely. Untrusted batches always land in pending_review.
  const itemStatus = batch.auto_publish === true ? 'published' : 'pending_review';
  await query('INSERT INTO content_sources(id,name,url,license,attribution) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,url=EXCLUDED.url,license=EXCLUDED.license,attribution=EXCLUDED.attribution', [source.id, source.name, source.url, source.license, source.attribution]);
  const batchId = batch.batch_id; await query('INSERT INTO content_batches(id,source_id,idempotency_key,schema_version,item_count) VALUES(?,?,?,?,?)', [batchId, source.id, batch.idempotency_key, batch.schema_version, batch.items.length]);
  const created = []; const duplicates = [];
  for (const raw of batch.items) {
    const item = normalizeItem(raw); const itemId = createHash('sha256').update(`${source.id}:${item.external_id}`).digest('hex'); const hash = createHash('sha256').update(canonical(item)).digest('hex');
    const prior = (await query('SELECT id FROM content_items WHERE source_id=? AND exact_hash=?', [source.id, hash]))[0];
    if (prior) { duplicates.push({ external_id: item.external_id, item_id: prior.id, kind: 'exact' }); continue; }
    const near = await query('SELECT id,prompt FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE i.status <> ? AND i.item_type=? AND i.cefr_level=? LIMIT 200', ['rejected', item.type, item.cefr.level]);
    const candidate = near.map(row => ({ ...row, score: similarity(item.prompt, row.prompt) })).sort((a,b) => b.score-a.score)[0];
    await query('INSERT INTO content_items(id,source_id,external_id,item_type,cefr_level,cefr_method,cefr_confidence,difficulty_band,difficulty_score,exact_hash,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)', [itemId, source.id, item.external_id, item.type, item.cefr.level, item.cefr.method, item.cefr.confidence ?? null, item.difficulty?.band ?? null, item.difficulty?.score ?? null, hash, itemStatus]);
    await query('INSERT INTO content_revisions(item_id,revision,batch_id,title,prompt,instructions,context,response_json,evaluation_json,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?)', [itemId, 1, batchId, item.title ?? null, item.prompt, item.instructions ?? null, item.context ?? null, JSON.stringify(item.response), JSON.stringify(item.evaluation), JSON.stringify(item.metadata ?? {})]);
    if (itemStatus === 'published') await query('INSERT INTO content_reviews(id,item_id,action,reviewer,note) VALUES(?,?,?,?,?)', [randomUUID(), itemId, 'publish', 'auto-publish', 'Auto-published trusted batch']);
    for (const [index, slug] of (item.concepts ?? []).entries()) { const conceptId = (await query('SELECT id FROM concepts WHERE slug=?', [slug]))[0].id; await query('INSERT INTO content_concepts(item_id,concept_id,is_primary,weight) VALUES(?,?,?,?) ON CONFLICT(item_id,concept_id) DO UPDATE SET is_primary=EXCLUDED.is_primary,weight=EXCLUDED.weight', [itemId, conceptId, index === 0, index === 0 ? 1 : 0.5]); }
    for (const label of item.tags ?? []) { const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); const tagId = createHash('sha256').update(`tag:${slug}`).digest('hex'); await query('INSERT INTO tags(id,slug,label) VALUES(?,?,?) ON CONFLICT(slug) DO NOTHING', [tagId, slug, label]); await query('INSERT INTO content_tags(item_id,tag_id) VALUES(?,?) ON CONFLICT DO NOTHING', [itemId, tagId]); }
    for (const media of item.media ?? []) await query('INSERT INTO media_assets(id,item_id,kind,url,duration_seconds,transcript,checksum) VALUES(?,?,?,?,?,?,?)', [randomUUID(), itemId, media.kind, media.url, media.duration_seconds ?? null, media.transcript ?? null, media.checksum ?? null]);
    if (candidate && candidate.score >= 0.85) { const pair = [itemId, candidate.id].sort(); await query('INSERT INTO content_duplicates(id,item_id,candidate_item_id,similarity) VALUES(?,?,?,?) ON CONFLICT(item_id,candidate_item_id) DO NOTHING', [randomUUID(), pair[0], pair[1], candidate.score]); duplicates.push({ external_id: item.external_id, item_id: itemId, candidate_item_id: candidate.id, kind: 'near', similarity: candidate.score }); }
    created.push({ external_id: item.external_id, item_id: itemId, status: itemStatus });
  }
  await query('UPDATE content_batches SET status=?,completed_at=NOW() WHERE id=?', [itemStatus, batchId]);
  return { status: 202, body: { batch_id: batchId, schema_version: batch.schema_version, status: itemStatus, item_count: batch.items.length, created, duplicates } };
}
const storyService=createStoryService(pool);
async function main() {
    await migrate();
    const cleanExpiredRaces = () => { void pruneRaceRooms().catch((error) => console.error('Race cleanup failed:', error)); };
    cleanExpiredRaces();
    const raceCleanupTimer = setInterval(cleanExpiredRaces, 60 * 60 * 1000);
    raceCleanupTimer.unref();
    createServer(async (req, res) => {
        try {
            res.setHeader('access-control-allow-origin', corsOrigin(req.headers.origin));
            if (req.method === 'OPTIONS') return json(res, 204, {}); const u = new URL(req.url, `http://${req.headers.host}`);
            if (req.method === 'GET' && u.pathname === '/api/auth/google/status') return json(res,200,{available:Boolean(googleConfig())});
            if (req.method === 'GET' && u.pathname === '/api/auth/google') {
              const config=googleConfig();
              if(!config) return json(res,503,{error:'Google sign-in is not configured yet. Please use email and password.'});
              try {
                const returnState=u.searchParams.get('return_state');
                if(!returnState || !/^[a-f0-9]{64}$/.test(returnState)) return json(res,400,{error:'Start Google sign-in from the Franco login page.'});
                const login=beginGoogle(config,Date.now(),returnState);
                res.writeHead(302,{'location':login.url,'set-cookie':stateCookie(login.state,config.secure),'cache-control':'no-store'});return res.end();
              } catch {return json(res,503,{error:'Google sign-in is busy. Please try later.'});}
            }
            if (req.method === 'GET' && u.pathname === '/api/auth/google/callback') {
              const config=googleConfig();
              if(!config) return json(res,503,{error:'Google sign-in is not configured.'});
              const record=consumeGoogleState(u.searchParams.get('state'),googleStateCookie(req,config.secure));
              const headers={'set-cookie':stateCookie('',config.secure,true),'cache-control':'no-store','referrer-policy':'no-referrer'};
              const code=u.searchParams.get('code');
              if(!record || !code || u.searchParams.get('error')) {
                res.writeHead(302,{...headers,location:googleReturn(config,'google_cancelled',true,record?.returnState)});return res.end();
              }
              try {
                const identity=await googleIdentity(config,code,record);
                const row=await googleAccount(identity,{query,createProfileForUser,password});
                // Hand the SPA a single-use 60-second code, not the session:
                // bearer tokens never travel in URLs (history, logs).
                const authCode=await issueAuthCode(query,row.id);
                res.writeHead(302,{...headers,location:googleReturn(config,authCode,false,record.returnState)});return res.end();
              } catch(callbackError) {
                const code=callbackError && callbackError.code==='EMAIL_TAKEN' ? 'email_taken' : 'google_failed';
                res.writeHead(302,{...headers,location:googleReturn(config,code,true,record.returnState)});return res.end();
              }
            }
            if (req.method === 'POST' && u.pathname === '/api/auth/google/exchange') {
              const b = await body(req) || {};
              const userId = await consumeAuthCode(query,b.code);
              if (!userId) return json(res,400,{error:'Google sign-in could not be completed. Please try again.'});
              const token=randomBytes(32).toString('hex');
              await query("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,NOW()+INTERVAL '14 days')",[randomUUID(),userId,hashToken(token)]);
              return json(res,200,{token});
            }
            if (req.method === 'POST' && u.pathname === '/api/me/translate') {
              const viewer = await user(req);
              if (!viewer) return json(res,401,{error:'Authentication required.'});
              const input = await body(req);
              try {return json(res,200,await translateText({...input,userId:viewer.id}));}
              catch(error) {if(error instanceof TranslationError) return json(res,error.status,{error:error.message});throw error;}
            }
            if (req.method === 'POST' && u.pathname === '/api/me/content-feedback') {
              const viewer = await user(req);
              if (!viewer) return json(res, 401, { error: 'Authentication required.' });
              try { return json(res, 200, await contentFeedback({ userId: viewer.id, input: await body(req) })); }
              catch (error) {
                if (error instanceof ContentFeedbackError) return json(res, error.status, { code: error.code, error: error.message });
                throw error;
              }
            }
            if (u.pathname === '/api/content/v1/curriculum/review' && req.method === 'GET') {
              if (!(await apiKey(req,'content:review'))) return json(res,401,{error:'A content:review API key is required.'});
              return json(res,200,{lessons:await query('SELECT topic_id,review_status,version,pack_json FROM curriculum_lessons ORDER BY topic_id')});
            }
            const curriculumReview=u.pathname.match(/^\/api\/content\/v1\/curriculum\/([^/]+)\/review$/);
            if (curriculumReview && req.method === 'POST') {
              if (!(await apiKey(req,'content:review'))) return json(res,401,{error:'A content:review API key is required.'});
              const input=await body(req);
              const keyId=createHash('sha256').update(req.headers['x-api-key']).digest('hex');
              const result=await reviewCurriculum(pool,decodeURIComponent(curriculumReview[1]),input,keyId);
              return json(res,result.status,result.body);
            }
            const storyRoute=u.pathname.match(/^\/api\/me\/stories(?:\/(story-\d{2})(?:\/(answer|skip))?)?$/);
            if (storyRoute) {
              const viewer=await user(req);if(!viewer) return json(res,401,{error:'Authentication required.'});
              let result;
              if(req.method==='GET' && !storyRoute[1]) result=await storyService.list(viewer.id);
              else if(req.method==='GET' && !storyRoute[2]) result=await storyService.detail(viewer.id,storyRoute[1]);
              else if(req.method==='POST' && storyRoute[2]) result=await storyService.act(viewer.id,storyRoute[1],storyRoute[2],await body(req));
              else return json(res,405,{error:'Method not allowed.'});
              return json(res,result.status,result.body);
            }
            if (req.method === 'GET' && u.pathname === '/api/health') return json(res, 200, { ok: true, database: 'supabase-postgres' });
            if (req.method === 'GET' && u.pathname === '/api/speech/status') { const viewer = await user(req); if (!viewer) return json(res, 401, { error: 'Authentication required.' }); const config = speechConfig(); return json(res, 200, { available: config.enabled, max_seconds: config.maxSeconds }); }
            if (req.method === 'POST' && u.pathname === '/api/speech/conversation/transcribe') {
              const viewer = await user(req);
              if (!viewer) return json(res, 401, { code: 'speech_auth_required', error: 'Authentication required.' });
              const config = speechConfig();
              if (!config.enabled) return json(res, 503, { code: 'speech_unavailable', error: 'Transcription is not available right now.' });
              try {
                const { mime, extension } = audioMime(req.headers['content-type']);
                const audio = await readAudio(req, config.maxBytes);
                const duration = await audioDuration(audio, mime, 120);
                return json(res, 200, await transcribeSpeech({ userId: viewer.id, item: { id: null, response_json: {} }, audio, mime, extension, duration, config }));
              } catch (error) {
                if (!(error instanceof SpeechError)) throw error;
                const headers = error.retryAfter ? { 'retry-after': String(error.retryAfter) } : {};
                return json(res, error.status, { code: error.code, error: error.message }, headers);
              }
            }
            if (req.method === 'POST' && u.pathname === '/api/speech/transcribe') {
              const viewer = await user(req);
              if (!viewer) return json(res, 401, { code: 'speech_auth_required', error: 'Authentication required.' });
              const config = speechConfig();
              if (!config.enabled) return json(res, 503, { code: 'speech_unavailable', error: 'Transcription is not available right now. You can still mark this exercise complete.' });
              try {
                const itemId = u.searchParams.get('item_id');
                if (!itemId) throw new SpeechError(400, 'speech_item_required', 'A speaking exercise is required.');
                const item = (await query("SELECT i.id,i.external_id,i.item_type,r.response_json,r.evaluation_json FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE i.id=? AND i.status<>'rejected'", [itemId]))[0];
                if (!item || !['speaking_prompt','listen_repeat','free_text'].includes(item.item_type)) throw new SpeechError(400, 'speech_wrong_item', 'Choose a speaking exercise to transcribe.');
                const practiceId = u.searchParams.get('practice');
                if (practiceId && item.item_type !== 'speaking_prompt') throw new SpeechError(400, 'speech_invalid_practice', 'This exercise has no practice phrases.');
                const lesson = getSpeakingLesson(item.external_id);
                const practicePhrase = practiceId && lesson?.phrases.find((phrase) => phrase.id === practiceId);
                if (practiceId && !practicePhrase) throw new SpeechError(400, 'speech_invalid_practice', 'Choose a valid practice phrase for this exercise.');
                const { mime, extension } = audioMime(req.headers['content-type']);
                const audio = await readAudio(req, config.maxBytes);
                const duration = await audioDuration(audio, mime, config.maxSeconds);
                const repeatAudio = item.item_type === 'listen_repeat' ? (await query("SELECT transcript FROM media_assets WHERE item_id=? AND kind='audio' AND transcript IS NOT NULL LIMIT 1", [item.id]))[0] : null;
                return json(res, 200, await transcribeSpeech({ userId: viewer.id, item, audio, mime, extension, duration, config, expected: practicePhrase?.french ?? item.response_json?.expected ?? item.response_json?.answer ?? item.evaluation_json?.expected ?? item.evaluation_json?.answer ?? repeatAudio?.transcript }));
              } catch (error) {
                if (!(error instanceof SpeechError)) throw error;
                const headers = error.retryAfter ? { 'retry-after': String(error.retryAfter) } : {};
                return json(res, error.status, { code: error.code, error: error.message }, headers);
              }
            }
            if (req.method === 'GET' && u.pathname === '/api/content/v1/schema') return json(res, 200, await schemaDocument());
            if (u.pathname.startsWith('/api/content/v1/')) { const scope = u.pathname === '/api/content/v1/schema' ? null : contentApiScope(req.method, u.pathname); if (scope && !(await apiKey(req, scope))) return json(res, 401, { error: 'A scoped content API key is required.' }); }
            if (req.method === 'POST' && u.pathname === '/api/content/v1/batches') { const b = await body(req); if (b && b.auto_publish === true && !(await apiKey(req, 'content:review'))) return json(res, 403, { error: 'auto_publish requires the content:review scope.' }); const result = await ingestBatch(b); return json(res, result.status, result.body); }
            const itemMatch = u.pathname.match(/^\/api\/content\/v1\/items\/([^/]+)(?:\/(approve|reject|publish))?$/);
            if (req.method === 'GET' && itemMatch) { const rows = await query('SELECT i.*,r.revision,r.title,r.prompt,r.instructions,r.context,r.response_json,r.evaluation_json,r.metadata_json FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE i.id=?', [itemMatch[1]]); return rows[0] ? json(res, 200, rows[0]) : json(res, 404, { error: 'Content item not found.' }); }
            if (req.method === 'POST' && itemMatch?.[2]) { const action = itemMatch[2]; const status = action === 'approve' ? 'approved' : action === 'publish' ? 'published' : 'rejected'; const rows = await query('UPDATE content_items SET status=?,updated_at=NOW() WHERE id=? RETURNING id,status', [status, itemMatch[1]]); if (!rows[0]) return json(res, 404, { error: 'Content item not found.' }); await query('INSERT INTO content_reviews(id,item_id,action,reviewer,note) VALUES(?,?,?,?,?)', [randomUUID(), itemMatch[1], action, 'content-api-key', (await body(req)).note ?? null]); return json(res, 200, rows[0]); }
            const reportMatch = u.pathname.match(/^\/api\/content\/v1\/items\/([^/]+)\/report$/);
            if (req.method === 'POST' && reportMatch) {
              const viewer = await user(req);
              if (!viewer) return json(res, 401, { error: 'Authentication required.' });
              const payload = await body(req);
              const reason = REPORT_REASONS.has(payload?.reason) ? payload.reason : 'other';
              const note = typeof payload?.note === 'string' && payload.note.trim() ? payload.note.trim().slice(0, 500) : null;
              const item = (await query('SELECT id,status FROM content_items WHERE id=?', [reportMatch[1]]))[0];
              if (!item) return json(res, 404, { error: 'Content item not found.' });
              await query('INSERT INTO content_reports(id,item_id,user_id,reason,note) VALUES(?,?,?,?,?) ON CONFLICT(item_id,user_id) DO NOTHING', [randomUUID(), item.id, viewer.id, reason, note]);
              const [{ count }] = await query('SELECT COUNT(*)::int AS count FROM content_reports WHERE item_id=?', [item.id]);
              let demoted = false;
              if (count >= REPORT_THRESHOLD && item.status !== 'pending_review' && item.status !== 'rejected') {
                await query("UPDATE content_items SET status='pending_review',updated_at=NOW() WHERE id=?", [item.id]);
                await query('INSERT INTO content_reviews(id,item_id,action,reviewer,note) VALUES(?,?,?,?,?)', [randomUUID(), item.id, 'demote', 'learner-reports', `Auto-demoted after ${count} learner reports`]);
                demoted = true;
              }
              return json(res, 200, { reported: true, reports: count, demoted });
            }
            const batchMatch = u.pathname.match(/^\/api\/content\/v1\/batches\/([^/]+)$/);
            if (req.method === 'GET' && batchMatch) { const batch = (await query('SELECT * FROM content_batches WHERE id=?', [batchMatch[1]]))[0]; return batch ? json(res, 200, { ...batch, items: await query('SELECT i.id,i.external_id,i.item_type,i.status,i.cefr_level FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=1 WHERE r.batch_id=? ORDER BY i.created_at', [batch.id]) }) : json(res, 404, { error: 'Batch not found.' }); }
            if (req.method === 'GET' && u.pathname === '/api/content/v1/items') {
                const LIST_STATUSES = ['published', 'pending_review', 'approved', 'rejected'];
                const status = u.searchParams.get('status') || 'published';
                if (!LIST_STATUSES.includes(status)) return json(res, 400, { error: 'Unknown status filter.' });
                // Non-published listings are the review queue: they expose
                // unreviewed content, so they require a content:review key.
                if (status !== 'published' && !(await apiKey(req, 'content:review'))) return json(res, 401, { error: 'A scoped content API key is required.' });
                const params = []; const where = [];
                params.push(status); where.push(`i.status=$${params.length}`);
                if (u.searchParams.get('level')) { params.push(u.searchParams.get('level').toUpperCase()); where.push(`i.cefr_level=$${params.length}`); }
                if (u.searchParams.get('type')) { params.push(u.searchParams.get('type')); where.push(`i.item_type=$${params.length}`); }
                if (u.searchParams.get('types')) { params.push(u.searchParams.get('types').split(',').filter(Boolean)); where.push(`i.item_type=ANY($${params.length})`); }
                const limitText = u.searchParams.get('limit') || '25';
                const offsetText = u.searchParams.get('offset') || '0';
                if (!/^[1-9]\d*$/.test(limitText) || !Number.isSafeInteger(Number(limitText)) || !/^\d+$/.test(offsetText) || !Number.isSafeInteger(Number(offsetText))) return json(res, 400, { error: 'Limit must be positive and offset must be non-negative integers.' });
                const limit = Math.min(100, Number(limitText));
                const offset = Number(offsetText);
                const [{ total }] = await query(`SELECT COUNT(*)::int AS total FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE ${where.join(' AND ')}`, params);
                params.push(limit, offset);
                const rows = await query(`SELECT i.id,i.external_id,i.item_type,i.cefr_level,i.difficulty_score,i.status,i.created_at,i.source_id,s.name AS source_name,r.batch_id,r.title,r.prompt,r.instructions,r.context,r.response_json,r.evaluation_json,r.metadata_json,(SELECT COUNT(*)::int FROM content_reports cr WHERE cr.item_id=i.id) AS report_count FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision LEFT JOIN content_sources s ON s.id=i.source_id WHERE ${where.join(' AND ')} ORDER BY i.updated_at DESC,i.id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
                const mediaByItem = {};
                if (rows.length) { const media = await query('SELECT item_id,kind,url,duration_seconds,transcript FROM media_assets WHERE item_id=ANY(?)', [rows.map((r) => r.id)]); for (const m of media) { (mediaByItem[m.item_id] = mediaByItem[m.item_id] || []).push({ kind: m.kind, url: m.url, duration_seconds: m.duration_seconds, transcript: m.transcript }); } }
                return json(res, 200, { total, items: rows.map((r) => ({ ...shapeContentItem(r, null, mediaByItem), status: r.status, external_id: r.external_id, source: r.source_name || null, batch_id: r.batch_id || null, report_count: r.report_count || 0 })) });
            }
            if (req.method === 'GET' && u.pathname === '/api/content/v1/item-counts') {
                // FRA-47: real published-content counts per level and item type,
                // powering the Learn view's level cards and skill-tab badges.
                const levelParam = (u.searchParams.get('level') || '').toUpperCase();
                const params = [];
                const where = ["i.status='published'"];
                if (levelParam) { params.push(levelParam); where.push(`i.cefr_level=$${params.length}`); }
                const rows = await query(`SELECT i.cefr_level AS level, i.item_type AS type, COUNT(*) AS n FROM content_items i WHERE ${where.join(' AND ')} GROUP BY i.cefr_level, i.item_type`, params);
                if (levelParam) {
                    const byType = {};
                    for (const row of rows) byType[row.type] = Number(row.n);
                    return json(res, 200, { level: levelParam, total: rows.reduce((s, r) => s + Number(r.n), 0), byType });
                }
                const counts = {};
                for (const row of rows) {
                    const entry = (counts[row.level] = counts[row.level] || { total: 0, byType: {} });
                    const n = Number(row.n);
                    entry.byType[row.type] = n;
                    entry.total += n;
                }
                return json(res, 200, { counts });
            }
            if (req.method === 'GET' && u.pathname === '/api/content/v1/concepts') {
                const concepts = await curriculumConcepts(query, await query("SELECT id,slug,title,description,concept_type,level_code,parent_id,status,metadata_json,list_order FROM concepts WHERE status='active' ORDER BY level_code NULLS LAST, list_order NULLS LAST, title"));
                const prereqs = await query('SELECT concept_id,prerequisite_concept_id FROM concept_prerequisites');
                const slugById = new Map(concepts.map((c) => [c.id, c.slug]));
                return json(res, 200, { concepts: concepts.map((c) => ({ id: c.id, slug: c.slug, title: c.title, description: c.description, concept_type: c.concept_type, level_code: c.level_code, parent_id: c.parent_id, status: c.status, list_order:c.list_order, metadata: c.metadata_json || {}, prerequisites: prereqs.filter((p) => p.concept_id === c.id).map((p) => slugById.get(p.prerequisite_concept_id)).filter(Boolean) })) });
            }
            if (u.pathname === '/api/me/lesson-position' && ['GET','POST'].includes(req.method)) {
              const x=await user(req);
              if (!x) return json(res,401,{error:'Authentication required.'});
              if (req.method==='GET') return json(res,200,await getLessonPosition(query,x.id));
              const b=await body(req);
              const result=await saveLessonPosition(query,x.id,b?.concept_slug,b?.section);
              return json(res,result.status,result.error ? {error:result.error} : {saved:true});
            }
            if (req.method === 'GET' && u.pathname === '/api/me/progress') { const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' }); return json(res, 200, { items: await query('SELECT * FROM learner_item_state WHERE user_id=? ORDER BY due_at', [x.id]), concepts: await query('SELECT * FROM learner_concept_mastery WHERE user_id=? ORDER BY mastery', [x.id]), attempts: await query('SELECT * FROM learning_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 100', [x.id]) }); }
            if (req.method === 'GET' && u.pathname === '/api/me/streak') { const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' }); const timeZone = normalizeTimeZone(u.searchParams.get('tz')); const today = localDateString(new Date(), timeZone); const rows = await query('SELECT activity_date, attempts_count FROM learner_activity_days WHERE user_id=? ORDER BY activity_date', [x.id]); const summary = summarizeActivity(rows, today); const windowStart = shiftDate(today, -370); return json(res, 200, { currentStreak: summary.currentStreak, longestStreak: summary.longestStreak, studiedToday: summary.studiedToday, activeDays: summary.activeDays, totalAttempts: summary.totalAttempts, today, days: summary.days.filter((day) => day.date >= windowStart) }); }
            if (u.pathname === '/api/me/puzzles' || u.pathname === '/api/me/puzzles/runs' || u.pathname.startsWith('/api/me/puzzles/runs/') || u.pathname.startsWith('/api/me/puzzles/verb-sprint/runs')) {
              const x = await user(req);
              if (!x) return json(res, 401, { error: 'Authentication required.' });
              try {
                if (req.method === 'GET' && u.pathname === '/api/me/puzzles') return json(res, 200, await puzzleSummary(x.id));
                if (req.method === 'POST' && u.pathname === '/api/me/puzzles/verb-sprint/runs') return json(res, 201, await startVerbSprint(x.id));
                const sprintMatch = u.pathname.match(/^\/api\/me\/puzzles\/verb-sprint\/runs\/([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})(?:\/(answer|end))?$/);
                const sprintRunId = sprintMatch?.[1].toLowerCase();
                if (sprintMatch && req.method === 'GET' && !sprintMatch[2]) return json(res, 200, await getVerbSprint(x.id, sprintRunId));
                if (sprintMatch && req.method === 'POST' && sprintMatch[2] === 'answer') {
                  const submission = await body(req);
                  return json(res, 200, await answerVerbSprint(x.id, sprintRunId, submission.question_id, submission.response));
                }
                if (sprintMatch && req.method === 'POST' && sprintMatch[2] === 'end') return json(res, 200, await endVerbSprint(x.id, sprintRunId));
                if (req.method === 'POST' && u.pathname === '/api/me/puzzles/runs') {
                  const config = await body(req);
                  return json(res, 201, await startPuzzle(x.id, config.lives, config.minutes));
                }
                const match = u.pathname.match(/^\/api\/me\/puzzles\/runs\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/(answer|end))?$/);
                if (match && req.method === 'GET' && !match[2]) return json(res, 200, await getPuzzle(x.id, match[1]));
                if (match && req.method === 'POST' && match[2] === 'answer') {
                  const submission = await body(req);
                  return json(res, 200, await answerPuzzle(x.id, match[1], submission.question_id, submission.response));
                }
                if (match && req.method === 'POST' && match[2] === 'end') return json(res, 200, await endPuzzle(x.id, match[1]));
              } catch (error) {
                if (error instanceof PuzzleError) return json(res, error.status, { error: error.message });
                throw error;
              }
            }
            if (req.method === 'GET' && u.pathname === '/api/me/review-due') { const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' }); return json(res, 200, { items: await query("SELECT i.*,r.prompt,r.response_json,r.evaluation_json,s.due_at FROM learner_item_state s JOIN content_items i ON i.id=s.item_id JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE s.user_id=? AND i.status='published' AND s.due_at<=NOW() ORDER BY s.due_at LIMIT 50", [x.id]) }); }
            if (req.method === 'POST' && u.pathname === '/api/me/attempts') {
              const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' }); const b = await body(req); if (b.response === undefined) return json(res, 400, { error: 'response is required.' });
              const itemKind = b.item_kind || 'content_item';
              let target = null; let legacyRow = null;
              if (itemKind === 'content_item') {
                if (!b.item_id) return json(res, 400, { error: 'item_id is required for content items.' });
                target = (await query("SELECT i.*,r.revision,r.response_json,r.evaluation_json FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE i.id=? AND i.status='published'", [b.item_id]))[0];
                if (!target) return json(res, 404, { error: 'Content item not found.' });
              } else if (itemKind === 'exam_question' || itemKind === 'exercise') {
                if (!b.legacy_ref) return json(res, 400, { error: 'legacy_ref is required for legacy items.' });
                legacyRow = (await query(`SELECT * FROM ${itemKind === 'exam_question' ? 'exam_questions' : 'exercise_items'} WHERE id=?`, [b.legacy_ref]))[0];
                if (!legacyRow) return json(res, 404, { error: 'Legacy item not found.' });
              } else return json(res, 400, { error: 'Unknown item_kind.' });
              if (target?.item_type === 'speaking_prompt' || (target?.item_type === 'listen_repeat' && typeof b.response === 'object' && b.response !== null && (b.response.transcription_id || b.response.completed === true))) {
                try { b.response = await validateSpeakingCompletion(b.response, x.id, target.id); }
                catch (error) {
                  if (!(error instanceof SpeechError)) throw error;
                  return json(res, error.status, { code: error.code, error: error.message });
                }
              }
              if (target?.item_type === 'free_text' && b.response?.modality === 'spoken') {
                try { await validateSpeakingCompletion({ completed: true, transcript: b.response.text, transcription_id: b.response.transcription_id }, x.id, target.id); }
                catch (error) {
                  if (!(error instanceof SpeechError)) throw error;
                  return json(res, error.status, { code: error.code, error: error.message });
                }
              }
              let correct; let score;
              if (target) {
                const spokenRepeat = target.item_type === 'listen_repeat' && typeof b.response === 'object' && b.response !== null && (b.response.transcription_id || b.response.completed === true);
                const freeTextResponse = target.item_type === 'free_text' && typeof b.response === 'object' && b.response !== null && !Array.isArray(b.response) ? b.response : null;
                if (target.item_type === 'free_text' && (!freeTextResponse || !['typed','spoken'].includes(freeTextResponse.modality) || typeof freeTextResponse.text !== 'string' || !freeTextResponse.text.trim() || freeTextResponse.text.length > 6000)) return json(res,400,{error:'Enter a valid freeform response.'});
                correct = (target.item_type === 'speaking_prompt' || spokenRepeat || freeTextResponse) ? true : evaluate(target, target.item_type === 'listen_repeat' && typeof b.response === 'object' && b.response !== null ? b.response.typed_text : b.response);
                if (!correct && target.item_type === 'listen_repeat') {
                  // Transcript-backed drills carry no expected/answer reference, so
                  // evaluate() rejects every response. Grade against the audio
                  // transcript instead — the same source the client reveals as the
                  // word and submits on a "Got it" self-mark.
                  const audioRow = (await query('SELECT transcript FROM media_assets WHERE item_id=? AND kind=? AND transcript IS NOT NULL LIMIT 1', [target.id, 'audio']))[0];
                  if (audioRow) correct = normalizeText(b.response?.typed_text ?? b.response) === normalizeText(audioRow.transcript);
                }
                const selfAssessed = !target.evaluation_json?.mode && (target.evaluation_json?.rubric || target.evaluation_json?.expected_points);
                score = (target.item_type === 'speaking_prompt' || spokenRepeat || freeTextResponse || target.evaluation_json?.mode === 'rubric' || selfAssessed) ? null : (correct ? 1 : 0);
              } else if (itemKind === 'exam_question') { correct = gradeExamQuestion(legacyRow, b.response); score = correct ? 1 : 0; }
              else { correct = gradeExerciseItem(legacyRow, b.response); score = correct ? 1 : 0; }
              const attemptNumber = Number((await query('SELECT COUNT(*)::int AS count FROM learning_attempts WHERE user_id=? AND item_kind=? AND COALESCE(legacy_ref, item_id)=?', [x.id, itemKind, target?.id ?? legacyRow.id]))[0].count) + 1;
              const skillId = target?.item_type === 'free_text' ? (b.response.modality === 'spoken' ? 'parler' : 'ecrire') : null;
              const attempt = (await query('INSERT INTO learning_attempts(id,user_id,item_id,item_kind,legacy_ref,item_type,skill_id,revision,response_json,evaluation_json,score,duration_ms,correct,attempt_number,session_id,hint_used) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *', [randomUUID(), x.id, target?.id ?? null, itemKind, legacyRow?.id ?? null, target?.item_type ?? null, skillId, target?.revision ?? 1, JSON.stringify(b.response), JSON.stringify({ correct, evaluator: target?.evaluation_json?.mode ?? itemKind }), score, b.duration_ms ?? null, correct, attemptNumber, b.session_id ?? null, Boolean(b.hint_used)]))[0];
              // FRA-44: roll the attempt into the learner's activity day.
              // The client sends its IANA timezone; the day boundary is the
              // learner-local calendar date of the attempt.
              const activityDate = localDateString(attempt.created_at, b.timezone);
              await query('INSERT INTO learner_activity_days(user_id,activity_date,attempts_count,first_activity_at,last_activity_at) VALUES(?,?,1,?,?) ON CONFLICT(user_id,activity_date) DO UPDATE SET attempts_count=learner_activity_days.attempts_count+1,first_activity_at=LEAST(learner_activity_days.first_activity_at,EXCLUDED.first_activity_at),last_activity_at=GREATEST(learner_activity_days.last_activity_at,EXCLUDED.last_activity_at)', [x.id, activityDate, attempt.created_at, attempt.created_at]);
              let nextDueAt = null;
              if (target) {
                const old = (await query('SELECT * FROM learner_item_state WHERE user_id=? AND item_id=?', [x.id, target.id]))[0];
                const sm2 = sm2Update(old, correct);
                const due = correct ? `NOW() + (${sm2.interval_days}) * INTERVAL '1 day'` : 'NOW()';
                await query(`INSERT INTO learner_item_state(user_id,item_id,due_at,interval_days,ease,repetitions,lapses,last_result,last_attempt_at) VALUES(?,?,${due},?,?,?,?,?,NOW()) ON CONFLICT(user_id,item_id) DO UPDATE SET due_at=EXCLUDED.due_at,interval_days=EXCLUDED.interval_days,ease=GREATEST(1.3,learner_item_state.ease + CASE WHEN EXCLUDED.last_result='correct' THEN 0.05 ELSE -0.2 END),repetitions=learner_item_state.repetitions + CASE WHEN EXCLUDED.last_result='correct' THEN 1 ELSE 0 END,lapses=learner_item_state.lapses + CASE WHEN EXCLUDED.last_result='incorrect' THEN 1 ELSE 0 END,last_result=EXCLUDED.last_result,last_attempt_at=NOW()`, [x.id, target.id, sm2.interval_days, sm2.ease, (old?.repetitions || 0) + (correct ? 1 : 0), old?.lapses || 0, correct ? 'correct' : 'incorrect']);
                const concepts = await query('SELECT concept_id FROM content_concepts WHERE item_id=?', [target.id]);
                const delta = masteryDelta(correct);
                for (const concept of concepts) await query("INSERT INTO learner_concept_mastery(user_id,concept_id,mastery,confidence,evidence_count,total_attempts,correct_attempts,consecutive_correct,consecutive_incorrect,last_practiced_at,last_correct_at,last_incorrect_at) VALUES(?,?,?,?,?,1,?,?,?,NOW(),CASE WHEN ? THEN NOW() ELSE NULL END,CASE WHEN ? THEN NULL ELSE NOW() END) ON CONFLICT(user_id,concept_id) DO UPDATE SET mastery=GREATEST(0,LEAST(1,learner_concept_mastery.mastery + ?)),confidence=LEAST(1,learner_concept_mastery.confidence+0.05),evidence_count=learner_concept_mastery.evidence_count+1,total_attempts=learner_concept_mastery.total_attempts+1,correct_attempts=learner_concept_mastery.correct_attempts+CASE WHEN ? THEN 1 ELSE 0 END,consecutive_correct=CASE WHEN ? THEN learner_concept_mastery.consecutive_correct+1 ELSE 0 END,consecutive_incorrect=CASE WHEN ? THEN 0 ELSE learner_concept_mastery.consecutive_incorrect+1 END,last_practiced_at=NOW(),last_correct_at=CASE WHEN ? THEN NOW() ELSE learner_concept_mastery.last_correct_at END,last_incorrect_at=CASE WHEN ? THEN learner_concept_mastery.last_incorrect_at ELSE NOW() END,updated_at=NOW()", [x.id, concept.concept_id, correct ? 0.08 : 0, correct ? 0.1 : 0, 1, correct ? 1 : 0, correct ? 1 : 0, correct ? 0 : 1, correct, correct, delta, correct, correct, correct, correct, correct]);
                nextDueAt = (await query('SELECT due_at FROM learner_item_state WHERE user_id=? AND item_id=?', [x.id, target.id]))[0]?.due_at ?? null;
              }
              // Reveal the expected answer only AFTER grading — never sent upfront.
              let reveal = null;
              if (target) {
                const rj = target.response_json || {};
                const ej = target.evaluation_json || {};
                reveal = rj.answer ?? rj.expected ?? ej.answer ?? ej.expected ?? (Array.isArray(rj.tokens) ? rj.tokens.join(' ') : null);
                // FRA-7: for multiple-choice, reveal the correct choice's text
                // (the right sentence), not just its key.
                if (target.item_type === 'multiple_choice' && Array.isArray(rj.choices)) {
                  const correctChoice = rj.choices.find((c) => String(c.id) === String(reveal));
                  if (correctChoice && correctChoice.text) reveal = correctChoice.text;
                }
              } else if (legacyRow) {
                reveal = legacyRow.answer ?? null;
              }
              return json(res, 201, { attempt, correct, score, reveal, next_due_at: nextDueAt });
            }
            if (req.method === 'POST' && u.pathname === '/api/me/placement') {
              const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' });
              const b = await body(req); const level = String(b.level || '').toUpperCase();
              if (!['A1','A2','B1','B2','C1','C2'].includes(level)) return json(res, 400, { error: 'level must be a CEFR code.' });
              await query("UPDATE learner_profiles SET current_level=?,placement_status='complete',updated_at=NOW() WHERE user_id=?", [level, x.id]);
              return json(res, 200, { level, placement_status: 'complete' });
            }
            if (req.method === 'POST' && u.pathname === '/api/auth/signup') {
              const b = await body(req) || {}, email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
              if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof b.password !== 'string' || b.password.length < 8) return json(res,400,{error:'Email and an 8 character password are required.'});
              const firstName = String(b.first_name ?? '').trim(), lastName = String(b.last_name ?? '').trim();
              if (!isNonEmptyName(firstName) || !isNonEmptyName(lastName)) return json(res,400,{error:'First name and last name are required.'});
              const existing = (await query('SELECT google_sub FROM users WHERE email=?',[email]))[0];
              if (existing) {
                // FRA-57: point Google-linked accounts at the Google button —
                // this is the "which method did I use?" moment. Login stays a
                // uniform 401 by design (no method oracle there).
                return json(res,409,{error: existing.google_sub ? 'An account already exists for this email. Try "Continue with Google" instead.' : 'An account already exists for this email.'});
              }
              if (!emailConfigured()) return json(res,503,{code:'email_unavailable',error:'Email delivery is not configured on this server. Please try again later.'});
              if (!await allowAuthEmail('signup',email,authClientIp(req),5)) return json(res,429,{error:'Too many signup attempts. Please try again later.'});
              const id = randomUUID(), p = password(b.password), name = displayName(firstName,lastName);
              await query('INSERT INTO users(id,email,name,first_name,last_name,password_hash,password_salt,email_verified) VALUES(?,?,?,?,?,?,?,FALSE)',[id,email,name,firstName,lastName,p.hash,p.salt]);
              await createProfileForUser(id);
              try { await sendAuthEmail(id,email,'verify',req.headers.origin); }
              catch (error) {
                console.error('Signup verification email failed:',error);
                // The verification email is best-effort while verification is
                // not enforced (no production sending domain yet): the account
                // is usable immediately, so a failed send must not fail signup.
                if (getEnforceEmailVerification()) return json(res,503,{code:'verification_email_failed',error:'Account created, but verification email could not be sent. Please request a new link.'});
              }
              return json(res,201,{message:getEnforceEmailVerification() ? 'Check your email for a verification link.' : 'Account created.'});
            }
            if (req.method === 'POST' && u.pathname === '/api/auth/login') {
              const b = await body(req) || {}, email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
              const row = (await query('SELECT * FROM users WHERE email=?',[email]))[0];
              if (!row || password(typeof b.password === 'string' ? b.password : '',row.password_salt).hash !== row.password_hash) return json(res,401,{error:'Invalid email or password.'});
              if (getEnforceEmailVerification() && !row.email_verified) return json(res,403,{code:'email_not_verified',error:'Please verify your email before logging in. You can request a new verification link.'});
              const token = randomBytes(32).toString('hex');
              await query("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,NOW()+INTERVAL '14 days')",[randomUUID(),row.id,hashToken(token)]);
              return json(res,200,{token,user:userPayload(row),profile:null,progress:[],mistakes:[],attempts:[]});
            }
            if (req.method === 'POST' && u.pathname === '/api/auth/verify-email') {
              const b = await body(req) || {};
              if (!validEmailToken(b.token)) return json(res,400,{error:'This verification link is invalid or expired.'});
              const rows = await query("WITH consumed AS (UPDATE email_tokens SET used_at=NOW() WHERE token_hash=? AND type='verify' AND used_at IS NULL AND expires_at>NOW() RETURNING user_id) UPDATE users SET email_verified=TRUE WHERE id IN (SELECT user_id FROM consumed) RETURNING id",[hashEmailToken(b.token)]);
              if (!rows.length) return json(res,400,{error:'This verification link is invalid or expired.'});
              return json(res,200,{message:'Email verified. You can now log in.'});
            }
            if (req.method === 'POST' && (u.pathname === '/api/auth/resend-verification' || u.pathname === '/api/auth/forgot-password')) {
              const b = await body(req) || {}, email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
              if (!email || email.length > 254) return json(res,200,genericEmailResponse);
              if (!emailConfigured()) return json(res,503,{code:'email_unavailable',error:'Email delivery is not configured on this server. Please try again later.'});
              const type = u.pathname.endsWith('forgot-password') ? 'reset' : 'verify';
              const allowed = await allowAuthEmail(type,email,authClientIp(req),5);
              if (allowed) {
                const row = (await query('SELECT id,email_verified,google_sub FROM users WHERE email=?',[email]))[0];
                if (row && (type === 'reset' || !row.email_verified)) {
                  try { await sendAuthEmail(row.id,email,type,req.headers.origin,{googleLinked:Boolean(row.google_sub)}); }
                  catch (error) { console.error('Authentication email failed:',error); }
                }
              }
              return json(res,200,genericEmailResponse);
            }
            if (req.method === 'POST' && u.pathname === '/api/auth/reset-password') {
              const b = await body(req) || {};
              if (typeof b.password !== 'string' || b.password.length < 8) return json(res,400,{error:'Password must be at least 8 characters.'});
              if (!validEmailToken(b.token)) return json(res,400,{error:'This reset link is invalid or expired.'});
              const client = await pool.connect();
              try {
                await client.query('BEGIN');
                const { rows } = await client.query("UPDATE email_tokens SET used_at=NOW() WHERE token_hash=$1 AND type='reset' AND used_at IS NULL AND expires_at>NOW() RETURNING user_id",[hashEmailToken(b.token)]);
                if (!rows.length) { await client.query('ROLLBACK'); return json(res,400,{error:'This reset link is invalid or expired.'}); }
                const p = password(b.password);
                await client.query('UPDATE users SET password_hash=$1,password_salt=$2 WHERE id=$3',[p.hash,p.salt,rows[0].user_id]);
                await client.query("UPDATE email_tokens SET used_at=NOW() WHERE user_id=$1 AND type='reset' AND used_at IS NULL",[rows[0].user_id]);
                await client.query('DELETE FROM sessions WHERE user_id=$1',[rows[0].user_id]);
                await client.query('COMMIT');
                return json(res,200,{message:'Password updated. Log in with your new password.'});
              } catch (error) { await client.query('ROLLBACK'); throw error; }
              finally { client.release(); }
            }
            // FRA-56: update the signed-in user's first/last name. The display
            // name is derived ("First Last") so the sidebar never drifts.
            if (req.method === 'POST' && u.pathname === '/api/me/profile') { const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' }); const b = await body(req); const firstName = String(b.first_name ?? '').trim(), lastName = String(b.last_name ?? '').trim(); if (!isNonEmptyName(firstName) || !isNonEmptyName(lastName)) return json(res, 400, { error: 'First name and last name are required.' }); const name = displayName(firstName, lastName); await query('UPDATE users SET first_name=?,last_name=?,name=? WHERE id=?', [firstName, lastName, name, x.id]); return json(res, 200, { user: userPayload({ ...x, name, first_name: firstName, last_name: lastName }) }); }
            // DEPRECATED (legacy track): UD example/exercise browsing. See sections().
            if (req.method === 'GET' && u.pathname === '/api/content/sections') return json(res, 200, await sections());
            if (req.method === 'GET' && u.pathname.startsWith('/api/content/sections/')) return json(res, 200, await section(decodeURIComponent(u.pathname.split('/').pop())));
            if (req.method === 'GET' && u.pathname === '/api/content/topics') { const t = (u.searchParams.get('section') || 'A1').toUpperCase(); return json(res, 200, { section: t, topics: await query('SELECT * FROM learning_topics WHERE cefr_section=? ORDER BY category,title', [t]) }); }
            if (req.method === 'GET' && u.pathname === '/api/content/tv5-exercises') return json(res, 200, { section: u.searchParams.get('section') || 'all', exercises: await query('SELECT * FROM tv5_exercises WHERE ($1 IS NULL OR cefr_section=$1) ORDER BY cefr_section,title', [u.searchParams.get('section')?.toUpperCase() || null]) });
            if (req.method === 'GET' && u.pathname === '/api/exam/questions') return json(res, 200, { section: u.searchParams.get('section') || 'A1', questions: await query('SELECT *,choices_json AS choices FROM exam_questions WHERE cefr_section=? ORDER BY external_id', [u.searchParams.get('section')?.toUpperCase() || 'A1']), sources: [] });
            if (req.method === 'GET' && u.pathname === '/api/exam/past-questions') return json(res, 200, { questions: await query('SELECT *,choices_json AS choices FROM exam_questions ORDER BY cefr_section,external_id'), sources: [] });
            if (u.pathname === '/api/races' && req.method === 'POST') {
              const viewer = await user(req);
              if (!viewer) return json(res, 401, { error: 'Sign in to create a race.' });
              try {
                const payload = await body(req);
                return json(res, 201, await createRoom(viewer.id, payload.config ?? null, viewer.name));
              } catch (error) {
                if (error instanceof RaceError) return json(res, error.status, { error: error.message });
                throw error;
              }
            }
            const raceMatch = u.pathname.match(/^\/api\/races\/([A-Za-z0-9]{8})(?:\/(join|config|start|answer|finish))?$/);
            if (raceMatch) {
              const [, code, action] = raceMatch;
              const viewer = await user(req);
              const playerToken = typeof req.headers['x-race-player-token'] === 'string' ? req.headers['x-race-player-token'] : null;
              try {
                if (req.method === 'GET' && !action) return json(res, 200, await getRoom(code, viewer?.id ?? null, playerToken));
                if (req.method === 'POST' && action === 'join') {
                  const payload = await body(req);
                  return json(res, 200, await joinRoom(code, viewer?.id ?? null, payload.display_name ?? viewer?.name ?? null));
                }
                if (req.method === 'PATCH' && action === 'config') {
                  if (!viewer) return json(res, 401, { error: 'Host sign-in required.' });
                  const payload = await body(req);
                  return json(res, 200, await configureRoom(code, viewer.id, payload));
                }
                if (req.method === 'POST' && action === 'start') {
                  if (!viewer) return json(res, 401, { error: 'Host sign-in required.' });
                  return json(res, 200, await startRoom(code, viewer.id));
                }
                if (req.method === 'POST' && action === 'answer') {
                  const payload = await body(req);
                  return json(res, 200, await answerRoom(code, viewer?.id ?? null, playerToken, payload.question_id, payload.response, payload.timezone));
                }
                if (req.method === 'POST' && action === 'finish') return json(res, 200, await finishRoom(code, viewer?.id ?? null, playerToken));
              } catch (error) {
                if (error instanceof RaceError) return json(res, error.status, { error: error.message });
                throw error;
              }
            }
            if (req.method === 'GET' && u.pathname === '/api/me') {
              const x = await user(req);
              if (!x) return json(res, 401, { error: 'Authentication required.' });
              const [profiles,progress] = await Promise.all([
                query('SELECT * FROM learner_profiles WHERE user_id=?',[x.id]),
                getLearnerProgress(query,x.id),
              ]);
              return json(res, 200, { user:userPayload(x),profile:profiles[0] || null,...progress });
            }
            if (req.method === 'GET' && u.pathname === '/api/me/conversation-targets') {
              const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' });
              const profile = (await query('SELECT current_level FROM learner_profiles WHERE user_id=?', [x.id]))[0];
              const level = (u.searchParams.get('section') || profile?.current_level || 'A1').toUpperCase();
              const pick = Number(u.searchParams.get('pick') || 0);
              if (!Number.isSafeInteger(pick) || pick < 0) return json(res, 400, { error: 'Pick must be a non-negative integer.' });
              const weak = await query("SELECT c.id,c.slug,c.title,c.description,c.level_code,c.metadata_json,m.mastery FROM learner_concept_mastery m JOIN concepts c ON c.id=m.concept_id WHERE m.user_id=? AND m.evidence_count>0 AND c.status='active' ORDER BY m.mastery ASC,c.id LIMIT 8", [x.id]);
              const concepts = weak.length ? weak : await query("SELECT id,slug,title,description,level_code,metadata_json FROM concepts WHERE level_code=? AND status='active' ORDER BY list_order NULLS LAST,title,id LIMIT 8", [level]);
              return json(res, 200, conversationScenario(concepts,pick,weak.length > 0));
            }
            if (req.method === 'GET' && (u.pathname === '/api/me/session-plan' || /^\/api\/me\/session-plan\/(A1|A2|B1|B2|C1|C2)$/i.test(u.pathname))) { const x = await user(req); if (!x) return json(res, 401, { error: 'Authentication required.' }); const pathSection = u.pathname.match(/session-plan\/(A1|A2|B1|B2|C1|C2)$/i)?.[1]; const profile = (await query('SELECT current_level FROM learner_profiles WHERE user_id=?', [x.id]))[0]; const level = (pathSection || u.searchParams.get('section') || profile?.current_level || 'A1').toUpperCase(); return json(res, 200, await buildSessionPlan(x.id, level)); }
            return json(res, 404, { error: 'Not found.' });
        } catch (e) { console.error(e); return json(res, 500, { error: e.message }); }
    }).listen(PORT, HOST, () => console.log(`Franco API listening on http://${HOST}:${PORT}`));
}
main().catch(e => { console.error(e); process.exit(1) });
