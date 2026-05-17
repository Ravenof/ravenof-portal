-- ════════════════════════════════════════════════════════════════════════════
-- Tournament Grand Final Fix — SQL pastabos
-- SCHEMA PAKEITIMŲ NEREIKIA — visi stulpeliai jau yra iš tournament_v3_advancement.sql
-- ════════════════════════════════════════════════════════════════════════════
--
-- tournament_players.losses_count   -- jau egzistuoja
-- tournament_players.status         -- jau egzistuoja ('active' | 'eliminated')
-- tournament_players.final_placement -- jau egzistuoja
-- tournament_matches.advanced_at    -- jau egzistuoja
-- tournament_matches.completed_at   -- jau egzistuoja
-- events.tournament_status          -- jau egzistuoja, leidžia 'completed'
--
-- RLS INSERT/UPDATE admin/mod politikos — jau egzistuoja
--
-- Jei tournament_v3_advancement.sql dar NEPALEIDAI — paleisk JĮ dabar.
-- ════════════════════════════════════════════════════════════════════════════

-- Patikrinimas: ar visi stulpeliai yra?
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_players' AND column_name = 'losses_count'
     AND table_schema = 'public')            AS tp_losses_count,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_players' AND column_name = 'final_placement'
     AND table_schema = 'public')            AS tp_final_placement,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'tournament_matches' AND column_name = 'advanced_at'
     AND table_schema = 'public')            AS tm_advanced_at,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_matches' AND policyname LIKE 'admin%') AS tm_admin_policies,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_players' AND policyname LIKE 'admin%') AS tp_admin_policies;
-- Visi turi būti = 1 (arba > 0). Jei ne — paleisk tournament_v3_advancement.sql
