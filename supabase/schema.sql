CREATE TABLE IF NOT EXISTS public.curriculum_editorial_reviews (
  id TEXT PRIMARY KEY, topic_id TEXT NOT NULL, version INTEGER NOT NULL,
  pack_hash TEXT NOT NULL, state TEXT NOT NULL,
  reviewer TEXT NOT NULL, key_id TEXT NOT NULL, note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS curriculum_review_version_idx
  ON public.curriculum_editorial_reviews(topic_id,version,pack_hash,created_at);
ALTER TABLE public.curriculum_editorial_reviews ENABLE ROW LEVEL SECURITY;

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id text NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  first_name text,
  last_name text,
  email_verified boolean NOT NULL DEFAULT false,
  google_sub text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.oauth_codes (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.email_tokens (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('verify', 'reset')),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX email_tokens_user_type_idx ON public.email_tokens(user_id, type, created_at DESC);
CREATE TABLE public.auth_email_requests (
  id text PRIMARY KEY,
  scope_hash text NOT NULL,
  ip_hash text,
  scope text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX auth_email_requests_scope_time_idx ON public.auth_email_requests(scope_hash, created_at DESC);
CREATE INDEX auth_email_requests_ip_time_idx ON public.auth_email_requests(ip_hash, created_at DESC);
CREATE INDEX auth_email_requests_created_idx ON public.auth_email_requests(created_at);
CREATE TABLE public.sessions (
  id text NOT NULL,
  user_id text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.learner_profiles (
  user_id text NOT NULL,
  current_level text,
  learning_goal text,
  placement_status text NOT NULL DEFAULT 'not_started'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT learner_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT learner_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_skill_estimates (
  id text NOT NULL,
  user_id text NOT NULL,
  cefr_level text NOT NULL,
  skill text NOT NULL,
  strength real,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_skill_estimates_pkey PRIMARY KEY (id),
  CONSTRAINT user_skill_estimates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.attempts (
  id text NOT NULL,
  user_id text NOT NULL,
  exercise_id text,
  concept_id text,
  skill text,
  result text,
  answer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT attempts_pkey PRIMARY KEY (id),
  CONSTRAINT attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.mistakes (
  id text NOT NULL,
  user_id text NOT NULL,
  concept_id text,
  prompt text,
  correction text,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mistakes_pkey PRIMARY KEY (id),
  CONSTRAINT mistakes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.content_sources (
  id text NOT NULL,
  name text NOT NULL UNIQUE,
  url text NOT NULL,
  license text NOT NULL,
  attribution text NOT NULL,
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_sources_pkey PRIMARY KEY (id)
);
CREATE TABLE public.example_sentences (
  id text NOT NULL,
  source_id text NOT NULL,
  source_sentence_id text NOT NULL,
  text text NOT NULL,
  cefr_section text NOT NULL,
  token_count integer NOT NULL,
  verb_count integer NOT NULL,
  noun_count integer NOT NULL,
  adjective_count integer NOT NULL,
  adposition_count integer NOT NULL,
  has_subordination boolean NOT NULL DEFAULT false,
  difficulty_score integer NOT NULL,
  metadata_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT example_sentences_pkey PRIMARY KEY (id),
  CONSTRAINT example_sentences_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.content_sources(id)
);
CREATE TABLE public.exercise_items (
  id text NOT NULL,
  example_id text NOT NULL,
  cefr_section text NOT NULL,
  exercise_type text NOT NULL,
  prompt text NOT NULL,
  answer text NOT NULL,
  choices_json jsonb,
  explanation text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exercise_items_pkey PRIMARY KEY (id),
  CONSTRAINT exercise_items_example_id_fkey FOREIGN KEY (example_id) REFERENCES public.example_sentences(id)
);
CREATE TABLE public.exam_questions (
  id text NOT NULL,
  source_id text NOT NULL,
  external_id text NOT NULL,
  exam_name text NOT NULL,
  cefr_section text NOT NULL,
  skill text NOT NULL,
  prompt text NOT NULL,
  context text,
  choices_json jsonb,
  answer text,
  explanation text,
  source_url text NOT NULL,
  metadata_json jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exam_questions_pkey PRIMARY KEY (id),
  CONSTRAINT exam_questions_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.content_sources(id)
);
CREATE TABLE public.learning_topics (
  id text NOT NULL,
  cefr_section text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  item text NOT NULL,
  source_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT learning_topics_pkey PRIMARY KEY (id),
  CONSTRAINT learning_topics_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.content_sources(id)
);
CREATE TABLE public.tv5_exercises (
  id text NOT NULL,
  source_id text NOT NULL,
  external_id text NOT NULL,
  cefr_section text NOT NULL,
  title text NOT NULL,
  exercise_url text NOT NULL,
  metadata_json jsonb NOT NULL,
  imported_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tv5_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT tv5_exercises_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.content_sources(id)
);
CREATE TABLE public.schema_migrations (
  version text NOT NULL,
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
CREATE TABLE public.cefr_levels (
  code text NOT NULL,
  ordinal integer NOT NULL UNIQUE,
  CONSTRAINT cefr_levels_pkey PRIMARY KEY (code)
);
CREATE TABLE public.concepts (
  id text NOT NULL,
  parent_id text,
  concept_type text NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  level_code text,
  status text NOT NULL DEFAULT 'active'::text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT concepts_pkey PRIMARY KEY (id),
  CONSTRAINT concepts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.concepts(id),
  CONSTRAINT concepts_level_code_fkey FOREIGN KEY (level_code) REFERENCES public.cefr_levels(code)
);
CREATE TABLE public.tags (
  id text NOT NULL,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.content_batches (
  id text NOT NULL,
  source_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  schema_version text NOT NULL,
  status text NOT NULL DEFAULT 'received'::text,
  item_count integer NOT NULL DEFAULT 0,
  validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT content_batches_pkey PRIMARY KEY (id),
  CONSTRAINT content_batches_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.content_sources(id)
);
CREATE TABLE public.content_items (
  id text NOT NULL,
  source_id text NOT NULL,
  external_id text NOT NULL,
  item_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review'::text,
  cefr_level text NOT NULL,
  cefr_method text NOT NULL,
  cefr_confidence real,
  difficulty_band text,
  difficulty_score real,
  exact_hash text NOT NULL,
  duplicate_group_id text,
  current_revision integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_items_pkey PRIMARY KEY (id),
  CONSTRAINT content_items_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.content_sources(id),
  CONSTRAINT content_items_cefr_level_fkey FOREIGN KEY (cefr_level) REFERENCES public.cefr_levels(code)
);
CREATE TABLE public.content_revisions (
  item_id text NOT NULL,
  revision integer NOT NULL,
  batch_id text,
  title text,
  prompt text NOT NULL,
  instructions text,
  context text,
  response_json jsonb NOT NULL,
  evaluation_json jsonb NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_revisions_pkey PRIMARY KEY (item_id, revision),
  CONSTRAINT content_revisions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id),
  CONSTRAINT content_revisions_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.content_batches(id)
);
CREATE TABLE public.content_concepts (
  item_id text NOT NULL,
  concept_id text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  weight real NOT NULL DEFAULT 1.0,
  CONSTRAINT content_concepts_pkey PRIMARY KEY (item_id, concept_id),
  CONSTRAINT content_concepts_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id),
  CONSTRAINT content_concepts_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id)
);
CREATE TABLE public.content_tags (
  item_id text NOT NULL,
  tag_id text NOT NULL,
  CONSTRAINT content_tags_pkey PRIMARY KEY (item_id, tag_id),
  CONSTRAINT content_tags_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id),
  CONSTRAINT content_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);
CREATE TABLE public.media_assets (
  id text NOT NULL,
  item_id text NOT NULL,
  kind text NOT NULL,
  url text NOT NULL,
  duration_seconds real,
  transcript text,
  checksum text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT media_assets_pkey PRIMARY KEY (id),
  CONSTRAINT media_assets_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id)
);
CREATE TABLE public.content_duplicates (
  id text NOT NULL,
  item_id text NOT NULL,
  candidate_item_id text NOT NULL,
  similarity real NOT NULL,
  decision text NOT NULL DEFAULT 'pending'::text,
  CONSTRAINT content_duplicates_pkey PRIMARY KEY (id),
  CONSTRAINT content_duplicates_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id),
  CONSTRAINT content_duplicates_candidate_item_id_fkey FOREIGN KEY (candidate_item_id) REFERENCES public.content_items(id)
);
CREATE TABLE public.content_reviews (
  id text NOT NULL,
  item_id text NOT NULL,
  action text NOT NULL,
  reviewer text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT content_reviews_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id)
);
CREATE TABLE public.content_api_keys (
  id text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  name text NOT NULL,
  scopes ARRAY NOT NULL,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_api_keys_pkey PRIMARY KEY (id)
);
CREATE TABLE public.learning_attempts (
  id text NOT NULL,
  user_id text NOT NULL,
  item_id text,
  item_kind text NOT NULL DEFAULT 'content_item'::text,
  legacy_ref text,
  revision integer NOT NULL,
  response_json jsonb NOT NULL,
  evaluation_json jsonb NOT NULL,
  score real,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  correct boolean,
  attempt_number integer,
  session_id text,
  hint_used boolean NOT NULL DEFAULT false,
  CONSTRAINT learning_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT learning_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT learning_attempts_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id)
);
CREATE TABLE public.speech_transcriptions (
  id text NOT NULL,
  user_id text NOT NULL,
  item_id text,
  model text NOT NULL,
  duration_seconds double precision NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  provider_request_id text,
  error_code text,
  transcript_hash text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT speech_transcriptions_pkey PRIMARY KEY (id),
  CONSTRAINT speech_transcriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT speech_transcriptions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id),
  CONSTRAINT speech_transcriptions_duration_check CHECK (duration_seconds > 0),
  CONSTRAINT speech_transcriptions_status_check CHECK (status IN ('pending', 'succeeded', 'no_speech', 'provider_error'))
);
CREATE TABLE public.learner_item_state (
  user_id text NOT NULL,
  item_id text NOT NULL,
  due_at timestamp with time zone NOT NULL DEFAULT now(),
  interval_days real NOT NULL DEFAULT 0,
  ease real NOT NULL DEFAULT 2.5,
  repetitions integer NOT NULL DEFAULT 0,
  lapses integer NOT NULL DEFAULT 0,
  last_result text,
  last_attempt_at timestamp with time zone,
  CONSTRAINT learner_item_state_pkey PRIMARY KEY (user_id, item_id),
  CONSTRAINT learner_item_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT learner_item_state_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.content_items(id)
);
CREATE TABLE public.learner_concept_mastery (
  user_id text NOT NULL,
  concept_id text NOT NULL,
  mastery real NOT NULL DEFAULT 0,
  confidence real NOT NULL DEFAULT 0,
  evidence_count integer NOT NULL DEFAULT 0,
  model_version text NOT NULL DEFAULT 'v1'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  total_attempts integer NOT NULL DEFAULT 0,
  correct_attempts integer NOT NULL DEFAULT 0,
  consecutive_correct integer NOT NULL DEFAULT 0,
  consecutive_incorrect integer NOT NULL DEFAULT 0,
  last_practiced_at timestamp with time zone,
  last_correct_at timestamp with time zone,
  last_incorrect_at timestamp with time zone,
  CONSTRAINT learner_concept_mastery_pkey PRIMARY KEY (user_id, concept_id),
  CONSTRAINT learner_concept_mastery_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT learner_concept_mastery_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id)
);
CREATE TABLE public.concept_prerequisites (
  concept_id text NOT NULL,
  prerequisite_concept_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT concept_prerequisites_pkey PRIMARY KEY (concept_id, prerequisite_concept_id),
  CONSTRAINT concept_prerequisites_concept_id_fkey FOREIGN KEY (concept_id) REFERENCES public.concepts(id),
  CONSTRAINT concept_prerequisites_prerequisite_concept_id_fkey FOREIGN KEY (prerequisite_concept_id) REFERENCES public.concepts(id)
);CREATE TABLE public.learner_activity_days (
  user_id text NOT NULL,
  activity_date date NOT NULL,
  attempts_count integer NOT NULL DEFAULT 0,
  first_activity_at timestamp with time zone NOT NULL,
  last_activity_at timestamp with time zone NOT NULL,
  CONSTRAINT learner_activity_days_pkey PRIMARY KEY (user_id, activity_date),
  CONSTRAINT learner_activity_days_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- API-owned data is private; custom session/scoped-key checks live in Node.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_item_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_activity_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speech_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.example_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv5_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cefr_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_prerequisites ENABLE ROW LEVEL SECURITY;

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

-- Private server-owned runs for both puzzle games.
CREATE TABLE IF NOT EXISTS public.puzzle_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  game TEXT NOT NULL DEFAULT 'french_rush' CHECK (game IN ('french_rush','verb_sprint','french_expedition')),
  lives_total SMALLINT NOT NULL CHECK (lives_total IN (1,3,5)),
  lives_left SMALLINT NOT NULL CHECK (lives_left BETWEEN 0 AND 5),
  minutes SMALLINT CHECK (minutes IN (3,5)),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score>=0),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count>=0),
  combo INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished','abandoned')),
  end_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_item_id TEXT REFERENCES public.content_items(id) ON DELETE SET NULL,
  current_item_revision INTEGER,
  current_verb_id TEXT,

  expedition_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  seen_item_ids TEXT[] NOT NULL DEFAULT '{}',
  choice_secret TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS puzzle_runs_user_recent_idx ON public.puzzle_runs(user_id,started_at DESC);
