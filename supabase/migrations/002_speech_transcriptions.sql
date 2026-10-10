-- Usage ledger for the shared Groq speech project. Safe to re-run.
CREATE TABLE IF NOT EXISTS public.speech_transcriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES public.content_items(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  duration_seconds DOUBLE PRECISION NOT NULL CHECK (duration_seconds > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'no_speech', 'provider_error')),
  provider_request_id TEXT,
  error_code TEXT,
  transcript_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS speech_transcriptions_user_time_idx ON public.speech_transcriptions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS speech_transcriptions_time_idx ON public.speech_transcriptions(created_at DESC);
