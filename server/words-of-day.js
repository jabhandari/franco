// FRA-154/155: Words of the Day — daily selection, questions, Home payload.
//
// The word bank lives in the `vocab_words` table, seeded by
// scripts/seed-words.mjs from the launch vocabulary that FRA-153 merged in
// content/vocab/launch.mjs (620 words: A1 150 / A2 150 / B1 100 / B2 100 /
// C1 60 / C2 60, each with a gloss and a templated bilingual example).
// Per-learner state lives in daily_word_sets / user_word_history /
// word_practice_answers.
//
// STREAK ISOLATION (FRA-154 decision, Juhi 2026-10-16): answers are written
// ONLY to word_practice_answers. Nothing in this module reads or writes the
// streak/activity tables or the attempts store, so word practice can never
// light the streak — scripts/test-words-of-day.mjs guards this statically.
//
// Pure helpers (validateWordBank, selectDailyWords, buildQuestions,
// gradeAnswer) are exported for unit tests; the service wraps them with the
// database, following the createStoryService(pool) pattern in stories.js.
import { randomInt, randomUUID } from 'node:crypto';
import { batches } from '../content/vocab/launch.mjs';
import { localDateString, normalizeTimeZone, shiftDate } from './streak.js';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const DAILY_WORD_COUNT = 5;
export const QUESTIONS_PER_WORD = 2;
// Content words only — function words (articles, pronouns, prepositions)
// are lesson content, never words of the day (FRA-153 audit, 2026-10-16).
export const WORD_PARTS_OF_SPEECH = ['noun', 'verb', 'adjective', 'adverb'];
const QUESTION_TYPES = ['meaning', 'word', 'blank'];

// ---------------------------------------------------------------------------
// Word bank
// ---------------------------------------------------------------------------

// The A2 batch template speaks "about" its word ({topic}): French needs
// de + le -> du and de + les -> des for the sentence to stay grammatical.
function topicPhrase(word) {
  if (word.startsWith('le ')) return `du ${word.slice(3)}`;
  if (word.startsWith('les ')) return `des ${word.slice(4)}`;
  return `de ${word}`;
}

// Flatten the FRA-153 launch batches into vocab_words-shaped rows. Every
// entry is a noun with its article (the article teaches gender, per the
// launch file's header); the batch template supplies the bilingual example.
export function launchBankRows() {
  const rows = [];
  for (const batch of batches) {
    const entries = batch.entries.split('\n').map((line) => line.trim()).filter(Boolean);
    entries.forEach((line, index) => {
      const [word, gloss] = line.split('|').map((part) => part.trim());
      rows.push({
        id: `w-${batch.level.toLowerCase()}-${String(index + 1).padStart(3, '0')}`,
        word, level: batch.level, gloss, part_of_speech: 'noun',
        example_fr: batch.fr.replace('{word}', word).replace('{topic}', topicPhrase(word)),
        example_en: batch.en.replace('{gloss}', gloss),
        source: 'launch-vocab',
      });
    });
  }
  return rows;
}

export async function loadSeedWordBank() {
  return launchBankRows();
}

