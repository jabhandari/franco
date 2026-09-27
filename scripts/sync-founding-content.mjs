// One-time sync: push corrected founding-dataset content from
// normalized-content.json into Supabase (content_revisions + media_assets).
//
// The original import used ON CONFLICT DO NOTHING, so re-importing never
// picks up typo corrections. This updates the revision rows and media
// transcripts in place instead.
//
// Dry-run by default. Apply with:
//   npm run sync:founding -- --yes
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const apply = process.argv.includes('--yes');
const datasetPath = resolve('normalized-content.json');
const dataset = JSON.parse(await readFile(datasetPath, 'utf8'));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  throw new Error('Set DATABASE_URL (reads .env via npm script) before syncing.');
}

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 2 });

const revisions = dataset.content_revisions || [];
const media = dataset.media_assets || [];

try {
  const client = await pool.connect();
  try {
    let revUpdated = 0, revMissing = 0, mediaUpdated = 0, mediaMissing = 0;
    const changed = [];

    for (const r of revisions) {
      const cur = (await client.query(
        'SELECT title, prompt, instructions, context, response_json, evaluation_json FROM content_revisions WHERE item_id=$1 AND revision=$2',
        [r.item_id, r.revision],
      )).rows[0];
      if (!cur) { revMissing++; continue; }
      const same = cur.title === r.title
        && cur.prompt === r.prompt
        && (cur.instructions ?? null) === (r.instructions ?? null)
        && (cur.context ?? null) === (r.context ?? null)
        && JSON.stringify(cur.response_json) === JSON.stringify(r.response_json ?? null)
        && JSON.stringify(cur.evaluation_json) === JSON.stringify(r.evaluation_json ?? null);
      if (same) continue;
      changed.push(r.item_id);
      if (apply) {
        await client.query(
          `UPDATE content_revisions SET title=$1, prompt=$2, instructions=$3, context=$4,
           response_json=$5::jsonb, evaluation_json=$6::jsonb
           WHERE item_id=$7 AND revision=$8`,
          [r.title, r.prompt, r.instructions ?? null, r.context ?? null,
           JSON.stringify(r.response_json ?? null), JSON.stringify(r.evaluation_json ?? null),
           r.item_id, r.revision],
        );
      }
      revUpdated++;
    }

    for (const m of media) {
      const cur = (await client.query('SELECT transcript FROM media_assets WHERE id=$1', [m.id])).rows[0];
      if (!cur) { mediaMissing++; continue; }
      if ((cur.transcript ?? null) === (m.transcript ?? null)) continue;
      if (apply) {
        await client.query('UPDATE media_assets SET transcript=$1 WHERE id=$2', [m.transcript ?? null, m.id]);
      }
      mediaUpdated++;
    }

    console.log(`revisions to update: ${revUpdated} (missing in DB: ${revMissing})`);
    console.log(`media transcripts to update: ${mediaUpdated} (missing in DB: ${mediaMissing})`);
    if (changed.length) console.log(`items: ${changed.slice(0, 10).join(', ')}${changed.length > 10 ? ` …+${changed.length - 10} more` : ''}`);
    console.log(apply ? 'Sync applied.' : 'Dry run — no changes made. Re-run with --yes to apply.');
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
