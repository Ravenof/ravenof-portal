-- ════════════════════════════════════════════════════════════════════════════
-- Tournament v2 RLS Fix — tournament_matches player UPDATE policy
-- PROBLEMA: server action bando atnaujinti mačo statusą kaip paprastas
--           vartotojas, bet tournament_matches turėjo tik admin UPDATE.
--           Supabase tyliai ignoruoja UPDATE (0 rows), neklaidinant.
-- SPRENDIMAS: pridėti policy kuri leidžia žaidėjams atnaujinti savo mačus.
-- ════════════════════════════════════════════════════════════════════════════

-- Patikriname esamas politikas
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'tournament_matches';

-- Pridedame naują UPDATE policy žaidėjams
DROP POLICY IF EXISTS "tournament players update own match status" ON public.tournament_matches;

CREATE POLICY "tournament players update own match status"
  ON public.tournament_matches FOR UPDATE
  USING (
    -- Vartotojas turi būti šio mačo žaidėjas (player1 arba player2)
    player1_id IN (
      SELECT id FROM public.tournament_players WHERE user_id = auth.uid()
    )
    OR player2_id IN (
      SELECT id FROM public.tournament_players WHERE user_id = auth.uid()
    )
  );
-- Pastaba: WITH CHECK nenaudojame — server action jau tikrina
-- verslo logiką (teisingas statusų perėjimas, winner/loser priskyrimas).

-- Patikrinimas
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'tournament_matches'
ORDER BY cmd, policyname;
