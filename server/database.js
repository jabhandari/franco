import { Pool } from 'pg';
import { createHash } from 'node:crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) throw new Error('DATABASE_URL must point to Supabase PostgreSQL.');
export const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: Number(process.env.DB_POOL_SIZE || 5) });
export function query(sql, params = []) { let i = 0; return pool.query(sql.replace(/\?/g, () => `$${++i}`), params).then((r) => r.rows); }
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS learner_profiles (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,current_level TEXT,learning_goal TEXT,placement_status TEXT NOT NULL DEFAULT 'not_started',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS user_skill_estimates (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,cefr_level TEXT NOT NULL,skill TEXT NOT NULL,strength REAL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(user_id,cefr_level,skill));
    CREATE TABLE IF NOT EXISTS attempts (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,exercise_id TEXT,concept_id TEXT,skill TEXT,result TEXT,answer TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS mistakes (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,concept_id TEXT,prompt TEXT,correction TEXT,status TEXT NOT NULL DEFAULT 'open',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS content_sources (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,url TEXT NOT NULL,license TEXT NOT NULL,attribution TEXT NOT NULL,imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS example_sentences (id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,source_sentence_id TEXT NOT NULL,text TEXT NOT NULL,cefr_section TEXT NOT NULL,token_count INTEGER NOT NULL,verb_count INTEGER NOT NULL,noun_count INTEGER NOT NULL,adjective_count INTEGER NOT NULL,adposition_count INTEGER NOT NULL,has_subordination BOOLEAN NOT NULL DEFAULT FALSE,difficulty_score INTEGER NOT NULL,metadata_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(source_id,source_sentence_id));
    CREATE TABLE IF NOT EXISTS exercise_items (id TEXT PRIMARY KEY,example_id TEXT NOT NULL REFERENCES example_sentences(id) ON DELETE CASCADE,cefr_section TEXT NOT NULL,exercise_type TEXT NOT NULL,prompt TEXT NOT NULL,answer TEXT NOT NULL,choices_json JSONB,explanation TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS exam_questions (id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,external_id TEXT NOT NULL,exam_name TEXT NOT NULL,cefr_section TEXT NOT NULL,skill TEXT NOT NULL,prompt TEXT NOT NULL,context TEXT,choices_json JSONB,answer TEXT,explanation TEXT,source_url TEXT NOT NULL,metadata_json JSONB NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(source_id,external_id));
    CREATE TABLE IF NOT EXISTS learning_topics (id TEXT PRIMARY KEY,cefr_section TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,item TEXT NOT NULL,source_id TEXT REFERENCES content_sources(id) ON DELETE SET NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(cefr_section,category,title,item));
    CREATE TABLE IF NOT EXISTS tv5_exercises (id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,external_id TEXT NOT NULL,cefr_section TEXT NOT NULL,title TEXT NOT NULL,exercise_url TEXT NOT NULL,metadata_json JSONB NOT NULL,imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(source_id,external_id));
    CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS cefr_levels (code TEXT PRIMARY KEY, ordinal INTEGER NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS concepts (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES concepts(id) ON DELETE SET NULL, concept_type TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT, level_code TEXT REFERENCES cefr_levels(code), status TEXT NOT NULL DEFAULT 'active', metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, label TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS content_batches (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT, idempotency_key TEXT NOT NULL UNIQUE, schema_version TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'received', item_count INTEGER NOT NULL DEFAULT 0, validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ);
    CREATE TABLE IF NOT EXISTS content_items (id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT, external_id TEXT NOT NULL, item_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending_review', cefr_level TEXT NOT NULL REFERENCES cefr_levels(code), cefr_method TEXT NOT NULL, cefr_confidence REAL, difficulty_band TEXT, difficulty_score REAL, exact_hash TEXT NOT NULL, duplicate_group_id TEXT, current_revision INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(source_id, external_id), UNIQUE(source_id, exact_hash));
    CREATE TABLE IF NOT EXISTS content_revisions (item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, revision INTEGER NOT NULL, batch_id TEXT REFERENCES content_batches(id) ON DELETE SET NULL, title TEXT, prompt TEXT NOT NULL, instructions TEXT, context TEXT, response_json JSONB NOT NULL, evaluation_json JSONB NOT NULL, metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(item_id, revision));
    CREATE TABLE IF NOT EXISTS content_concepts (item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE RESTRICT, PRIMARY KEY(item_id, concept_id));
    CREATE TABLE IF NOT EXISTS content_tags (item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT, PRIMARY KEY(item_id, tag_id));
    CREATE TABLE IF NOT EXISTS media_assets (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, kind TEXT NOT NULL, url TEXT NOT NULL, duration_seconds REAL, transcript TEXT, checksum TEXT, metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb);
    CREATE TABLE IF NOT EXISTS content_duplicates (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, candidate_item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, similarity REAL NOT NULL, decision TEXT NOT NULL DEFAULT 'pending', UNIQUE(item_id, candidate_item_id));
    CREATE TABLE IF NOT EXISTS content_reviews (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, action TEXT NOT NULL, reviewer TEXT, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS content_api_keys (id TEXT PRIMARY KEY, key_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, scopes TEXT[] NOT NULL, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS learning_attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT, revision INTEGER NOT NULL, response_json JSONB NOT NULL, evaluation_json JSONB NOT NULL, score REAL, duration_ms INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS learner_item_state (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), interval_days REAL NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5, repetitions INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, last_result TEXT, last_attempt_at TIMESTAMPTZ, PRIMARY KEY(user_id, item_id));
    CREATE TABLE IF NOT EXISTS learner_concept_mastery (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE, mastery REAL NOT NULL DEFAULT 0, confidence REAL NOT NULL DEFAULT 0, evidence_count INTEGER NOT NULL DEFAULT 0, model_version TEXT NOT NULL DEFAULT 'v1', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, concept_id));
    ALTER TABLE content_concepts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE content_concepts ADD COLUMN IF NOT EXISTS weight REAL NOT NULL DEFAULT 1.0;
    CREATE TABLE IF NOT EXISTS concept_prerequisites (concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE, prerequisite_concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(concept_id, prerequisite_concept_id), CHECK (concept_id <> prerequisite_concept_id));
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS correct BOOLEAN;
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS attempt_number INTEGER;
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS session_id TEXT;
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS hint_used BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS total_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS correct_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS consecutive_correct INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS consecutive_incorrect INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMPTZ;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS last_correct_at TIMESTAMPTZ;
    ALTER TABLE learner_concept_mastery ADD COLUMN IF NOT EXISTS last_incorrect_at TIMESTAMPTZ;
    CREATE INDEX IF NOT EXISTS content_items_status_level_idx ON content_items(status, cefr_level, item_type);
    CREATE INDEX IF NOT EXISTS learner_item_due_idx ON learner_item_state(user_id, due_at);
    CREATE INDEX IF NOT EXISTS attempts_user_time_idx ON learning_attempts(user_id, created_at DESC);
  `);
  for (const [code, ordinal] of [['A1',1],['A2',2],['B1',3],['B2',4],['C1',5],['C2',6]]) await query('INSERT INTO cefr_levels(code,ordinal) VALUES(?,?) ON CONFLICT(code) DO NOTHING', [code, ordinal]);
  await query("INSERT INTO schema_migrations(version) VALUES('content-v1') ON CONFLICT(version) DO NOTHING");
  if (process.env.CONTENT_API_KEY) {
    const hash = createHash('sha256').update(process.env.CONTENT_API_KEY).digest('hex');
    await query("INSERT INTO content_api_keys(id,key_hash,name,scopes) VALUES(?,?,?,?) ON CONFLICT(key_hash) DO NOTHING", [createHash('sha256').update(`id:${hash}`).digest('hex'), hash, 'environment-content-key', ['content:write', 'content:review']]);
  }
}
export async function createProfileForUser(userId) { await query('INSERT INTO learner_profiles (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING', [userId]); }
