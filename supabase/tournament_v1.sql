-- ════════════════════════════════════════════════════════════════════════════
-- Tournament Module v1
-- Paleisk vienu bloku Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ── TASK 2: events papildomos kolonos ────────────────────────────────────────

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'playtestas'
    CHECK (event_type IN ('playtestas', 'turnyras', 'kita')),
  ADD COLUMN IF NOT EXISTS tournament_status text
    CHECK (tournament_status IS NULL OR tournament_status IN ('pending', 'active', 'completed'));

-- ── TASK 3: tournament_players ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tournament_players (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seed       int,
  placement  int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournament_players public read"  ON public.tournament_players;
DROP POLICY IF EXISTS "tournament_players admin write"  ON public.tournament_players;

CREATE POLICY "tournament_players public read"
  ON public.tournament_players FOR SELECT
  USING (true);

CREATE POLICY "tournament_players admin write"
  ON public.tournament_players FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── TASK 4: tournament_matches ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  round        int         NOT NULL,
  match_number int         NOT NULL,
  player1_id   uuid        REFERENCES public.tournament_players(id) ON DELETE SET NULL,
  player2_id   uuid        REFERENCES public.tournament_players(id) ON DELETE SET NULL,
  winner_id    uuid        REFERENCES public.tournament_players(id) ON DELETE SET NULL,
  is_bye       boolean     NOT NULL DEFAULT false,
  bracket      text        NOT NULL DEFAULT 'winners'
               CHECK (bracket IN ('winners', 'losers', 'grand_final')),
  status       text        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'active', 'completed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS tournament_matches_updated_at ON public.tournament_matches;
CREATE TRIGGER tournament_matches_updated_at
  BEFORE UPDATE ON public.tournament_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "tournament_matches public read" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches admin write" ON public.tournament_matches;

-- TASK 11: viesoji skaitymo teise
CREATE POLICY "tournament_matches public read"
  ON public.tournament_matches FOR SELECT
  USING (true);

CREATE POLICY "tournament_matches admin write"
  ON public.tournament_matches FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── Patikrinimas ─────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'events' AND column_name = 'event_type'
     AND table_schema = 'public')           AS event_type_col,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'events' AND column_name = 'tournament_status'
     AND table_schema = 'public')           AS tournament_status_col,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'tournament_players'  AND table_schema = 'public') AS tp_table,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'tournament_matches'  AND table_schema = 'public') AS tm_table,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_players')  AS tp_policies,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_matches')  AS tm_policies;
