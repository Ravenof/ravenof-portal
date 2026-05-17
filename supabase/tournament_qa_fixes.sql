-- ════════════════════════════════════════════════════════════════════════════
-- Tournament QA Fixes — 2026-05-17
-- Audit result: no new DB schema changes needed.
-- All required columns (losses_count, status, final_placement, advanced_at,
-- completed_at) were added in tournament_v3_advancement.sql.
-- All required RLS policies are in tournament_v3_advancement.sql and
-- tournament_admin_override_rls.sql.
--
-- This file documents what was verified to be in place:
-- ════════════════════════════════════════════════════════════════════════════

-- VERIFICATION QUERY (run to confirm schema is correct before deploying):
SELECT
  -- tournament_players columns
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tournament_players'
     AND column_name = 'losses_count')          AS tp_losses_count_ok,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tournament_players'
     AND column_name = 'status')                AS tp_status_ok,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tournament_players'
     AND column_name = 'final_placement')       AS tp_final_placement_ok,
  -- tournament_matches columns
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tournament_matches'
     AND column_name = 'advanced_at')           AS tm_advanced_at_ok,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tournament_matches'
     AND column_name = 'completed_at')          AS tm_completed_at_ok,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'tournament_matches'
     AND column_name = 'loser_id')              AS tm_loser_id_ok,
  -- RLS policies
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_matches'
     AND policyname = 'admin mod insert tournament matches') AS tm_insert_policy_ok,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_matches'
     AND policyname = 'admin mod update tournament matches') AS tm_update_policy_ok,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_players'
     AND policyname = 'admin mod insert tournament players') AS tp_insert_policy_ok,
  (SELECT COUNT(*) FROM pg_policies
   WHERE tablename = 'tournament_players'
     AND policyname = 'admin mod update tournament players') AS tp_update_policy_ok;
-- Expected: all values = 1

-- ── SAFETY NET: re-run v3 migration if any value above is 0 ─────────────────
-- Run tournament_v3_advancement.sql if any column/policy is missing.
-- Run tournament_admin_override_rls.sql if player update RLS is missing.
