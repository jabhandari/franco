-- Franco uses opaque Bearer sessions validated by the Node API, not
-- Supabase Auth. These tables have no supported direct Data API clients.
-- Default-deny RLS protects learner data and credential/session hashes from
-- anon/authenticated; the existing postgres backend role bypasses RLS.
-- Do not FORCE RLS or add auth.uid() policies for custom session tokens.
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
