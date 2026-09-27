import { createHash } from 'node:crypto';
import { concepts, conceptPrerequisites } from './concept-data.mjs';
import { migrate, pool } from '../server/database.js';

await migrate();

const idFor = (slug) => createHash('sha256').update(`concept:${slug}`).digest('hex');

for (const concept of concepts) {
  await pool.query(
    `INSERT INTO concepts(id,slug,title,description,concept_type,level_code,metadata_json)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,
       concept_type=EXCLUDED.concept_type,level_code=EXCLUDED.level_code,metadata_json=EXCLUDED.metadata_json`,
    [idFor(concept.id), concept.id, concept.title, concept.shortDescription, concept.category, concept.level,
     JSON.stringify({ theory: concept.theory, vocabulary: concept.vocabulary, examples: concept.examples, sources: concept.sources, stub: concept.stub })]
  );
}

let edges = 0;
for (const [slug, prereqs] of Object.entries(conceptPrerequisites)) {
  for (const prereq of prereqs) {
    await pool.query(
      `INSERT INTO concept_prerequisites(concept_id,prerequisite_concept_id)
       VALUES($1,$2) ON CONFLICT DO NOTHING`,
      [idFor(slug), idFor(prereq)]
    );
    edges += 1;
  }
}

await pool.end();
console.log(`Seeded ${concepts.length} curriculum concepts and ${edges} prerequisite edges.`);
