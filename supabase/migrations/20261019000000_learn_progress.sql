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
