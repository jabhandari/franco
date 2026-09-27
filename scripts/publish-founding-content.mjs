// One-time publish of the founding content dataset.
//
// The 242 content_items in normalized-content.json were curated together from
// openly licensed sources, so they skip per-item review and go straight to
// published. Future batches from new/outside sources still land in
// pending_review (unless ingested with auto_publish + a content:review key).
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/publish-founding-content.mjs      # dry run
//   DATABASE_URL=postgres://... node scripts/publish-founding-content.mjs --yes  # apply
//
// Safe to re-run: only touches rows still in pending_review.
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  throw new Error('Set DATABASE_URL to the Supabase PostgreSQL connection string first.');
}
const apply = process.argv.includes('--yes');

const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 1 });

async function counts(client) {
  const { rows } = await client.query(
    `SELECT status, COUNT(*)::int AS n FROM public.content_items GROUP BY status ORDER BY status`
  );
  return rows;
}

try {
  const client = await pool.connect();
  try {
    console.log('Before:');
    for (const row of await counts(client)) console.log(`  ${row.status}: ${row.n}`);
    if (!apply) {
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS n FROM public.content_items WHERE status='pending_review'`
      );
      console.log(`\nDry run — ${rows[0].n} items would be published. Re-run with --yes to apply.`);
    } else {
      const { rowCount } = await client.query(
        `UPDATE public.content_items SET status='published', updated_at=NOW() WHERE status='pending_review'`
      );
      console.log(`\nPublished ${rowCount} items.`);
      console.log('After:');
      for (const row of await counts(client)) console.log(`  ${row.status}: ${row.n}`);
    }
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
