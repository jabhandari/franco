ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.users ALTER COLUMN email_verified SET DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('verify', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_tokens_user_type_idx ON public.email_tokens(user_id, type, created_at DESC);
CREATE TABLE IF NOT EXISTS public.auth_email_requests (
  id TEXT PRIMARY KEY,
  scope_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_email_requests_scope_time_idx ON public.auth_email_requests(scope_hash, created_at DESC);
ALTER TABLE public.email_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_email_requests ENABLE ROW LEVEL SECURITY;
