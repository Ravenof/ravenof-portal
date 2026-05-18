-- =============================================================================
-- RAVENOF: Username Change History v1
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- Idempotent — safe to run multiple times
-- =============================================================================

-- ─── 1. Add columns to profiles ──────────────────────────────────────────────
-- username_changed_at: timestamp of last username change (nullable = never changed)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at         TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_username           TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_username_visible_until TIMESTAMPTZ DEFAULT NULL;

-- ─── 2. Create profile_username_history table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_username_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_username TEXT        NOT NULL,
  new_username TEXT        NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visible_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_username_history_user_id ON public.profile_username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_username_history_changed_at ON public.profile_username_history(changed_at DESC);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.profile_username_history ENABLE ROW LEVEL SECURITY;

-- Users can read their own history
DROP POLICY IF EXISTS "username_history_own_read" ON public.profile_username_history;
CREATE POLICY "username_history_own_read"
  ON public.profile_username_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all history
DROP POLICY IF EXISTS "username_history_admin_read" ON public.profile_username_history;
CREATE POLICY "username_history_admin_read"
  ON public.profile_username_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'event_moderator')
    )
  );

-- Users can INSERT their own history rows (server action validates all logic before inserting)
DROP POLICY IF EXISTS "username_history_own_insert" ON public.profile_username_history;
CREATE POLICY "username_history_own_insert"
  ON public.profile_username_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE from client

-- ─── 4. Comment ──────────────────────────────────────────────────────────────
COMMENT ON TABLE public.profile_username_history IS
  'Audit log of username changes. Rows inserted via server action using service role.';
COMMENT ON COLUMN public.profiles.username_changed_at IS
  'When the user last changed their username. NULL = never changed.';
COMMENT ON COLUMN public.profiles.previous_username IS
  'The username before the last change. Cleared after visible_until expires server-side.';
COMMENT ON COLUMN public.profiles.previous_username_visible_until IS
  'Until when to show the previous_username on public profiles (30 days from change).';

-- =============================================================================
-- DONE — next: run server action changeUsername to test end-to-end
-- =============================================================================
