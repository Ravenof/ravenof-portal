-- ════════════════════════════════════════════════════════════════════════════
-- Tournament Module v2 — Match Reporting
-- Paleisk vienu bloku Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Papildyti tournament_matches: loser_id, completed_at, nauji statusai ──

ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS loser_id      uuid REFERENCES public.tournament_players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at  timestamptz;

-- Atnaujinti status check constraint su naujais statusais
ALTER TABLE public.tournament_matches
  DROP CONSTRAINT IF EXISTS tournament_matches_status_check;

ALTER TABLE public.tournament_matches
  ADD CONSTRAINT tournament_matches_status_check
  CHECK (status IN (
    'pending',
    'active',
    'reported_by_one',
    'confirmed',
    'disputed',
    'admin_resolved',
    'completed'
  ));

-- ── 2. tournament_match_reports lentelė ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tournament_match_reports (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id             uuid        NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  reported_by_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_player_id uuid        NOT NULL REFERENCES public.tournament_players(id) ON DELETE CASCADE,
  claimed_result       text        NOT NULL CHECK (claimed_result IN ('win', 'loss')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, reported_by_user_id)
);

DROP TRIGGER IF EXISTS tournament_match_reports_updated_at ON public.tournament_match_reports;
CREATE TRIGGER tournament_match_reports_updated_at
  BEFORE UPDATE ON public.tournament_match_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tournament_match_reports ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS politikos ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tmr players read own match reports" ON public.tournament_match_reports;
DROP POLICY IF EXISTS "tmr players insert own report"     ON public.tournament_match_reports;
DROP POLICY IF EXISTS "tmr players update own report"     ON public.tournament_match_reports;
DROP POLICY IF EXISTS "tmr admins manage all"             ON public.tournament_match_reports;

-- Skaityti: savo ataskaitos + kito žaidėjo tame pačiame mačas + admin
CREATE POLICY "tmr players read own match reports"
  ON public.tournament_match_reports FOR SELECT
  USING (
    reported_by_user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.tournament_matches tm
      JOIN public.tournament_players tp
        ON tp.id IN (tm.player1_id, tm.player2_id)
      WHERE tm.id = match_id
        AND tp.user_id = auth.uid()
    )
  );

-- Įrašyti: tik savo ataskaitą ir tik jei esi to mačo dalyvis
CREATE POLICY "tmr players insert own report"
  ON public.tournament_match_reports FOR INSERT
  WITH CHECK (
    reported_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.tournament_matches tm
      JOIN public.tournament_players tp
        ON tp.id IN (tm.player1_id, tm.player2_id)
      WHERE tm.id = match_id
        AND tp.user_id = auth.uid()
        AND tp.id = tournament_player_id
    )
  );

-- Atnaujinti: tik savo ataskaitą, kol mačas nebaigtas
CREATE POLICY "tmr players update own report"
  ON public.tournament_match_reports FOR UPDATE
  USING (
    reported_by_user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.tournament_matches tm
      WHERE tm.id = match_id
        AND tm.status IN ('confirmed', 'admin_resolved')
    )
  )
  WITH CHECK (reported_by_user_id = auth.uid());

-- Admin: visas prieiga
CREATE POLICY "tmr admins manage all"
  ON public.tournament_match_reports FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 4. tournament_matches — žaidėjų UPDATE policy ────────────────────────────
-- Leidžia server action atnaujinti mačo statusą (reported_by_one/confirmed/disputed)
-- kaip paprastas vartotojas. Verslo logika tikrinama server action viduje.

DROP POLICY IF EXISTS "tournament players update own match status" ON public.tournament_matches;

CREATE POLICY "tournament players update own match status"
  ON public.tournament_matches FOR UPDATE
  USING (
    player1_id IN (SELECT id FROM public.tournament_players WHERE user_id = auth.uid())
    OR player2_id IN (SELECT id FROM public.tournament_players WHERE user_id = auth.uid())
  );

-- ── 5. Patikrinimas ───────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_matches' AND column_name = 'loser_id'
     AND table_schema = 'public')                                         AS loser_id_col,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_matches' AND column_name = 'completed_at'
     AND table_schema = 'public')                                         AS completed_at_col,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'tournament_match_reports' AND table_schema = 'public') AS reports_table,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_match_reports')                          AS reports_policies;
