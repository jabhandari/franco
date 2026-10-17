CREATE TABLE IF NOT EXISTS public.curriculum_editorial_reviews (
  id TEXT PRIMARY KEY, topic_id TEXT NOT NULL, version INTEGER NOT NULL,
  pack_hash TEXT NOT NULL, state TEXT NOT NULL,
  reviewer TEXT NOT NULL, key_id TEXT NOT NULL, note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS curriculum_review_version_idx
  ON public.curriculum_editorial_reviews(topic_id,version,pack_hash,created_at);
ALTER TABLE public.curriculum_editorial_reviews ENABLE ROW LEVEL SECURITY;
