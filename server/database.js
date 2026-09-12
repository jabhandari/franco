import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(rootDir, 'data');
const dbPath = join(dataDir, 'franco.sqlite');

mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS learner_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      current_level TEXT,
      learning_goal TEXT,
      placement_status TEXT NOT NULL DEFAULT 'not_started',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_skill_estimates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cefr_level TEXT NOT NULL,
      skill TEXT NOT NULL,
      strength REAL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, cefr_level, skill)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT,
      concept_id TEXT,
      skill TEXT,
      result TEXT,
      answer TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept_id TEXT,
      prompt TEXT,
      correction TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      license TEXT NOT NULL,
      attribution TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS example_sentences (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
      source_sentence_id TEXT NOT NULL,
      text TEXT NOT NULL,
      cefr_section TEXT NOT NULL,
      token_count INTEGER NOT NULL,
      verb_count INTEGER NOT NULL,
      noun_count INTEGER NOT NULL,
      adjective_count INTEGER NOT NULL,
      adposition_count INTEGER NOT NULL,
      has_subordination INTEGER NOT NULL DEFAULT 0,
      difficulty_score INTEGER NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, source_sentence_id)
    );

    CREATE TABLE IF NOT EXISTS exercise_items (
      id TEXT PRIMARY KEY,
      example_id TEXT NOT NULL REFERENCES example_sentences(id) ON DELETE CASCADE,
      cefr_section TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      answer TEXT NOT NULL,
      choices_json TEXT,
      explanation TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
      external_id TEXT NOT NULL,
      exam_name TEXT NOT NULL,
      cefr_section TEXT NOT NULL,
      skill TEXT NOT NULL,
      prompt TEXT NOT NULL,
      context TEXT,
      choices_json TEXT,
      answer TEXT,
      explanation TEXT,
      source_url TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, external_id)
    );

    CREATE TABLE IF NOT EXISTS learning_topics (
      id TEXT PRIMARY KEY,
      cefr_section TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      item TEXT NOT NULL,
      source_id TEXT REFERENCES content_sources(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(cefr_section, category, title, item)
    );

    CREATE TABLE IF NOT EXISTS tv5_exercises (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
      external_id TEXT NOT NULL,
      cefr_section TEXT NOT NULL,
      title TEXT NOT NULL,
      exercise_url TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, external_id)
    );
  `);
}

export function createProfileForUser(userId) {
  db.prepare(`
    INSERT OR IGNORE INTO learner_profiles (user_id)
    VALUES (?)
  `).run(userId);
}
