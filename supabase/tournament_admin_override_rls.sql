-- ════════════════════════════════════════════════════════════════════════════
-- Tournament Admin Override — RLS policies
-- Užtikrina, kad admin ir event_moderator gali UPDATE tournament_matches.
-- Paleisk Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Admin/mod UPDATE policy (covers adminResolveTournamentMatch action)
DROP POLICY IF EXISTS "admin mod update tournament matches" ON public.tournament_matches;

CREATE POLICY "admin mod update tournament matches"
  ON public.tournament_matches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'event_moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'event_moderator')
    )
  );

-- 2. Žaidėjų UPDATE policy (tournament result reporting — nepakeista)
DROP POLICY IF EXISTS "tournament players update own match status" ON public.tournament_matches;

CREATE POLICY "tournament players update own match status"
  ON public.tournament_matches FOR UPDATE
  TO authenticated
  USING (
    player1_id IN (
      SELECT id FROM public.tournament_players WHERE user_id = auth.uid()
    )
    OR player2_id IN (
      SELECT id FROM public.tournament_players WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    player1_id IN (
      SELECT id FROM public.tournament_players WHERE user_id = auth.uid()
    )
    OR player2_id IN (
      SELECT id FROM public.tournament_players WHERE user_id = auth.uid()
    )
  );

-- 3. Patikrinimas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'tournament_matches'
ORDER BY cmd, policyname;
