-- Branching route data stays private with the learner's existing server-owned puzzle runs.
ALTER TABLE public.puzzle_runs ADD COLUMN IF NOT EXISTS expedition_state JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.puzzle_runs DROP CONSTRAINT IF EXISTS puzzle_runs_game_check;
ALTER TABLE public.puzzle_runs ADD CONSTRAINT puzzle_runs_game_check CHECK (game IN ('french_rush','verb_sprint','french_expedition'));
