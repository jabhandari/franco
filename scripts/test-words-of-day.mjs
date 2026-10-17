// Unit checks for FRA-153/154 Words of the Day (server/words-of-day.js):
// seed-bank validation, per-learner selection (no repeats, recycle),
// question generation/grading, frozen daily sets, and streak isolation.
import { readFile } from 'node:fs/promises';
import {
  LEVELS, DAILY_WORD_COUNT, validateWordBank, loadSeedWordBank,
  selectDailyWords, buildQuestions, gradeAnswer, createWordsOfDayService,
} from '../server/words-of-day.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- Seed bank (FRA-153) ---------------------------------------------------
const bank = await loadSeedWordBank();
assert(validateWordBank(bank).length === 0, `seed bank is valid (${validateWordBank(bank).join('; ')})`);
assert(bank.length === 620, `seed bank: 620 launch words (got ${bank.length})`);
for (const [level, target] of [['A1', 150], ['A2', 150], ['B1', 100], ['B2', 100], ['C1', 60], ['C2', 60]]) {
  const n = bank.filter((w) => w.level === level).length;
  assert(n === target, `seed bank: ${level} meets the FRA-153 target (${n}/${target})`);
}
const a2Sample = bank.find((w) => w.id === 'w-a2-001');
assert(a2Sample.example_fr === 'Nous parlons du chat.' || a2Sample.example_fr.startsWith('Nous parlons d'), `seed bank: A2 topic phrase contracts de + le (got "${a2Sample.example_fr}")`);
assert(bank.every((w) => w.gloss && w.example_fr && w.example_en), 'seed bank: every word has gloss + bilingual example');
assert(validateWordBank([{ id: 'x', word: 'pain', level: 'A1', gloss: 'bread', part_of_speech: 'noun', example_fr: '', example_en: '' }]).length > 0,
  'validateWordBank: a word without an example does not ship');
assert(validateWordBank([{ id: 'x', word: 'le', level: 'A1', gloss: 'the', part_of_speech: 'article', example_fr: 'Le chat.', example_en: 'The cat.' }]).length > 0,
  'validateWordBank: function words are excluded from the pool');

// --- Selection (FRA-154) ----------------------------------------------------
const a1Pool = bank.filter((w) => w.level === 'A1');
const day1 = selectDailyWords({ pool: a1Pool, historyRows: [], userId: 'learner-one' });
assert(day1.length === DAILY_WORD_COUNT, 'selection: 5 words on day one');
assert(day1.every((e) => !e.is_recycled), 'selection: day one words are all new');

const history = day1.map((e) => ({ word_id: e.word.id, served_date: '2026-10-01' }));
const day2 = selectDailyWords({ pool: a1Pool, historyRows: history, userId: 'learner-one' });
assert(day2.every((e) => !history.some((h) => h.word_id === e.word.id)), 'selection: no repeat while unserved words remain');

// Simulate a learner draining the whole pool: never a repeat until it is gone.
const served = new Map();
let rows = [];
for (let day = 0; day < a1Pool.length / DAILY_WORD_COUNT; day++) {
  const picked = selectDailyWords({ pool: a1Pool, historyRows: rows, userId: 'learner-one' });
  for (const entry of picked) {
    assert(!served.has(entry.word.id), `selection: ${entry.word.id} never repeats before the pool is exhausted`);
    served.set(entry.word.id, `2026-10-${String(day + 1).padStart(2, '0')}`);
  }
  rows = [...served.entries()].map(([word_id, served_date]) => ({ word_id, served_date }));
}
assert(served.size === a1Pool.length, 'selection: the whole pool is served before any recycle');

// Pool exhausted -> oldest-served come back first, flagged as review.
const recycled = selectDailyWords({ pool: a1Pool, historyRows: rows, userId: 'learner-one' });
assert(recycled.length === DAILY_WORD_COUNT && recycled.every((e) => e.is_recycled), 'recycle: exhausted pool returns flagged words');
const oldestDate = [...served.values()].sort()[0];
assert(recycled.every((e) => served.get(e.word.id) === oldestDate), 'recycle: oldest-served words come back first');

// Two learners at the same level can receive different sets.
const other = selectDailyWords({ pool: a1Pool, historyRows: [], userId: 'learner-two' });
assert(other.map((e) => e.word.id).join() !== day1.map((e) => e.word.id).join(), 'selection: two learners can receive different sets');
assert(LEVELS.length === 6, 'levels: A1-C2 supported by the engine');

// --- Questions ---------------------------------------------------------------
const dailyWords = day1.map((e) => ({ word: e.word, is_recycled: e.is_recycled }));
const questions = buildQuestions(dailyWords);
assert(questions.length === DAILY_WORD_COUNT * 2, 'questions: exactly 10 (2 per word)');
for (const entry of day1) {
  assert(questions.filter((q) => q.word_id === entry.word.id).length === 2, `questions: 2 for ${entry.word.id}`);
}
assert(questions.every((q) => ['meaning', 'word', 'blank'].includes(q.type)), 'questions: types are meaning/word/blank');
assert(questions.every((q) => q.choices.length === DAILY_WORD_COUNT), 'questions: 5 choices (today\'s words)');
for (const q of questions.filter((q) => q.type === 'blank')) {
  const word = day1.find((e) => e.word.id === q.word_id).word;
  assert(q.prompt.includes('_____') && !q.prompt.toLowerCase().includes(word.word.toLowerCase()), `questions: blank hides the word (${q.id})`);
  assert(typeof q.hint === 'string' && q.hint.length > 0, 'questions: blank carries the English hint');
}
// Words whose examples do not contain the word verbatim (the A2 "about"
// template turns "le chat" into "du chat") never get a broken blank question.
const inflected = { id: 'w-test-001', word: 'le chat', level: 'A2', gloss: 'the cat', part_of_speech: 'noun', example_fr: 'Nous parlons du chat.', example_en: 'We are talking about the cat.', source: 'test' };
const trickyQs = buildQuestions([{ word: inflected }, ...day1.slice(0, 4).map((e) => ({ word: e.word }))]);
assert(trickyQs.filter((q) => q.word_id === inflected.id).every((q) => q.type !== 'blank'), 'questions: a word absent from its example falls back from blank');
assert(trickyQs.filter((q) => q.word_id === inflected.id).length === 2, 'questions: the fallback still gives 2 questions for the word');

