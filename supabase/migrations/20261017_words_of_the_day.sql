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
