import { DatabaseSync } from 'node:sqlite';

// The local corpus importers remain SQLite-only for offline development. Production
// content enters through /api/content/v1/batches and never receives DB access.
export const db = new DatabaseSync('data/franco.sqlite');
export function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS content_sources (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,url TEXT NOT NULL,license TEXT NOT NULL,attribution TEXT NOT NULL,imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS example_sentences (id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,source_sentence_id TEXT NOT NULL,text TEXT NOT NULL,cefr_section TEXT NOT NULL,token_count INTEGER NOT NULL,verb_count INTEGER NOT NULL,noun_count INTEGER NOT NULL,adjective_count INTEGER NOT NULL,adposition_count INTEGER NOT NULL,has_subordination INTEGER NOT NULL DEFAULT 0,difficulty_score INTEGER NOT NULL,metadata_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(source_id,source_sentence_id));
    CREATE TABLE IF NOT EXISTS exercise_items (id TEXT PRIMARY KEY,example_id TEXT NOT NULL REFERENCES example_sentences(id) ON DELETE CASCADE,cefr_section TEXT NOT NULL,exercise_type TEXT NOT NULL,prompt TEXT NOT NULL,answer TEXT NOT NULL,choices_json TEXT,explanation TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS exam_questions (id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,external_id TEXT NOT NULL,exam_name TEXT NOT NULL,cefr_section TEXT NOT NULL,skill TEXT NOT NULL,prompt TEXT NOT NULL,context TEXT,choices_json TEXT,answer TEXT,explanation TEXT,source_url TEXT NOT NULL,metadata_json TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(source_id,external_id));
    CREATE TABLE IF NOT EXISTS learning_topics (id TEXT PRIMARY KEY,cefr_section TEXT NOT NULL,category TEXT NOT NULL,title TEXT NOT NULL,item TEXT NOT NULL,source_id TEXT REFERENCES content_sources(id) ON DELETE SET NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(cefr_section,category,title,item));
    CREATE TABLE IF NOT EXISTS tv5_exercises (id TEXT PRIMARY KEY,source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,external_id TEXT NOT NULL,cefr_section TEXT NOT NULL,title TEXT NOT NULL,exercise_url TEXT NOT NULL,metadata_json TEXT NOT NULL,imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(source_id,external_id));`);
}
