-- FRA-44: daily activity rollup behind the streak feature and the
-- Progress heatmap. One row per learner per active (learner-local) day.
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS public.learner_activity_days (
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  first_activity_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, activity_date)
);

-- One-time backfill from the attempts history so existing learners do not
-- start from zero. Dates are derived in UTC (one-time approximation);
-- rows written by the attempts handler use the learner's timezone.
-- Idempotent: ON CONFLICT DO NOTHING leaves live rows untouched.
INSERT INTO public.learner_activity_days (user_id, activity_date, attempts_count, first_activity_at, last_activity_at)
SELECT user_id, (created_at AT TIME ZONE 'UTC')::date, COUNT(*)::int, MIN(created_at), MAX(created_at)
FROM public.learning_attempts
GROUP BY user_id, (created_at AT TIME ZONE 'UTC')::date
ON CONFLICT (user_id, activity_date) DO NOTHING;
