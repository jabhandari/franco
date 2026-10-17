-- FRA-146: a two-seat race is owned and advanced by the Node API. The client
-- uses Franco bearer sessions or a hashed guest token, never direct Data API
-- table access. Questions are pinned in run order when the room starts.
CREATE TABLE IF NOT EXISTS public.race_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code COLLATE "C" ~ '^[0-9A-Za-z]{8}$'),
  host_player_id TEXT,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','live','finished','expired')),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config_json) = 'object'),
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(question_ids) = 'array'),
  choice_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS public.race_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.race_rooms(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 40),
  player_token_hash TEXT UNIQUE,
  seat SMALLINT NOT NULL CHECK (seat IN (1,2)),
  current_index INTEGER NOT NULL DEFAULT 0 CHECK (current_index >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  lives_left SMALLINT NOT NULL CHECK (lives_left = -1 OR lives_left BETWEEN 0 AND 5),
  answer_history_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(answer_history_json) = 'array'),
  finished_at TIMESTAMPTZ,
  forfeited_at TIMESTAMPTZ,
  final_score INTEGER CHECK (final_score >= 0),
  UNIQUE (room_id,seat)
);

-- A signed-in learner may occupy only one seat; NULL guest user IDs remain
-- unrestricted and are instead identified by their unique token hash.
CREATE UNIQUE INDEX IF NOT EXISTS race_players_room_user_uidx
  ON public.race_players(room_id,user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS race_rooms_status_expiry_idx
  ON public.race_rooms(status,expires_at);
CREATE INDEX IF NOT EXISTS race_players_room_idx
  ON public.race_players(room_id,seat);

DO $$ BEGIN
  ALTER TABLE public.race_rooms ADD CONSTRAINT race_rooms_host_player_fkey
    FOREIGN KEY (host_player_id) REFERENCES public.race_players(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No anon/authenticated policies: custom Franco sessions are verified by the
-- backend, and the backend PostgreSQL role retains its existing access.
ALTER TABLE public.race_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_players ENABLE ROW LEVEL SECURITY;
