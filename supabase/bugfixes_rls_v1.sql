-- =============================================================================
-- BUG FIX: RLS policies for deck_cards and deck_comments
-- Run this in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BUG #72: Non-owners cannot see card list / gold curve on public deck pages
-- Fix: allow anyone to SELECT deck_cards when the parent deck is public
-- -----------------------------------------------------------------------------

-- Drop old policy if exists (safe to re-run)
DROP POLICY IF EXISTS "deck_cards_public_read" ON public.deck_cards;

CREATE POLICY "deck_cards_public_read"
ON public.deck_cards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id  = deck_cards.deck_id
      AND decks.visibility = 'public'
  )
);

-- Also ensure owners can always read their own deck_cards
-- (may already exist — use IF NOT EXISTS variant)
DROP POLICY IF EXISTS "deck_cards_owner_read" ON public.deck_cards;

CREATE POLICY "deck_cards_owner_read"
ON public.deck_cards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id      = deck_cards.deck_id
      AND decks.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- BUG #74: Admins/moderators cannot hide comments (RLS blocks UPDATE)
-- Fix: allow admin and event_moderator roles to UPDATE any deck_comment
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "deck_comments_admin_update" ON public.deck_comments;

CREATE POLICY "deck_comments_admin_update"
ON public.deck_comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id   = auth.uid()
      AND profiles.role IN ('admin', 'event_moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id   = auth.uid()
      AND profiles.role IN ('admin', 'event_moderator')
  )
);
