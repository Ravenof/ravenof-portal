-- ════════════════════════════════════════════════════════════════════════════
-- Tournament Module v3 — Advancement engine
-- Paleisk vienu bloku Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── tournament_players: naujos kolonos ───────────────────────────────────────

ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS losses_count   int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status         text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'eliminated')),
  ADD COLUMN IF NOT EXISTS final_placement int;

-- ── tournament_matches: advanced_at stulpelis (idempotency guard) ────────────

ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS advanced_at timestamptz;

-- ── tournament_matches: loser_id kolonos pridėjimas (jei dar nėra) ──────────
-- (buvo v2 migracijoje, bet saugesnis patikrinimas)
ALTER TABLE public.tournament_matches
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ── RLS: leisti admin/mod INSERT ir UPDATE ───────────────────────────────────

-- Admin/mod INSERT tournament_matches
DROP POLICY IF EXISTS "admin mod insert tournament matches" ON public.tournament_matches;
CREATE POLICY "admin mod insert tournament matches"
  ON public.tournament_matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'event_moderator')
    )
  );

-- Admin/mod UPDATE tournament_matches (jau veikia per "admin write" ALL policy,
-- bet dodas explicit UPDATE policy su role patikra be is_admin() funkcijos)
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

-- Admin/mod INSERT tournament_players
DROP POLICY IF EXISTS "admin mod insert tournament players" ON public.tournament_players;
CREATE POLICY "admin mod insert tournament players"
  ON public.tournament_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'event_moderator')
    )
  );

-- Admin/mod UPDATE tournament_players
DROP POLICY IF EXISTS "admin mod update tournament players" ON public.tournament_players;
CREATE POLICY "admin mod update tournament players"
  ON public.tournament_players FOR UPDATE
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

-- ── Patikrinimas ─────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_players' AND column_name = 'losses_count'
     AND table_schema = 'public')            AS tp_losses_count,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_players' AND column_name = 'status'
     AND table_schema = 'public')            AS tp_status,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_players' AND column_name = 'final_placement'
     AND table_schema = 'public')            AS tp_final_placement,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_matches' AND column_name = 'advanced_at'
     AND table_schema = 'public')            AS tm_advanced_at,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_matches')   AS tm_policies,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_players')   AS tp_policies;
