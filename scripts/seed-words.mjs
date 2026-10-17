// FRA-154: seed the vocab_words bank from the FRA-153 launch vocabulary
// (content/vocab/launch.mjs, converted by server/words-of-day.js).
// Data operation — run deliberately:  npm run seed:words
// Idempotent: upserts on (word, level); safe to re-run after editing the
// seed file. The API reads the bank from the table, never from the file.
import pg from 'pg';
import { loadSeedWordBank, validateWordBank } from '../server/words-of-day.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) {
  throw new Error('DATABASE_URL must point to Supabase PostgreSQL.');
}
const rows = await loadSeedWordBank();
const problems = validateWordBank(rows);
if (problems.length) throw new Error(`Seed bank is invalid:\n${problems.join('\n')}`);

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  for (const row of rows) {
    await pool.query(
      `INSERT INTO vocab_words(id, word, level, gloss, part_of_speech, example_fr, example_en, source)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(word, level) DO UPDATE SET
         gloss=EXCLUDED.gloss, part_of_speech=EXCLUDED.part_of_speech,
         example_fr=EXCLUDED.example_fr, example_en=EXCLUDED.example_en, source=EXCLUDED.source`,
      [row.id, row.word, row.level, row.gloss, row.part_of_speech, row.example_fr, row.example_en, row.source],
    );
  }
  const counts = await pool.query('SELECT level, COUNT(*)::int AS n FROM vocab_words GROUP BY level ORDER BY level');
  console.log('vocab_words seeded:', counts.rows.map((r) => `${r.level}=${r.n}`).join(' '));
} finally {
  await pool.end();
}