// Returns a list of problems with a bank row set; empty list = valid bank.
// A word without a gloss or a bilingual example does not ship (FRA-153).
export function validateWordBank(rows) {
  const problems = [];
  if (!Array.isArray(rows)) return ['word bank is not an array'];
  const seen = new Set();
  for (const row of rows) {
    const id = row?.id || '(missing id)';
    if (!row?.id) problems.push(`${id}: missing id`);
    if (!row?.word) problems.push(`${id}: missing word`);
    if (!LEVELS.includes(row?.level)) problems.push(`${id}: bad level ${row?.level}`);
    if (!row?.gloss) problems.push(`${id}: missing gloss`);
    if (!WORD_PARTS_OF_SPEECH.includes(row?.part_of_speech)) problems.push(`${id}: part_of_speech ${row?.part_of_speech} is not a content word`);
    if (!row?.example_fr || !row?.example_en) problems.push(`${id}: missing example_fr/example_en`);
    const key = `${row?.word}::${row?.level}`;
    if (seen.has(key)) problems.push(`${id}: duplicate (word, level) ${key}`);
    seen.add(key);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Selection (pure)
// ---------------------------------------------------------------------------

// Stable per-learner rotation offset: two learners at the same level start
// at different points in the pool, while each learner's own sequence stays
// in source order and repeat-free. Deterministic — no Math.random().
export function rotationOffset(userId, poolSize) {
  if (!poolSize) return 0;
  let hash = 0;
  for (const ch of String(userId)) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return hash % poolSize;
}

// historyRows: [{word_id, served_date}] for this learner (any level).
// Returns up to `count` entries {word, is_recycled} in source order
// (rotated per learner), unseen words first; when the level's pool is
// exhausted, the oldest-served words of that level come back flagged
// is_recycled (FRA-154 recycle rule).
export function selectDailyWords({ pool, historyRows, userId, count = DAILY_WORD_COUNT }) {
  const levelPool = [...pool];
  if (!levelPool.length) return [];
  const offset = rotationOffset(userId, levelPool.length);
  const ordered = levelPool.map((_, i) => levelPool[(offset + i) % levelPool.length]);
  const servedAt = new Map((historyRows || []).map((row) => [row.word_id, row.served_date]));
  const unseen = ordered.filter((word) => !servedAt.has(word.id));
  const picked = unseen.slice(0, count).map((word) => ({ word, is_recycled: false }));
  if (picked.length < count) {
    const oldestFirst = ordered
      .filter((word) => servedAt.has(word.id))
      .sort((a, b) => String(servedAt.get(a.id)).localeCompare(String(servedAt.get(b.id))) || a.id.localeCompare(b.id));
    for (const word of oldestFirst) {
      if (picked.length >= count) break;
      picked.push({ word, is_recycled: true });
    }
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Questions (pure)
// ---------------------------------------------------------------------------

function blankExample(word) {
  // Fill-the-blank works only when the example uses the word verbatim
  // (inflected forms like dangereuse/douce fall back to another type).
  const example = word.example_fr || '';
  const idx = example.toLowerCase().indexOf(word.word.toLowerCase());
  if (idx < 0) return null;
  return `${example.slice(0, idx)}_____${example.slice(idx + word.word.length)}`;
}

// Two questions per word, types rotating through meaning -> word -> blank
// across the day's words (FRA-154 templated types). Every choice carries the
// id of the word it belongs to, so grading is shuffle-proof: the correct
// choice for a question is always the question's own word.
export function buildQuestions(dailyWords) {
  const words = dailyWords.map((entry) => entry.word);
  const questions = [];
  words.forEach((word, i) => {
    const others = words.filter((w) => w.id !== word.id);
    let types = [QUESTION_TYPES[i % 3], QUESTION_TYPES[(i + 1) % 3]];
    if (types.includes('blank') && !blankExample(word)) {
      types = types.map((t) => (t === 'blank' ? (types.includes('meaning') ? 'word' : 'meaning') : t));
    }
    for (const type of types) {
      if (type === 'meaning') {
        questions.push({
          id: `${word.id}:meaning`, word_id: word.id, type,
          prompt: `What does « ${word.word} » mean?`,
          choices: [word, ...others].map((w) => ({ id: w.id, text: w.gloss })),
        });
      } else if (type === 'word') {
        questions.push({
          id: `${word.id}:word`, word_id: word.id, type,
          prompt: `Which French word means “${word.gloss}”?`,
          choices: [word, ...others].map((w) => ({ id: w.id, text: w.word })),
        });
      } else {
        questions.push({
          id: `${word.id}:blank`, word_id: word.id, type,
          prompt: blankExample(word),
          hint: word.example_en,
          choices: [word, ...others].map((w) => ({ id: w.id, text: w.word })),
        });
      }
    }
  });
  return questions;
}

export function gradeAnswer(questions, questionId, choiceId) {
  const question = questions.find((q) => q.id === questionId);
  if (!question) return null;
  if (!question.choices.some((c) => c.id === choiceId)) return null;
  return { question, correct: choiceId === question.word_id };
}

function shuffledChoices(choices) {
  const out = choices.map((c) => ({ ...c }));
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const failure = (status, error) => ({ status, body: { error } });

// ---------------------------------------------------------------------------
// Service (database)
// ---------------------------------------------------------------------------

export function createWordsOfDayService(pool, loadBank = null) {
  async function bankRows(client, level) {
    if (loadBank) return (await loadBank()).filter((w) => w.level === level);
    const rows = (await client.query(
      'SELECT id, word, level, gloss, part_of_speech, example_fr, example_en, source FROM vocab_words WHERE level=$1 ORDER BY id',
      [level],
    )).rows;
    return rows;
  }

  // Load today's frozen set, or create + freeze it (set + history in one
  // transaction, learner row locked so concurrent first requests agree).
  async function todaySet(client, userId, timeZone) {
    const today = localDateString(new Date(), normalizeTimeZone(timeZone));
    const existing = (await client.query(
      'SELECT local_date, level, word_ids FROM daily_word_sets WHERE user_id=$1 AND local_date=$2',
      [userId, today],
    )).rows[0];
    if (existing) {
      const ids = typeof existing.word_ids === 'string' ? JSON.parse(existing.word_ids) : (existing.word_ids || []);
      let words;
      if (loadBank) {
        const bank = await loadBank();
        const history = (await client.query('SELECT word_id, is_recycled FROM user_word_history WHERE user_id=$1', [userId])).rows;
        const recycledById = new Map(history.map((row) => [row.word_id, row.is_recycled]));
        words = bank.filter((w) => ids.includes(w.id)).map((w) => ({ ...w, is_recycled: recycledById.get(w.id) }));
      } else {
        words = (await client.query(
          'SELECT w.id, w.word, w.level, w.gloss, w.part_of_speech, w.example_fr, w.example_en, h.is_recycled FROM vocab_words w LEFT JOIN user_word_history h ON h.user_id=$1 AND h.word_id=w.id WHERE w.id = ANY($2)',
          [userId, ids],
        )).rows;
      }
      const byId = new Map(words.map((w) => [w.id, w]));
      return {
        date: today, level: existing.level,
        words: ids.map((id) => byId.get(id)).filter(Boolean)
          .map((w) => ({ id: w.id, word: w.word, level: w.level, gloss: w.gloss, part_of_speech: w.part_of_speech, example_fr: w.example_fr, example_en: w.example_en, is_recycled: Boolean(w.is_recycled) })),
      };
    }
    const profile = (await client.query('SELECT current_level FROM learner_profiles WHERE user_id=$1', [userId])).rows[0];
    const level = LEVELS.includes(profile?.current_level) ? profile.current_level : 'A1';
    const pool = await bankRows(client, level);
    const history = (await client.query('SELECT word_id, served_date FROM user_word_history WHERE user_id=$1', [userId])).rows
      .map((row) => ({ word_id: row.word_id, served_date: row.served_date instanceof Date ? row.served_date.toISOString().slice(0, 10) : String(row.served_date) }));
    const picked = selectDailyWords({ pool, historyRows: history, userId });
    if (!picked.length) return { date: today, level, words: [] };
    const wordIds = picked.map((p) => p.word.id);
    await client.query(
      'INSERT INTO daily_word_sets(id, user_id, local_date, level, word_ids) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id, local_date) DO NOTHING',
      [randomUUID(), userId, today, level, JSON.stringify(wordIds)],
    );
    for (const entry of picked) {
      await client.query(
        `INSERT INTO user_word_history(user_id, word_id, served_date, is_recycled) VALUES($1,$2,$3,$4)
         ON CONFLICT(user_id, word_id) DO UPDATE SET served_date=EXCLUDED.served_date, is_recycled=EXCLUDED.is_recycled`,
        [userId, entry.word.id, today, entry.is_recycled],
      );
    }
    return {
      date: today, level,
      words: picked.map((p) => ({ id: p.word.id, word: p.word.word, level: p.word.level, gloss: p.word.gloss, part_of_speech: p.word.part_of_speech, example_fr: p.word.example_fr, example_en: p.word.example_en, is_recycled: p.is_recycled })),
    };
  }

  async function withTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const owner = (await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [fn.userId])).rows[0];
      if (!owner) { await client.query('ROLLBACK'); return failure(401, 'Authentication required.'); }
      const result = await fn.run(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    // GET /api/content/v1/vocab-words?level=A1 (public, published bank).
    async listWords(level) {
      const normalized = String(level || '').toUpperCase();
      if (!LEVELS.includes(normalized)) return failure(400, 'A valid level (A1-C2) is required.');
      const client = await pool.connect();
      try {
        const words = await bankRows(client, normalized);
        return { status: 200, body: { level: normalized, words } };
      } finally { client.release(); }
    },

    // GET /api/me/words/today?tz=...
    async today(userId, timeZone) {
      return withTransaction({
        userId,
        run: async (client) => {
          const set = await todaySet(client, userId, timeZone);
          const questions = buildQuestions(set.words.map((word) => ({ word })));
          const answers = set.words.length
            ? (await client.query(
              'SELECT question_id, word_id, question_type, correct FROM word_practice_answers WHERE user_id=$1 AND local_date=$2',
              [userId, set.date],
            )).rows
            : [];
          return {
            status: 200,
            body: {
              date: set.date, level: set.level, words: set.words,
              questions: questions.map((q) => ({ ...q, choices: shuffledChoices(q.choices) })),
              answered: Object.fromEntries(answers.map((a) => [a.question_id, { correct: a.correct }])),
              total_questions: questions.length,
              answered_count: answers.length,
              completed: questions.length > 0 && answers.length >= questions.length,
            },
          };
        },
      });
    },

    // GET /api/me/words/history?tz=... — the learner's sets from the last
    // 7 days before today, newest first, for review on the words page.
    // The >= bound is load-bearing: without it, a learner who skips days
    // would get sets older than the promised window (LIMIT 7 alone only
    // trims when recent days are contiguous).
    async history(userId, timeZone) {
      const client = await pool.connect();
      try {
        const today = localDateString(new Date(), normalizeTimeZone(timeZone));
        const weekAgo = shiftDate(today, -7);
        const setRows = (await client.query(
          'SELECT local_date, level, word_ids FROM daily_word_sets WHERE user_id=$1 AND local_date>=$2 AND local_date<$3 ORDER BY local_date DESC LIMIT 7',
          [userId, weekAgo, today],
        )).rows;
        if (!setRows.length) return { status: 200, body: { days: [] } };
        const idsOf = (row) => (typeof row.word_ids === 'string' ? JSON.parse(row.word_ids) : (row.word_ids || []));
        const allIds = [...new Set(setRows.flatMap(idsOf))];
        let words;
        if (loadBank) {
          const bank = await loadBank();
          const historyRows = (await client.query('SELECT word_id, is_recycled FROM user_word_history WHERE user_id=$1', [userId])).rows;
          const recycledById = new Map(historyRows.map((row) => [row.word_id, row.is_recycled]));
          words = bank.filter((w) => allIds.includes(w.id)).map((w) => ({ ...w, is_recycled: recycledById.get(w.id) }));
        } else {
          words = (await client.query(
            'SELECT w.id, w.word, w.level, w.gloss, w.part_of_speech, w.example_fr, w.example_en, h.is_recycled FROM vocab_words w LEFT JOIN user_word_history h ON h.user_id=$1 AND h.word_id=w.id WHERE w.id = ANY($2)',
            [userId, allIds],
          )).rows;
        }
        const byId = new Map(words.map((w) => [w.id, w]));
        const shape = (w) => ({ id: w.id, word: w.word, level: w.level, gloss: w.gloss, part_of_speech: w.part_of_speech, example_fr: w.example_fr, example_en: w.example_en, is_recycled: Boolean(w.is_recycled) });
        return {
          status: 200,
          body: {
            days: setRows.map((row) => ({
              date: row.local_date instanceof Date ? row.local_date.toISOString().slice(0, 10) : String(row.local_date),
              level: row.level,
              words: idsOf(row).map((id) => byId.get(id)).filter(Boolean).map(shape),
            })),
          },
        };
      } finally { client.release(); }
    },

    // POST /api/me/words/answers {question_id, choice_id, tz}
    async answer(userId, input) {
      if (!input || typeof input.question_id !== 'string' || typeof input.choice_id !== 'string') {
        return failure(400, 'question_id and choice_id are required.');
      }
      return withTransaction({
        userId,
        run: async (client) => {
          const set = await todaySet(client, userId, input.tz);
          const questions = buildQuestions(set.words.map((word) => ({ word })));
          const graded = gradeAnswer(questions, input.question_id, input.choice_id);
          if (!graded) return failure(400, 'That question is not part of today\'s words.');
          await client.query(
            `INSERT INTO word_practice_answers(id, user_id, local_date, word_id, question_id, question_type, correct)
             VALUES($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT(user_id, local_date, question_id) DO NOTHING`,
            [randomUUID(), userId, set.date, graded.question.word_id, graded.question.id, graded.question.type, graded.correct],
          );
          const answers = (await client.query(
            'SELECT question_id, correct FROM word_practice_answers WHERE user_id=$1 AND local_date=$2',
            [userId, set.date],
          )).rows;
          return {
            status: 200,
            body: {
              question_id: graded.question.id, correct: graded.correct,
              correct_choice_id: graded.question.word_id,
              answered_count: answers.length, total_questions: questions.length,
              completed: answers.length >= questions.length,
            },
          };
        },
      });
    },
  };
}
