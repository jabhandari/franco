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
