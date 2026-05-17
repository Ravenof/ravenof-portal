-- ════════════════════════════════════════════════════════════════════════════
-- Tournament Rewards v1
-- Paleisk vienu bloku Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Išplėsti xp_transactions.source_type CHECK constraint ────────────────
--    Pridedame turnyro source types prie esamo sąrašo.

DO $$
BEGIN
  -- Rasti ir pašalinti seną CHECK constraint
  ALTER TABLE public.xp_transactions
    DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;

  -- Pridėti naują su turnyro tipais
  ALTER TABLE public.xp_transactions
    ADD CONSTRAINT xp_transactions_source_type_check
    CHECK (source_type IN (
      'event_attendance',
      'deck_published',
      'deck_upvote_received',
      'deck_downvote_received',
      'deck_copied',
      'collection_milestone',
      'manual_admin_adjustment',
      'badge_unlocked',
      'tournament_participation',
      'tournament_match_win',
      'tournament_placement_1',
      'tournament_placement_2',
      'tournament_placement_3'
    ));
END $$;

-- ── 2. SECURITY DEFINER funkcija: award_tournament_xp_once ──────────────────
--    Leidžia server action'ams iš TypeScript skirti XP bet kuriam user'iui
--    nepriklausomai nuo RLS. Idempotent per unique constraint.

CREATE OR REPLACE FUNCTION public.award_tournament_xp_once(
  p_user_id    uuid,
  p_amount     int,
  p_source_type text,
  p_source_id  uuid,
  p_reason     text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int := 0;
BEGIN
  INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
  VALUES (p_user_id, p_amount, p_reason, p_source_type, p_source_id)
  ON CONFLICT (user_id, source_type, source_id)
  WHERE source_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    PERFORM public.recalculate_user_progress(p_user_id);
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Leisti visiems autentifikuotiems useriais kviesti šią funkciją
GRANT EXECUTE ON FUNCTION public.award_tournament_xp_once TO authenticated;

-- ── 3. Nustatyti turnyro badge xp_reward = 0 ────────────────────────────────
--    XP dabar skiriamas per tournament_participation / tournament_placement_X
--    source types (kartotinai per turnyrą). Jei badge xp_reward liktų nenulinis,
--    pirmame turnyre XP dubliuotųsi. Badge'ai lieka kaip achievement žymekliai.
--
--    PASTABA: Jei nori palikti badge XP ir praleisti atskirą tournament XP,
--    komentuok šias eilutes. Bet tada pirmame turnyre XP bus doubled.

UPDATE public.badges
SET xp_reward = 0
WHERE badge_key IN (
  'tournament_participant',
  'tournament_regular',
  'on_podium',
  'finalist',
  'tournament_champion'
)
AND is_active = true;

-- ── 4. Patikrinimas ──────────────────────────────────────────────────────────
SELECT
  badge_key,
  title,
  xp_reward,
  is_active
FROM public.badges
WHERE badge_key IN (
  'tournament_participant',
  'tournament_regular',
  'on_podium',
  'finalist',
  'tournament_champion'
)
ORDER BY badge_key;

-- Tikimasi rezultatas: xp_reward = 0 visiems 5 turnyro badge'ams
-- Jei badge'ų nėra — paleisk achievement_expansion_v1.sql pirmiau

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'award_tournament_xp_once';
-- Tikimasi: 1 eilutė (funkcija egzistuoja)
