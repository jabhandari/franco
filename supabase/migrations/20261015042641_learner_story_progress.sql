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
