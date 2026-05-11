-- =============================================================================
-- Level Progression v2 — 50-level system
-- =============================================================================
-- Replaces the old 20-level calculate_level_from_xp() with the new 50-level
-- thresholds that match lib/gamification/levels.ts exactly.
--
-- Also adds:
--   calculate_level_title_from_xp(p_xp)  → returns the level title string
--   Updates recalculate_user_progress()   → sets rank_key to level-based key
--   Backfill UPDATE for all existing profiles
--
-- Safe to run multiple times (CREATE OR REPLACE, idempotent UPDATE).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. New calculate_level_from_xp — matches LEVEL_THRESHOLDS in levels.ts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(p_xp INT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_xp >= 100000 THEN RETURN 50; END IF;
  IF p_xp >=  99800 THEN RETURN 49; END IF;
  IF p_xp >=  99500 THEN RETURN 48; END IF;
  IF p_xp >=  99000 THEN RETURN 47; END IF;
  IF p_xp >=  98000 THEN RETURN 46; END IF;
  IF p_xp >=  96500 THEN RETURN 45; END IF;
  IF p_xp >=  93500 THEN RETURN 44; END IF;
  IF p_xp >=  90000 THEN RETURN 43; END IF;
  IF p_xp >=  86000 THEN RETURN 42; END IF;
  IF p_xp >=  81500 THEN RETURN 41; END IF;
  IF p_xp >=  76800 THEN RETURN 40; END IF;
  IF p_xp >=  72100 THEN RETURN 39; END IF;
  IF p_xp >=  67600 THEN RETURN 38; END IF;
  IF p_xp >=  63300 THEN RETURN 37; END IF;
  IF p_xp >=  59200 THEN RETURN 36; END IF;
  IF p_xp >=  55300 THEN RETURN 35; END IF;
  IF p_xp >=  51600 THEN RETURN 34; END IF;
  IF p_xp >=  48100 THEN RETURN 33; END IF;
  IF p_xp >=  44800 THEN RETURN 32; END IF;
  IF p_xp >=  41700 THEN RETURN 31; END IF;
  IF p_xp >=  38800 THEN RETURN 30; END IF;
  IF p_xp >=  36100 THEN RETURN 29; END IF;
  IF p_xp >=  33500 THEN RETURN 28; END IF;
  IF p_xp >=  31000 THEN RETURN 27; END IF;
  IF p_xp >=  28600 THEN RETURN 26; END IF;
  IF p_xp >=  26300 THEN RETURN 25; END IF;
  IF p_xp >=  24100 THEN RETURN 24; END IF;
  IF p_xp >=  22000 THEN RETURN 23; END IF;
  IF p_xp >=  20000 THEN RETURN 22; END IF;
  IF p_xp >=  18100 THEN RETURN 21; END IF;
  IF p_xp >=  16300 THEN RETURN 20; END IF;
  IF p_xp >=  14600 THEN RETURN 19; END IF;
  IF p_xp >=  13000 THEN RETURN 18; END IF;
  IF p_xp >=  11500 THEN RETURN 17; END IF;
  IF p_xp >=  10100 THEN RETURN 16; END IF;
  IF p_xp >=   8800 THEN RETURN 15; END IF;
  IF p_xp >=   7600 THEN RETURN 14; END IF;
  IF p_xp >=   6500 THEN RETURN 13; END IF;
  IF p_xp >=   5500 THEN RETURN 12; END IF;
  IF p_xp >=   4600 THEN RETURN 11; END IF;
  IF p_xp >=   3750 THEN RETURN 10; END IF;
  IF p_xp >=   3000 THEN RETURN  9; END IF;
  IF p_xp >=   2350 THEN RETURN  8; END IF;
  IF p_xp >=   1750 THEN RETURN  7; END IF;
  IF p_xp >=   1250 THEN RETURN  6; END IF;
  IF p_xp >=    850 THEN RETURN  5; END IF;
  IF p_xp >=    500 THEN RETURN  4; END IF;
  IF p_xp >=    250 THEN RETURN  3; END IF;
  IF p_xp >=    100 THEN RETURN  2; END IF;
  RETURN 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. calculate_level_title_from_xp — returns level title string
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_level_title_from_xp(p_xp INT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE v_level INT;
BEGIN
  v_level := public.calculate_level_from_xp(GREATEST(0, p_xp));
  RETURN CASE v_level
    WHEN 50 THEN 'Ravenof Nemirtingasis'
    WHEN 49 THEN 'Panteono Vardas'
    WHEN 48 THEN 'Legendų Saugotojas'
    WHEN 47 THEN 'Amžinasis Strategas'
    WHEN 46 THEN 'Ravenof Ikona'
    WHEN 45 THEN 'Turnyrų Karūna'
    WHEN 44 THEN 'Senasis Meistras'
    WHEN 43 THEN 'Frakcijų Architektas'
    WHEN 42 THEN 'Arenos Valdovas'
    WHEN 41 THEN 'Čempionų Vedlys'
    WHEN 40 THEN 'Ravenof Legenda'
    WHEN 39 THEN 'Aukštasis Taktikas'
    WHEN 38 THEN 'Pergalių Kalvis'
    WHEN 37 THEN 'Ravenof Strategas'
    WHEN 36 THEN 'Turnyrų Grėsmė'
    WHEN 35 THEN 'Frakcijos Legenda'
    WHEN 34 THEN 'Arenos Komandoras'
    WHEN 33 THEN 'Didysis Kolekcionierius'
    WHEN 32 THEN 'Meta Formuotojas'
    WHEN 31 THEN 'Čempionų Meistras'
    WHEN 30 THEN 'Ravenof Meistras'
    WHEN 29 THEN 'Bendruomenės Ramstis'
    WHEN 28 THEN 'Turnyrų Reguliaras'
    WHEN 27 THEN 'Frakcijų Žinovas'
    WHEN 26 THEN 'Kolekcijos Meistras'
    WHEN 25 THEN 'Ravenof Veteran''as'
    WHEN 24 THEN 'Čempionų Sekėjas'
    WHEN 23 THEN 'Arenos Veteranas'
    WHEN 22 THEN 'Kaladžių Architektas'
    WHEN 21 THEN 'Frakcijos Karys'
    WHEN 20 THEN 'Patyręs Žaidėjas'
    WHEN 19 THEN 'Bendruomenės Veidas'
    WHEN 18 THEN 'Turnyro Pretendentas'
    WHEN 17 THEN 'Strategijų Medžiotojas'
    WHEN 16 THEN 'Kolekcijos Prižiūrėtojas'
    WHEN 15 THEN 'Ravenof Taktikas'
    WHEN 14 THEN 'Mūšio Planuotojas'
    WHEN 13 THEN 'Frakcijos Sekėjas'
    WHEN 12 THEN 'Arenos Dalyvis'
    WHEN 11 THEN 'Kaladės Kalvis'
    WHEN 10 THEN 'Ravenof Žaidėjas'
    WHEN  9 THEN 'Kortų Rinkėjas'
    WHEN  8 THEN 'Jaunasis Taktikas'
    WHEN  7 THEN 'Frakcijos Ieškotojas'
    WHEN  6 THEN 'Arenos Stebėtojas'
    WHEN  5 THEN 'Pradedantis Strategas'
    WHEN  4 THEN 'Kaladės Pameistrys'
    WHEN  3 THEN 'Kortų Mokinys'
    WHEN  2 THEN 'Pirmojo Žingsnio Žaidėjas'
    ELSE       'Bevardis Naujokas'
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. calculate_rank_from_level — maps level to rank group key (kept for
--    backwards compatibility; rank_rules table can still be used for icons)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_rank_from_level(p_level INT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_level >= 46 THEN RETURN 'panteonas'; END IF;
  IF p_level >= 41 THEN RETURN 'elitas'; END IF;
  IF p_level >= 36 THEN RETURN 'legenda'; END IF;
  IF p_level >= 31 THEN RETURN 'auktasis_meistras'; END IF;
  IF p_level >= 26 THEN RETURN 'meistras'; END IF;
  IF p_level >= 21 THEN RETURN 'veteranas'; END IF;
  IF p_level >= 16 THEN RETURN 'patyres_zaidejas'; END IF;
  IF p_level >= 11 THEN RETURN 'taktikas'; END IF;
  IF p_level >= 6  THEN RETURN 'zaidejas'; END IF;
  RETURN 'naujokas';
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Update recalculate_user_progress to use new level calculation
--    (same signature as before — called by XP triggers and try_award_badge)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_user_progress(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_xp    INT;
  v_level INT;
  v_rank  TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_xp FROM public.xp_transactions WHERE user_id = p_user_id;

  v_level := public.calculate_level_from_xp(v_xp);
  v_rank  := public.calculate_rank_from_level(v_level);

  UPDATE public.profiles
  SET xp_total = v_xp, level = v_level, rank_key = v_rank
  WHERE id = p_user_id;
END;
$$;

-- Grant execute (safe — already granted before, but add new functions)
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_level_title_from_xp(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_rank_from_level(INT) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 5. Backfill: recalculate level and rank_key for all existing profiles
--    using their current xp_total (does NOT touch xp_transactions or XP totals)
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET
  level    = public.calculate_level_from_xp(GREATEST(0, xp_total)),
  rank_key = public.calculate_rank_from_level(
               public.calculate_level_from_xp(GREATEST(0, xp_total))
             )
WHERE true;

-- ---------------------------------------------------------------------------
-- 6. Verification query — run this to confirm the migration applied correctly
-- ---------------------------------------------------------------------------
SELECT
  'Migration OK' AS status,
  COUNT(*) AS total_profiles,
  MAX(level) AS max_level_in_db,
  MIN(level) AS min_level_in_db,
  public.calculate_level_from_xp(0)      AS test_0xp_level1,
  public.calculate_level_from_xp(100)    AS test_100xp_level2,
  public.calculate_level_from_xp(3750)   AS test_3750xp_level10,
  public.calculate_level_from_xp(100000) AS test_100000xp_level50,
  public.calculate_level_from_xp(150000) AS test_150000xp_level50
FROM public.profiles;
