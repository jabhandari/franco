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
