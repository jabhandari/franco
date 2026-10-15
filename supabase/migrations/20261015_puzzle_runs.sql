-- French Rush runs are private to the Node API's bearer-session user.
CREATE TABLE IF NOT EXISTS public.puzzle_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lives_total SMALLINT NOT NULL CHECK (lives_total IN (1, 3, 5)),
  lives_left SMALLINT NOT NULL CHECK (lives_left BETWEEN 0 AND 5),
  minutes SMALLINT CHECK (minutes IN (3, 5)),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  answered_count INTEGER NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
  end_reason TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_item_id TEXT REFERENCES public.content_items(id) ON DELETE SET NULL,
  current_item_revision INTEGER,
  seen_item_ids TEXT[] NOT NULL DEFAULT '{}',
  choice_secret TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS puzzle_runs_user_recent_idx ON public.puzzle_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS puzzle_runs_user_best_idx ON public.puzzle_runs(user_id, lives_total, minutes, score DESC);
ALTER TABLE public.puzzle_runs ENABLE ROW LEVEL SECURITY;