// --- Grading -------------------------------------------------------------------
const q0 = questions[0];
assert(gradeAnswer(questions, q0.id, q0.word_id)?.correct === true, 'grading: the word\'s own choice is correct');
const wrong = q0.choices.find((c) => c.id !== q0.word_id);
assert(gradeAnswer(questions, q0.id, wrong.id)?.correct === false, 'grading: another word\'s choice is wrong');
assert(gradeAnswer(questions, 'nope', q0.word_id) === null, 'grading: unknown question rejected');
assert(gradeAnswer(questions, q0.id, 'not-a-word') === null, 'grading: foreign choice rejected');

// --- Service: frozen set + answers, with a fake pool ---------------------------
// Minimal in-memory stand-in for the pg pool: pattern-matches the service's
// SQL by table name and keeps rows in Maps. loadBank injection = seed bank.
function fakePool() {
  const sets = new Map(); const historyRows = new Map(); const answers = [];
  const key = (u, d) => `${u}::${d}`;
  const client = {
    async query(sql, params = []) {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('FROM users')) return { rows: [{ id: params[0] }] };
      if (sql.includes('FROM learner_profiles')) return { rows: [{ current_level: 'A1' }] };
      if (sql.includes('SELECT local_date, level, word_ids FROM daily_word_sets')) {
        const row = sets.get(key(params[0], params[1]));
        return { rows: row ? [row] : [] };
      }
      if (sql.includes('INSERT INTO daily_word_sets')) {
        sets.set(key(params[1], params[2]), { local_date: params[2], level: params[3], word_ids: JSON.parse(params[4]) });
        return { rows: [] };
      }
      if (sql.includes('SELECT word_id, served_date FROM user_word_history')) {
        return { rows: [...historyRows.values()].filter((r) => r.user_id === params[0]) };
      }
      if (sql.includes('SELECT word_id, is_recycled FROM user_word_history')) {
        return { rows: [...historyRows.values()].filter((r) => r.user_id === params[0]) };
      }
      if (sql.includes('INSERT INTO user_word_history')) {
        historyRows.set(`${params[0]}::${params[1]}`, { user_id: params[0], word_id: params[1], served_date: params[2], is_recycled: params[3] });
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO word_practice_answers')) {
        if (!answers.some((a) => a.user_id === params[1] && a.local_date === params[2] && a.question_id === params[4])) {
          answers.push({ id: params[0], user_id: params[1], local_date: params[2], word_id: params[3], question_id: params[4], question_type: params[5], correct: params[6] });
        }
        return { rows: [] };
      }
      if (sql.includes('FROM word_practice_answers')) {
        return { rows: answers.filter((a) => a.user_id === params[0] && a.local_date === params[1]) };
      }
      throw new Error(`fakePool: unhandled SQL: ${sql.slice(0, 80)}`);
    },
    release() {},
  };
  return { connect: async () => client, _answers: answers, _sets: sets };
}

const pool = fakePool();
const service = createWordsOfDayService(pool, loadSeedWordBank);
const first = await service.today('learner-one', 'America/Toronto');
assert(first.status === 200 && first.body.words.length === 5, 'service: today serves 5 words');
assert(first.body.questions.length === 10, 'service: today serves 10 questions');
const second = await service.today('learner-one', 'America/Toronto');
assert(second.body.words.map((w) => w.id).join() === first.body.words.map((w) => w.id).join(), 'service: re-requesting never changes the frozen set');
const q = first.body.questions[0];
const graded = await service.answer('learner-one', { question_id: q.id, choice_id: q.word_id, tz: 'America/Toronto' });
assert(graded.status === 200 && graded.body.correct === true, 'service: answer graded server-side');
assert(pool._answers.length === 1 && pool._answers[0].question_id === q.id, 'service: answer stored in the word-practice store');
const after = await service.today('learner-one', 'America/Toronto');
assert(after.body.answered_count === 1 && after.body.answered[q.id]?.correct === true, 'service: practice state survives a refresh (comes from the server)');
const bad = await service.answer('learner-one', { question_id: 'w-a1-999:meaning', choice_id: 'w-a1-001', tz: 'America/Toronto' });
assert(bad.status === 400, 'service: answers to foreign questions are rejected');

// --- Streak isolation (static guard) -------------------------------------------
const moduleSource = await readFile(new URL('../server/words-of-day.js', import.meta.url), 'utf8');
assert(!moduleSource.includes('learner_activity_days'), 'streak isolation: the module never touches the activity-days table');
assert(!moduleSource.includes('learning_attempts'), 'streak isolation: the module never touches the attempts store');
assert(!moduleSource.includes('/api/me/attempts'), 'streak isolation: answers are never routed through the attempts endpoint');
assert(moduleSource.includes('word_practice_answers'), 'streak isolation: answers live in their own store');

console.log('words-of-day checks passed');
