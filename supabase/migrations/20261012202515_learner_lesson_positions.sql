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
