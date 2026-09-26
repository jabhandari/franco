import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.includes('[YOUR-PASSWORD]')) {
  throw new Error('Set DATABASE_URL to your Supabase PostgreSQL connection string before running this script.');
}

const sqlitePath = join(process.cwd(), 'data', 'franco.sqlite');
if (!existsSync(sqlitePath)) throw new Error('data/franco.sqlite does not exist. Run the content importers first.');

const sqlite = new DatabaseSync(sqlitePath);
const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 2 });

const schema = `
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
`;

const tables = {
  users: ['id','email','name','password_hash','password_salt','created_at'], sessions: ['id','user_id','token_hash','expires_at','created_at'], learner_profiles: ['user_id','current_level','learning_goal','placement_status','created_at','updated_at'], user_skill_estimates: ['id','user_id','cefr_level','skill','strength','updated_at'], attempts: ['id','user_id','exercise_id','concept_id','skill','result','answer','created_at'], mistakes: ['id','user_id','concept_id','prompt','correction','status','created_at'], content_sources: ['id','name','url','license','attribution','imported_at'], example_sentences: ['id','source_id','source_sentence_id','text','cefr_section','token_count','verb_count','noun_count','adjective_count','adposition_count','has_subordination','difficulty_score','metadata_json','created_at'], exercise_items: ['id','example_id','cefr_section','exercise_type','prompt','answer','choices_json','explanation','created_at'], exam_questions: ['id','source_id','external_id','exam_name','cefr_section','skill','prompt','context','choices_json','answer','explanation','source_url','metadata_json','created_at'], learning_topics: ['id','cefr_section','category','title','item','source_id','created_at'], tv5_exercises: ['id','source_id','external_id','cefr_section','title','exercise_url','metadata_json','imported_at']
};

try {
  await pool.query(schema);
  for (const [table, columns] of Object.entries(tables)) {
    const rows = sqlite.prepare(`SELECT ${columns.join(',')} FROM ${table}`).all();
    for (const row of rows) {
      const values = columns.map((column) => {
        const value = row[column];
        if (['metadata_json','choices_json'].includes(column) && value) { try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value); } catch { return column === 'choices_json' ? null : '{}'; } }
        if (column === 'has_subordination') return Boolean(value);
        return value;
      });
      const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
      await pool.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
    }
    console.log(`Migrated ${rows.length} rows into ${table}`);
  }
} finally { await pool.end(); }
