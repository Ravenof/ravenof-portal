-- =============================================================================
-- RLS Fixes v1
-- =============================================================================
-- TASK 1: Allow public to read deck_cards for public decks
-- TASK 6: Allow admins to update (hide) any deck_comment
-- Safe to run multiple times.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TASK 1: deck_cards — add SELECT policy for public decks
-- ---------------------------------------------------------------------------
-- Drop if exists (idempotent)
DROP POLICY IF EXISTS "public_deck_cards_readable" ON public.deck_cards;

-- Allow anyone (including anon) to read cards of a public deck
CREATE POLICY "public_deck_cards_readable"
  ON public.deck_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.decks
      WHERE decks.id = deck_cards.deck_id
        AND decks.visibility = 'public'
    )
  );

-- ---------------------------------------------------------------------------
-- TASK 6: deck_comments — allow admins to update (hide) any comment
-- ---------------------------------------------------------------------------
-- Drop if exists (idempotent)
DROP POLICY IF EXISTS "admins_can_hide_comments" ON public.deck_comments;

-- Allow admins to update any comment (e.g. set status = 'hidden')
CREATE POLICY "admins_can_hide_comments"
  ON public.deck_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'event_moderator')
    )
  );

-- Verification
SELECT
  schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('deck_cards', 'deck_comments')
  AND policyname IN ('public_deck_cards_readable', 'admins_can_hide_comments')
ORDER BY tablename, policyname;