CREATE INDEX IF NOT EXISTS puzzle_runs_user_best_idx ON public.puzzle_runs(user_id,lives_total,minutes,score DESC);
CREATE INDEX IF NOT EXISTS puzzle_runs_game_best_idx ON public.puzzle_runs(user_id,game,score DESC);
ALTER TABLE public.puzzle_runs ENABLE ROW LEVEL SECURITY;
-- FRA-146 race rooms and their two seats are private server-owned state.
-- The ordered question list is pinned at start; answer history lets a player
-- reconnect without revealing another player's unsubmitted answers.
CREATE TABLE IF NOT EXISTS public.race_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code COLLATE "C" ~ '^[0-9A-Za-z]{8}$'),
  host_player_id TEXT,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','live','finished','expired')),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config_json) = 'object'),
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(question_ids) = 'array'),
  choice_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS public.race_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.race_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 40),
  player_token_hash TEXT UNIQUE,
  seat SMALLINT NOT NULL CHECK (seat IN (1,2)),
  current_index INTEGER NOT NULL DEFAULT 0 CHECK (current_index >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  lives_left SMALLINT NOT NULL CHECK (lives_left = -1 OR lives_left BETWEEN 0 AND 5),
  answer_history_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(answer_history_json) = 'array'),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  forfeited_at TIMESTAMPTZ,
  final_score INTEGER CHECK (final_score >= 0),
  UNIQUE (room_id,seat)
);
CREATE UNIQUE INDEX IF NOT EXISTS race_players_room_user_uidx
  ON public.race_players(room_id,user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS race_rooms_status_expiry_idx
  ON public.race_rooms(status,expires_at);
CREATE INDEX IF NOT EXISTS race_players_room_idx
  ON public.race_players(room_id,seat);
ALTER TABLE public.race_rooms ADD CONSTRAINT race_rooms_host_player_fkey
  FOREIGN KEY (host_player_id) REFERENCES public.race_players(id) ON DELETE SET NULL;
ALTER TABLE public.race_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_players ENABLE ROW LEVEL SECURITY;
-- Lessons, reusable concepts, question banks and learner attempts stay separate.
CREATE TABLE IF NOT EXISTS public.curriculum_lessons (
  topic_id TEXT PRIMARY KEY REFERENCES public.concepts(slug),
  review_status TEXT NOT NULL DEFAULT 'draft' CHECK (review_status IN
    ('draft','generated','factual_review','language_review','license_check','approved','published','revision_needed')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  pack_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.curriculum_questions (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES public.curriculum_lessons(topic_id),
  section TEXT NOT NULL CHECK (section IN ('recognition','guided_production','mastery')),
  position INTEGER NOT NULL,
  question_json JSONB NOT NULL,
  UNIQUE(topic_id,section,position)
);
ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_questions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.learner_story_progress (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  story_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  state TEXT NOT NULL DEFAULT 'current' CHECK (state IN ('current','completed','skipped')),
  answered_question_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id,story_id)
);
-- Franco uses opaque server sessions, not Supabase Auth JWTs. Only the trusted
-- backend connection accesses this table; no browser/Data API policy is granted.
ALTER TABLE public.learner_story_progress ENABLE ROW LEVEL SECURITY;

-- FRA-153/154: Words of the Day — word bank + per-learner daily state.
-- word_practice_answers is deliberately separate from learning_attempts and
-- learner_activity_days: word practice never counts toward the streak.
CREATE TABLE IF NOT EXISTS public.vocab_words (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  gloss TEXT NOT NULL,
  part_of_speech TEXT NOT NULL CHECK (part_of_speech IN ('noun','verb','adjective','adverb')),
  example_fr TEXT NOT NULL,
  example_en TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (word, level)
);
CREATE INDEX IF NOT EXISTS vocab_words_level_idx ON public.vocab_words(level, id);

CREATE TABLE IF NOT EXISTS public.daily_word_sets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2')),
  word_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, local_date)
);

CREATE TABLE IF NOT EXISTS public.user_word_history (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  word_id TEXT NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  served_date DATE NOT NULL,
  is_recycled BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, word_id)
);

CREATE TABLE IF NOT EXISTS public.word_practice_answers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  word_id TEXT NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('meaning','word','blank')),
  correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, local_date, question_id)
);
CREATE INDEX IF NOT EXISTS word_practice_answers_user_date_idx ON public.word_practice_answers(user_id, local_date);

-- Franco uses opaque server sessions, not Supabase Auth JWTs. Only the trusted
-- backend connection accesses these tables; no browser/Data API policy is granted.
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_word_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_practice_answers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.learner_subtopic_progress (
 user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 topic_id TEXT NOT NULL REFERENCES public.concepts(slug) ON DELETE CASCADE,
 subtopic_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('in_progress','completed')),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(user_id,topic_id,subtopic_id)
);
-- Franco uses opaque sessions through the API, not Supabase Auth. Direct Data
-- API access has no policy; the trusted server scopes every query to user_id.
ALTER TABLE public.learner_subtopic_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learner_subtopic_progress FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON public.learner_subtopic_progress FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON public.learner_subtopic_progress FROM authenticated; END IF;
END $$;
