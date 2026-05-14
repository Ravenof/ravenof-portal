-- Fix deck_comments RLS: add UPDATE policy for comment authors
-- Root cause: only admins had UPDATE policy; authors had none, so soft-delete failed.

-- 1. Author can update (soft-delete) their own comment
DROP POLICY IF EXISTS "authors_can_update_own_comments" ON public.deck_comments;
CREATE POLICY "authors_can_update_own_comments"
  ON public.deck_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Recreate admin/mod policy with explicit WITH CHECK
DROP POLICY IF EXISTS "admins_can_hide_comments" ON public.deck_comments;
CREATE POLICY "admins_can_hide_comments"
  ON public.deck_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'event_moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'event_moderator')
    )
  );

-- Verify
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'deck_comments' AND cmd = 'UPDATE'
ORDER BY policyname;
