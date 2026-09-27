-- Learner content reports. A report flags a published (or approved) item as
-- suspect; REPORT_THRESHOLD reports from distinct users auto-demote the item
-- back to pending_review for human re-review. Run once in the Supabase SQL
-- editor (or via psql) — safe to re-run.
CREATE TABLE IF NOT EXISTS public.content_reports (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_content_reports_item ON public.content_reports(item_id);
