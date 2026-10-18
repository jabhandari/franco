import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !['localhost', '127.0.0.1'].includes(new URL(databaseUrl).hostname)) {
  throw new Error('TEST_DATABASE_URL must point to local PostgreSQL.');
}
const db = new Pool({ connectionString: databaseUrl });
const port = 30000 + Math.floor(Math.random() * 20000);
const root = `http://127.0.0.1:${port}`;
const api = spawn(process.execPath, ['server/index.js'], {
  env: { ...process.env, DATABASE_URL: databaseUrl, PORT: String(port), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let apiErrors = '';
api.stderr.on('data', chunk => { apiErrors += chunk; });
const sourceId = `mcq-test-${randomUUID()}`;
const userId = `mcq-test-${randomUUID()}`;
const token = randomUUID();
const itemIds = [];

async function insertItem(name, response, mode = 'choice', externalId = name) {
  const id = `mcq-test-${randomUUID()}`;
  itemIds.push(id);
  await db.query('INSERT INTO content_items(id,source_id,external_id,item_type,status,cefr_level,cefr_method,exact_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, sourceId, externalId, 'multiple_choice', 'published', 'A1', 'human', id]);
  await db.query('INSERT INTO content_revisions(item_id,revision,prompt,response_json,evaluation_json) VALUES($1,1,$2,$3,$4)', [id, `Question ${name}`, response, { mode }]);
  return id;
}

async function attempt(itemId, choice) {
  const result = await fetch(`${root}/api/me/attempts`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ item_id: itemId, item_kind: 'content_item', response: choice }) });
  const payload = await result.json();
  assert.equal(result.status, 201, JSON.stringify(payload));
  return payload;
}

try {
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    if (api.exitCode !== null) break;
    try { if ((await fetch(`${root}/api/health`)).ok) { healthy = true; break; } } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(healthy, `API did not start: ${apiErrors}`);
  await db.query(await readFile(new URL('../supabase/migrations/001_content_reports.sql', import.meta.url), 'utf8'));
  await db.query('INSERT INTO content_sources(id,name,url,license,attribution) VALUES($1,$1,$2,$3,$4)', [sourceId, 'https://example.test', 'test', 'test']);
  const legacyExamId = `mcq-test-${randomUUID()}`;
  await db.query('INSERT INTO exam_questions(id,source_id,external_id,exam_name,cefr_section,skill,prompt,choices_json,answer,source_url,metadata_json) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [legacyExamId, sourceId, 'tcf-example-2', 'TCF', 'A1', 'listening', 'Picture question', [], null, 'https://example.test', {}]);
  await db.query('INSERT INTO users(id,email,name,password_hash,password_salt) VALUES($1,$2,$3,$4,$5)', [userId, `${userId}@example.test`, 'MCQ Test', 'unused', 'unused']);
  await db.query('INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL \'1 hour\')', [randomUUID(), userId, createHash('sha256').update(token).digest('hex')]);

  const choices = [{ id: '0', text: 'verb' }, { id: '1', text: 'noun' }, { id: '2', text: 'adverb' }, { id: '3', text: 'adjective' }];
  const textAnswer = await insertItem('text-answer', { choices, answer: 'noun' });
  const keyAnswer = await insertItem('key-answer', { choices, answer: '1' });
  const answerless = await insertItem('answerless', { choices });
  const exampleChoices = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: `Option ${key}` }));
  const tcfExamples = [
    'D', 'C', 'C', 'B', 'B', 'B', 'C', 'A', 'C', 'A', 'D', 'C', 'B', 'A',
  ];
  const imported = [];
  for (const [index, answer] of tcfExamples.entries()) {
    const number = index + 1;
    const id = await insertItem(`tcf-${number}`, { choices: exampleChoices }, 'choice', `legacy-exam:tcf-example-${number}`);
    imported.push({ id, number, answer });
  }
  // Legacy imports may key choices with letters and record the answer in a
  // different case; grading is case-insensitive, so the reveal must resolve
  // the same way.
  const letterChoices = [{ key: 'A', text: 'verb' }, { key: 'B', text: 'noun' }, { key: 'C', text: 'adverb' }, { key: 'D', text: 'adjective' }];
  const keyCaseAnswer = await insertItem('key-case-answer', { choices: letterChoices, answer: 'b' });
  const listing = await (await fetch(`${root}/api/content/v1/items?level=A1&type=multiple_choice`)).json();
  assert(Array.isArray(listing.items), JSON.stringify(listing));
  assert(listing.items.some(item => item.id === textAnswer && item.choices[1].id === '1'));

  for (const id of [textAnswer, keyAnswer]) {
    for (const choice of choices) {
      const result = await attempt(id, choice.id);
      assert.equal(result.correct, choice.id === '1', `${id}: choice ${choice.id}`);
      assert.equal(result.reveal, 'noun');
    }
  }
  for (const choice of letterChoices) {
    const result = await attempt(keyCaseAnswer, choice.key);
    assert.equal(result.correct, choice.key === 'B', `key-case-answer: choice ${choice.key}`);
    assert.equal(result.reveal, 'noun', `key-case-answer: reveal for ${choice.key}`);
  }
  assert.equal((await attempt(answerless, '1')).correct, false);
  const migration = await readFile(new URL('../supabase/migrations/20261018_ungradable_choices.sql', import.meta.url), 'utf8');
  await db.query(migration);
  await db.query(migration); // Startup reruns this migration; it must be idempotent.
  const legacy = (await db.query('SELECT answer,metadata_json->>\'image_url\' AS image_url FROM exam_questions WHERE id=$1', [legacyExamId])).rows[0];
  assert.equal(legacy.answer, 'C', 'Past Questions answer is backfilled');
  assert.match(legacy.image_url, /image-comprehension-orale-exemple-2\.jpg$/, 'Past Questions gets its source image');
  for (const { id, number, answer } of imported) {
    const row = (await db.query('SELECT i.status,r.response_json->>\'answer\' AS answer FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision WHERE i.id=$1', [id])).rows[0];
    assert.equal(row.status, 'published', `TCF example ${number} remains in Practice`);
    assert.equal(row.answer, answer, `TCF example ${number} has its verified answer`);
    const result = await attempt(id, answer);
    assert.equal(result.correct, true, `TCF example ${number} grades ${answer} correctly`);
    const media = (await db.query('SELECT kind,url FROM media_assets WHERE item_id=$1', [id])).rows;
    assert.equal(media.length, [1, 2, 11, 12, 13, 14].includes(number) ? 1 : 0, `TCF example ${number} source image`);
  }
  const after = await (await fetch(`${root}/api/content/v1/items?level=A1&type=multiple_choice`)).json();
  assert(!after.items.some(item => item.id === answerless), 'answerless choice is removed from Practice inventory');
  const rejected = await fetch(`${root}/api/me/attempts`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ item_id: answerless, item_kind: 'content_item', response: '1' }) });
  assert.equal(rejected.status, 404, 'answerless choice cannot be attempted after demotion');
  console.log('MCQ API integration passed: text/key answers, 14 keyed TCF examples with source images, and unknown answerless demotion.');
} finally {
  api.kill();
  try {
    // Delete child rows before their parents: databases built from
    // supabase/schema.sql (the schema of record) define the
    // content_revisions FK without ON DELETE CASCADE, so deleting the
    // item first would throw there. No .catch() swallowing — a cleanup
    // failure must fail the test, not silently leak published fixtures.
    await db.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
    await db.query('DELETE FROM learning_attempts WHERE user_id=$1', [userId]);
    await db.query('DELETE FROM learner_item_state WHERE user_id=$1', [userId]);
    await db.query('DELETE FROM users WHERE id=$1', [userId]);
    for (const id of itemIds) {
      await db.query('DELETE FROM media_assets WHERE item_id=$1', [id]);
      await db.query('DELETE FROM content_revisions WHERE item_id=$1', [id]);
      await db.query('DELETE FROM content_items WHERE id=$1', [id]);
    }
    await db.query('DELETE FROM exam_questions WHERE source_id=$1', [sourceId]);
    await db.query('DELETE FROM content_sources WHERE id=$1', [sourceId]);
  } finally {
    await db.end();
  }
}
