import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { migrate, pool } from '../server/database.js';

await migrate();
const sqlite = new DatabaseSync('data/franco.sqlite');
const id = (value) => createHash('sha256').update(value).digest('hex');
const json = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const typeMap = { reading: 'reading', word_order: 'word_order', spelling: 'free_text', grammar_focus: 'multiple_choice' };
const sourceRows = sqlite.prepare('SELECT * FROM content_sources').all();
for (const source of sourceRows) await pool.query('INSERT INTO content_sources(id,name,url,license,attribution,imported_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING', [source.id, source.name, source.url, source.license, source.attribution, source.imported_at]);

async function insertItem({ oldId, sourceId, externalId, type, level, prompt, context, response, evaluation, difficultyScore, metadata }) {
  const itemId = id(`legacy-v1:${oldId}`); const hash = id(JSON.stringify({ type, prompt, context: context || '', response, evaluation }));
  await pool.query('INSERT INTO content_items(id,source_id,external_id,item_type,status,cefr_level,cefr_method,difficulty_score,exact_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING', [itemId, sourceId, externalId, type, 'published', level, 'heuristic', difficultyScore ?? null, hash]);
  await pool.query('INSERT INTO content_revisions(item_id,revision,prompt,context,response_json,evaluation_json,metadata_json) VALUES($1,1,$2,$3,$4,$5,$6) ON CONFLICT(item_id,revision) DO NOTHING', [itemId, prompt, context || null, JSON.stringify(response), JSON.stringify(evaluation), JSON.stringify(metadata || {})]);
}

for (const example of sqlite.prepare('SELECT * FROM example_sentences').all()) {
  await insertItem({ oldId: `example:${example.id}`, sourceId: example.source_id, externalId: `legacy-example:${example.source_sentence_id}`, type: 'reading', level: example.cefr_section, prompt: example.text, response: { answer: example.text }, evaluation: { mode: 'exact' }, difficultyScore: example.difficulty_score, metadata: json(example.metadata_json, {}) });
  for (const exercise of sqlite.prepare('SELECT * FROM exercise_items WHERE example_id=?').all(example.id)) {
    const type = typeMap[exercise.exercise_type] || 'free_text'; const choices = json(exercise.choices_json, []); const response = type === 'word_order' ? { tokens: choices, answer: exercise.answer } : type === 'multiple_choice' ? { choices: choices.map((text, index) => ({ id: String(index), text })), answer: exercise.answer } : { answer: exercise.answer, accepted_answers: [exercise.answer] };
    await insertItem({ oldId: `exercise:${exercise.id}`, sourceId: example.source_id, externalId: `legacy-exercise:${exercise.id}`, type, level: exercise.cefr_section, prompt: exercise.prompt, context: example.text, response, evaluation: { mode: type === 'word_order' ? 'token_order' : type === 'multiple_choice' ? 'choice' : 'normalized_text' }, difficultyScore: example.difficulty_score, metadata: { legacy_exercise_type: exercise.exercise_type, explanation: exercise.explanation } });
  }
}
for (const question of sqlite.prepare('SELECT * FROM exam_questions').all()) {
  const choices = json(question.choices_json, []).map((choice, index) => typeof choice === 'string' ? { id: String(index), text: choice } : choice); const answer = question.answer || choices[0]?.id || null;
  await insertItem({ oldId: `exam:${question.id}`, sourceId: question.source_id, externalId: `legacy-exam:${question.external_id}`, type: 'multiple_choice', level: question.cefr_section, prompt: question.prompt, context: question.context, response: { choices, answer }, evaluation: { mode: 'choice' }, metadata: { exam_name: question.exam_name, skill: question.skill, source_url: question.source_url, explanation: question.explanation, legacy: true } });
}
await pool.end();
console.log('Migrated legacy SQLite content into content.v1 records.');
