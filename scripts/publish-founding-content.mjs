// One-time publish of the founding content dataset.
//
// The 242 content_items in normalized-content.json were curated together from
// openly licensed sources, so they skip per-item review and go straight to
// published. Future batches from new/outside sources still land in
// pending_review (unless ingested with auto_publish + a content:review key).
//
// Scoped strictly to the IDs in normalized-content.json: any other
// pending_review rows (e.g. from newer batches) are reported and left alone.
//
// Usage (reads DATABASE_URL from .env via the npm script):
//   npm run publish:founding           # dry run
//   npm run publish:founding -- --yes  # apply
//
// Safe to re-run: only touches founding rows still in pending_review.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  throw new Error('Set DATABASE_URL (reads .env via npm script) before publishing.');
}
const apply = process.argv.includes('--yes');

const dataset = JSON.parse(await readFile(resolve('normalized-content.json'), 'utf8'));
const foundingIds = [...new Set((dataset.content_items || []).map((i) => i.id))];
if (!foundingIds.length) throw new Error('No content_items found in normalized-content.json.');

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 1 });

try {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, status FROM public.content_items WHERE id = ANY($1)`,
      [foundingIds],
    );
    const byId = new Map(rows.map((r) => [r.id, r.status]));
    const missing = foundingIds.filter((id) => !byId.has(id));
    const pending = foundingIds.filter((id) => byId.get(id) === 'pending_review');
    const already = foundingIds.filter((id) => byId.get(id) === 'published');
    const other = foundingIds.filter((id) => byId.has(id) && !['pending_review', 'published'].includes(byId.get(id)));

    const unrelated = (await client.query(
      `SELECT COUNT(*)::int AS n FROM public.content_items
       WHERE status='pending_review' AND NOT (id = ANY($1))`,
      [foundingIds],
    )).rows[0].n;

    console.log(`Founding items in dataset: ${foundingIds.length}`);
    console.log(`  in DB, still pending_review: ${pending.length}`);
    console.log(`  in DB, already published:    ${already.length}`);
    if (other.length) console.log(`  in DB, other status:         ${other.length} (${other.slice(0, 5).join(', ')}…)`);
    if (missing.length) console.log(`  missing from DB:             ${missing.length} (${missing.slice(0, 5).join(', ')}…)`);
    console.log(`Unrelated pending_review rows (left untouched): ${unrelated}`);

    if (!pending.length) {
      console.log('\nNothing to publish.');
    } else if (!apply) {
      console.log(`\nDry run — ${pending.length} founding items would be published. Re-run with --yes to apply.`);
    } else {
      const { rowCount } = await client.query(
        `UPDATE public.content_items SET status='published', updated_at=NOW()
         WHERE id = ANY($1) AND status='pending_review'`,
        [foundingIds],
      );
      console.log(`\nPublished ${rowCount} founding items.`);
    }
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
