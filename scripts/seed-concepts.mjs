import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { migrate, pool } from '../server/database.js';
import { validateCurriculumTopic } from '../server/curriculum-contract.js';

const topics = JSON.parse(await readFile(new URL('../content/curriculum/topics.json', import.meta.url), 'utf8'));
if (topics.length !== 90 || new Set(topics.map(t => t.topic_id)).size !== 90) throw new Error('Curriculum must contain exactly 90 distinct topics.');
for (const topic of topics) {
  const result = validateCurriculumTopic(topic);
  if (!result.valid) throw new Error(`${topic.topic_id}: ${result.errors.join('; ')}`);
  if (topic.prerequisite_concept_ids.some(id => !topics.some(t => t.topic_id === id))) throw new Error('Unknown prerequisite');
}
const idFor = slug => createHash('sha256').update(`concept:${slug}`).digest('hex');
await migrate();
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../supabase/migrations/202610150001_curriculum.sql', import.meta.url), 'utf8'));
  // Keep old IDs and foreign keys for historical attempts; retire their roadmap entries.
  await client.query("UPDATE concepts SET status='retired' WHERE status='active' AND NOT(slug=ANY($1))", [topics.map(t => t.topic_id)]);
  for (const topic of topics) {
    const metadata = { ...topic, outcome: `I can use ${topic.topic_title.toLowerCase()} in ${topic.level} communication.`, explanation: '', example_items: [], question_items: [], correct_answers: [], feedback: [], skills: ['reading','writing','listening','speaking'], difficulty: topic.level, source_url: null, source_author: 'Franco', license_id: 'original', attribution_text: 'Original Franco curriculum', review_status: 'draft', version: 1, review_due_policy: { initial_days: 1, subsequent_days: [3,7,14,30] }, theory: [], vocabulary: topic.subtopics.map(s => s.title), examples: [], sources: [], stub: true };
    await client.query(`INSERT INTO concepts(id,slug,title,description,concept_type,level_code,list_order,metadata_json,status)
      VALUES($1,$2,$3,$4,'curriculum',$5,$6,$7,'active') ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,level_code=EXCLUDED.level_code,list_order=EXCLUDED.list_order,metadata_json=EXCLUDED.metadata_json,status='active'`,
      [idFor(topic.topic_id), topic.topic_id, topic.topic_title, metadata.outcome, topic.level, topic.order_index, JSON.stringify(metadata)]);
    await client.query('DELETE FROM concept_prerequisites WHERE concept_id=(SELECT id FROM concepts WHERE slug=$1)', [topic.topic_id]);
  }
  for (const topic of topics) for (const prereq of topic.prerequisite_concept_ids) await client.query(`INSERT INTO concept_prerequisites(concept_id,prerequisite_concept_id) SELECT c.id,p.id FROM concepts c,concepts p WHERE c.slug=$1 AND p.slug=$2 ON CONFLICT DO NOTHING`, [topic.topic_id,prereq]);
  // Re-running the seed never resets reviewed content or bypasses editorial review.
  // A pack still at 'generated' may be replaced by a newer file version, so a
  // corrected pack can re-enter editorial review; reviewed packs never change.
  const directory = new URL('../content/curriculum/', import.meta.url);
  for (const name of (await readdir(directory)).filter(n => n.endsWith('.lessons.json')).sort()) {
    for (const pack of JSON.parse(await readFile(new URL(name, directory), 'utf8'))) {
      if (!topics.some(t => t.topic_id === pack.topic_id)) throw new Error(`Unknown topic ${pack.topic_id}`);
      if (!pack.outcome?.startsWith('I can ') || !pack.explanation || !['example_items','recognition','guided_production'].every(k => Array.isArray(pack[k]) && pack[k].length >= 3 && pack[k].length <= 5) || !pack.mastery?.length || !pack.reading?.english || !pack.realistic_use?.rubric?.length || !Number.isInteger(pack.version)) throw new Error(`Incomplete lesson pack: ${pack.topic_id}`);
      const inserted = await client.query(`INSERT INTO curriculum_lessons(topic_id,review_status,version,pack_json) VALUES($1,'generated',$2,$3) ON CONFLICT(topic_id) DO NOTHING RETURNING topic_id`, [pack.topic_id,pack.version,JSON.stringify(pack)]);
      let replaced = inserted.rowCount > 0;
      if (!replaced) {
        const updated = await client.query(`UPDATE curriculum_lessons SET pack_json=$3,version=$2,updated_at=NOW() WHERE topic_id=$1 AND review_status='generated' AND version<$2 RETURNING topic_id`, [pack.topic_id,pack.version,JSON.stringify(pack)]);
        replaced = updated.rowCount > 0;
        if (replaced) await client.query('DELETE FROM curriculum_questions WHERE topic_id=$1', [pack.topic_id]);
      }
      if (!replaced) continue;
      for (const section of ['recognition','guided_production','mastery']) for (const [position,question] of (pack[section] || []).entries()) await client.query('INSERT INTO curriculum_questions(id,topic_id,section,position,question_json) VALUES($1,$2,$3,$4,$5)', [`${pack.topic_id}:${section}:${position}`,pack.topic_id,section,position,JSON.stringify(question)]);
    }
  }
  await client.query('COMMIT');
  console.log(`Seeded ${topics.length} curriculum topics; authored packs require editorial review.`);
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { client.release(); await pool.end(); }
