import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';

const connectionString = process.env.DATABASE_URL;
if (!connectionString || connectionString.includes('[YOUR-PASSWORD]')) throw new Error('DATABASE_URL must point to Supabase PostgreSQL.');
export const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: Number(process.env.DB_POOL_SIZE || 5) });
export function query(sql, params = []) { let i = 0; return pool.query(sql.replace(/\?/g, () => `$${++i}`), params).then((r) => r.rows); }
export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    -- FRA-56: first/last name columns. Backfilled from the name column below;
    -- name stays the derived display name ("First Last").
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
    -- Backfill existing users as verified before changing the default for new users.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;
    -- FRA-57: Google account linkage. sub is Google's stable user key; NULL
    -- for password-only accounts. UNIQUE index (NULLs never conflict).
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_uidx ON users(google_sub);
    -- FRA-57: single-use OAuth handoff codes. The callback 302s the SPA with a
    -- 60-second code in the URL fragment instead of the session token, so
    -- bearer tokens never appear in URLs, history, or server logs. The SPA
    -- exchanges the code for a session via POST /api/auth/google/exchange.
    CREATE TABLE IF NOT EXISTS oauth_codes (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,code_hash TEXT NOT NULL UNIQUE,expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    DELETE FROM oauth_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
    CREATE TABLE IF NOT EXISTS email_tokens (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,type TEXT NOT NULL CHECK(type IN ('verify','reset')),expires_at TIMESTAMPTZ NOT NULL,used_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS email_tokens_user_type_idx ON email_tokens(user_id,type,created_at DESC);
    CREATE TABLE IF NOT EXISTS auth_email_requests (id TEXT PRIMARY KEY,scope_hash TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS auth_email_requests_scope_time_idx ON auth_email_requests(scope_hash,created_at DESC);
    ALTER TABLE auth_email_requests ADD COLUMN IF NOT EXISTS ip_hash TEXT;
    ALTER TABLE auth_email_requests ADD COLUMN IF NOT EXISTS scope TEXT;
    CREATE INDEX IF NOT EXISTS auth_email_requests_ip_time_idx ON auth_email_requests(ip_hash,created_at DESC);
    CREATE INDEX IF NOT EXISTS auth_email_requests_created_idx ON auth_email_requests(created_at);
    DELETE FROM auth_email_requests WHERE created_at < NOW() - INTERVAL '2 hours';
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
    CREATE TABLE IF NOT EXISTS puzzle_runs (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,lives_total SMALLINT NOT NULL CHECK(lives_total IN (1,3,5)),lives_left SMALLINT NOT NULL CHECK(lives_left BETWEEN 0 AND 5),minutes SMALLINT CHECK(minutes IN (3,5)),score INTEGER NOT NULL DEFAULT 0 CHECK(score>=0),answered_count INTEGER NOT NULL DEFAULT 0 CHECK(answered_count>=0),status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished','abandoned')),end_reason TEXT,started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),expires_at TIMESTAMPTZ,ended_at TIMESTAMPTZ,current_item_id TEXT REFERENCES content_items(id) ON DELETE SET NULL,current_item_revision INTEGER,seen_item_ids TEXT[] NOT NULL DEFAULT '{}',choice_secret TEXT NOT NULL);
    ALTER TABLE puzzle_runs ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'french_rush';
    ALTER TABLE puzzle_runs ADD COLUMN IF NOT EXISTS combo INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE puzzle_runs ADD COLUMN IF NOT EXISTS best_combo INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE puzzle_runs ADD COLUMN IF NOT EXISTS current_verb_id TEXT;
    DO $$ BEGIN ALTER TABLE puzzle_runs ADD CONSTRAINT puzzle_runs_game_check CHECK (game IN ('french_rush','verb_sprint')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS puzzle_runs_user_recent_idx ON puzzle_runs(user_id,started_at DESC);
    CREATE INDEX IF NOT EXISTS puzzle_runs_user_best_idx ON puzzle_runs(user_id,lives_total,minutes,score DESC);
    CREATE INDEX IF NOT EXISTS puzzle_runs_game_best_idx ON puzzle_runs(user_id,game,score DESC);
    CREATE TABLE IF NOT EXISTS content_api_keys (id TEXT PRIMARY KEY, key_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, scopes TEXT[] NOT NULL, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS learning_attempts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE RESTRICT, revision INTEGER NOT NULL, response_json JSONB NOT NULL, evaluation_json JSONB NOT NULL, score REAL, duration_ms INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE IF NOT EXISTS learner_item_state (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, item_id TEXT NOT NULL REFERENCES content_items(id) ON DELETE CASCADE, due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), interval_days REAL NOT NULL DEFAULT 0, ease REAL NOT NULL DEFAULT 2.5, repetitions INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0, last_result TEXT, last_attempt_at TIMESTAMPTZ, PRIMARY KEY(user_id, item_id));
    CREATE TABLE IF NOT EXISTS learner_concept_mastery (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE, mastery REAL NOT NULL DEFAULT 0, confidence REAL NOT NULL DEFAULT 0, evidence_count INTEGER NOT NULL DEFAULT 0, model_version TEXT NOT NULL DEFAULT 'v1', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id, concept_id));
    ALTER TABLE content_concepts ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE content_concepts ADD COLUMN IF NOT EXISTS weight REAL NOT NULL DEFAULT 1.0;
    CREATE TABLE IF NOT EXISTS concept_prerequisites (concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE, prerequisite_concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(concept_id, prerequisite_concept_id), CHECK (concept_id <> prerequisite_concept_id));
    ALTER TABLE concepts ADD COLUMN IF NOT EXISTS list_order INTEGER;
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
    -- Attempts can reference new-track content_items OR legacy exam_questions /
    -- exercise_items (recorded via item_kind + legacy_ref, item_id NULL).
    ALTER TABLE learning_attempts ALTER COLUMN item_id DROP NOT NULL;
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS item_kind TEXT NOT NULL DEFAULT 'content_item';
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS legacy_ref TEXT;
    -- Nullable for legacy exam/drill attempts; new content attempts snapshot the type.
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS item_type TEXT;
    ALTER TABLE learning_attempts ADD COLUMN IF NOT EXISTS skill_id TEXT;
    UPDATE learning_attempts a SET item_type=i.item_type FROM content_items i WHERE a.item_id=i.id AND a.item_type IS NULL;
    -- Keep the historical item type on attempts, then consolidate the live catalog.
    UPDATE content_items SET item_type='listen_repeat' WHERE item_type IN ('dictation','pronunciation_drill');
    -- The one-time FRA-126 cleanup below clears references to archived items.
    -- Create this table first so a fresh database can run that cleanup.
    CREATE TABLE IF NOT EXISTS speech_transcriptions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,item_id TEXT REFERENCES content_items(id) ON DELETE SET NULL,model TEXT NOT NULL,duration_seconds DOUBLE PRECISION NOT NULL CHECK (duration_seconds > 0),status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','succeeded','no_speech','provider_error')),provider_request_id TEXT,error_code TEXT,transcript_hash TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ);
    -- FRA-126 is a one-time taxonomy change. Old short-answer Free Text has no
    -- live learning flow; old open speaking prompts become freeform content.
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version='fra-126-free-text') THEN
        UPDATE learning_attempts a SET legacy_ref=a.item_id,item_id=NULL,item_kind='archived_free_text'
        FROM content_items i JOIN content_revisions r ON r.item_id=i.id AND r.revision=i.current_revision
        WHERE a.item_id=i.id AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        -- Delete child rows explicitly before the parent DELETE below. migrate()
        -- creates these FKs ON DELETE CASCADE, but databases built from
        -- supabase/schema.sql (the schema of record) define them without
        -- actions — there the parent DELETE would throw and block server
        -- boot. Scoped to the same legacy items; no-ops when none exist.
        DELETE FROM content_concepts c USING content_items i, content_revisions r
        WHERE c.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM content_tags t USING content_items i, content_revisions r
        WHERE t.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM media_assets m USING content_items i, content_revisions r
        WHERE m.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM content_duplicates d USING content_items i, content_revisions r
        WHERE (d.item_id=i.id OR d.candidate_item_id=i.id) AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM content_reviews cr USING content_items i, content_revisions r
        WHERE cr.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM learner_item_state s USING content_items i, content_revisions r
        WHERE s.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        UPDATE speech_transcriptions st SET item_id=NULL FROM content_items i, content_revisions r
        WHERE st.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM content_revisions cr USING content_items i, content_revisions r
        WHERE cr.item_id=i.id AND r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        DELETE FROM content_items i USING content_revisions r
        WHERE r.item_id=i.id AND r.revision=i.current_revision AND i.item_type='free_text'
          AND (r.evaluation_json->>'mode' IN ('normalized_text','exact') OR r.response_json ? 'answer');
        UPDATE content_items SET item_type='free_text' WHERE item_type='speaking_prompt';
        INSERT INTO schema_migrations(version) VALUES('fra-126-free-text');
      END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS attempts_legacy_idx ON learning_attempts(user_id, item_kind, legacy_ref);
    CREATE INDEX IF NOT EXISTS speech_transcriptions_user_time_idx ON speech_transcriptions(user_id,created_at DESC);
    CREATE INDEX IF NOT EXISTS speech_transcriptions_time_idx ON speech_transcriptions(created_at DESC);
    CREATE TABLE IF NOT EXISTS content_feedback_requests (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,model TEXT NOT NULL,estimated_tokens INTEGER NOT NULL,used_tokens INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE INDEX IF NOT EXISTS content_feedback_requests_user_time_idx ON content_feedback_requests(user_id,created_at DESC);
    -- FRA-44: one row per learner per active (learner-local) day, rolled up
    -- from learning_attempts by the attempts handler. Streaks and the
    -- activity heatmap derive from this table at read time.
    CREATE TABLE IF NOT EXISTS learner_activity_days (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, activity_date DATE NOT NULL, attempts_count INTEGER NOT NULL DEFAULT 0, first_activity_at TIMESTAMPTZ NOT NULL, last_activity_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(user_id, activity_date));
    -- One-time backfill so existing learners do not start from zero. Dates
    -- are derived in UTC (a one-time approximation); live rows use the
    -- learner's timezone. Idempotent: DO NOTHING leaves live rows untouched.
    INSERT INTO learner_activity_days(user_id, activity_date, attempts_count, first_activity_at, last_activity_at)
    SELECT user_id, (created_at AT TIME ZONE 'UTC')::date, COUNT(*)::int, MIN(created_at), MAX(created_at)
    FROM learning_attempts GROUP BY user_id, (created_at AT TIME ZONE 'UTC')::date
    ON CONFLICT(user_id, activity_date) DO NOTHING;
-- Resume the actual last-read lesson section across browsers/devices.
CREATE TABLE IF NOT EXISTS public.learner_lesson_positions (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('overview','theory','vocabulary','examples')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(user_id,concept_id)
);
CREATE INDEX IF NOT EXISTS learner_lesson_positions_recent_idx
  ON public.learner_lesson_positions(user_id,updated_at DESC);
ALTER TABLE public.learner_lesson_positions ENABLE ROW LEVEL SECURITY;

    -- Match the private-data migrations on fresh or existing databases.
    DO $$ DECLARE table_name TEXT; BEGIN
      FOREACH table_name IN ARRAY ARRAY['email_tokens','auth_email_requests','users','sessions','learner_profiles','user_skill_estimates','attempts','mistakes','learning_attempts','learner_item_state','learner_concept_mastery','learner_activity_days','speech_transcriptions','content_feedback_requests','content_api_keys','content_reports','content_sources','example_sentences','exercise_items','exam_questions','learning_topics','tv5_exercises','concepts','schema_migrations','cefr_levels','content_batches','content_items','content_concepts','content_revisions','content_tags','tags','media_assets','content_duplicates','content_reviews','concept_prerequisites','puzzle_runs'] LOOP
        IF to_regclass(format('public.%I',table_name)) IS NOT NULL THEN
          EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
        END IF;
      END LOOP;
    END $$;
  `);
  // FRA-56: backfill first_name/last_name for rows created before the columns
  // existed. First token -> first_name, remainder -> last_name; single-token
  // legacy names (e.g. the old email-prefix default) become first_name only.
  // Existing users are otherwise untouched.
  const { splitLegacyName } = await import('./user-names.js');
  for (const row of await query('SELECT id, name FROM users WHERE first_name IS NULL')) {
    const [first, last] = splitLegacyName(row.name);
    await query('UPDATE users SET first_name=?,last_name=? WHERE id=?', [first, last, row.id]);
  }
  for (const [code, ordinal] of [['A1',1],['A2',2],['B1',3],['B2',4],['C1',5],['C2',6]]) await query('INSERT INTO cefr_levels(code,ordinal) VALUES(?,?) ON CONFLICT(code) DO NOTHING', [code, ordinal]);
  await query("INSERT INTO schema_migrations(version) VALUES('content-v1') ON CONFLICT(version) DO NOTHING");
  await pool.query(await readFile(new URL('../supabase/migrations/202610150002_curriculum_editorial.sql', import.meta.url), 'utf8'));
  if (process.env.CONTENT_API_KEY) {
    const hash = createHash('sha256').update(process.env.CONTENT_API_KEY).digest('hex');
    await query("INSERT INTO content_api_keys(id,key_hash,name,scopes) VALUES(?,?,?,?) ON CONFLICT(key_hash) DO NOTHING", [createHash('sha256').update(`id:${hash}`).digest('hex'), hash, 'environment-content-key', ['content:write', 'content:review']]);
  }
}
export async function createProfileForUser(userId) { await query('INSERT INTO learner_profiles (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING', [userId]); }
