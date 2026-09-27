import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { cleanExamPassage } from '../server/exam-text.js';

const { Pool } = pg;
const datasetPath = resolve(process.argv[2] || 'normalized-content.json');
const dataset = JSON.parse(await readFile(datasetPath, 'utf8'));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  throw new Error('Set DATABASE_URL to the Supabase PostgreSQL connection string before importing.');
}

// Parent tables must be loaded before rows that reference them.
const tables = [
  'content_sources',
  'example_sentences',
  'exam_questions',
  'content_items',
  'content_revisions',
  'media_assets',
  'learning_topics',
];
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 2,
});

async function insertRows(client, table, rows) {
  if (!Array.isArray(rows)) throw new Error(`Expected ${table} to be an array.`);
  if (!rows.length) return 0;

  // Exam text is cleaned once at import so the UI never does regex surgery.
  const cleaned = table === 'exam_questions'
    ? rows.map((row) => {
        const { prompt, passage } = cleanExamPassage(row.prompt, row.context);
        return { ...row, prompt, context: passage || null };
      })
    : rows;

  const columns = Object.keys(cleaned[0]);
  let inserted = 0;
  for (let offset = 0; offset < cleaned.length; offset += 500) {
    const chunk = cleaned.slice(offset, offset + 500);
    const values = [];
    const records = chunk.map((row) => {
      const placeholders = columns.map((column) => {
        values.push(row[column] ?? null);
        return `$${values.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    const sql = `INSERT INTO public.${table} (${columns.join(', ')}) VALUES ${records.join(', ')} ON CONFLICT DO NOTHING`;
    const result = await client.query(sql, values);
    inserted += result.rowCount;
  }

  return inserted;
}

try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const totals = {};
    for (const table of tables) {
      totals[table] = await insertRows(client, table, dataset[table] || []);
    }
    await client.query('COMMIT');
    for (const [table, count] of Object.entries(totals)) {
      console.log(`${table}: inserted ${count} rows`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
