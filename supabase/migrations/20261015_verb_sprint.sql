-- One run table, separate records and active runs for each puzzle game.
ALTER TABLE public.puzzle_runs ADD COLUMN IF NOT EXISTS game TEXT NOT NULL DEFAULT 'french_rush';
ALTER TABLE public.puzzle_runs ADD COLUMN IF NOT EXISTS combo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.puzzle_runs ADD COLUMN IF NOT EXISTS best_combo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.puzzle_runs ADD COLUMN IF NOT EXISTS current_verb_id TEXT;
DO $$ BEGIN
  ALTER TABLE public.puzzle_runs ADD CONSTRAINT puzzle_runs_game_check CHECK (game IN ('french_rush', 'verb_sprint'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS puzzle_runs_game_best_idx ON public.puzzle_runs(user_id, game, score DESC);
