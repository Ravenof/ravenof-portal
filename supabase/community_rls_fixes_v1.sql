-- ============================================================
-- community_rls_fixes_v1.sql
-- 1. Leidžia visiems skaityti deck_cards viešiems deckams
-- 2. Leidžia admin/moderator slėpti deck_comments
-- Paleisti: Supabase SQL Editor
-- ============================================================

-- 1. deck_cards: SELECT politika viešiems deckams
--    (anksčiau matė tik savininkai)
DROP POLICY IF EXISTS "deck_cards_select_public" ON public.deck_cards;
CREATE POLICY "deck_cards_select_public"
ON public.deck_cards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id = deck_cards.deck_id
      AND decks.visibility = 'public'
  )
);

-- 2. deck_comments: UPDATE politika admin/moderator rolėms
--    (slėpti svetimus komentarus)
DROP POLICY IF EXISTS "deck_comments_update_moderator" ON public.deck_comments;
CREATE POLICY "deck_comments_update_moderator"
ON public.deck_comments
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'event_moderator')
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'event_moderator')
  )
);
