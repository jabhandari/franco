import { createHash } from 'node:crypto';
import { concepts } from '../src/content/concepts.js';
import { migrate, pool } from '../server/database.js';

await migrate();
for (const concept of concepts) {
  const conceptId = createHash('sha256').update(`concept:${concept.id}`).digest('hex');
  await pool.query(`INSERT INTO concepts(id,slug,title,description,concept_type,level_code,metadata_json)
    VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,concept_type=EXCLUDED.concept_type,level_code=EXCLUDED.level_code,metadata_json=EXCLUDED.metadata_json`, [conceptId, concept.id, concept.title, concept.shortDescription, concept.category, concept.level, JSON.stringify({ sources: concept.sources })]);
}
await pool.end();
console.log(`Seeded ${concepts.length} curriculum concepts for content.v1 references.`);
