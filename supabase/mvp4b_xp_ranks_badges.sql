-- ════════════════════════════════════════════════════════════════
-- MVP 4B: XP, Ranks, Badges, Profile Privacy
-- Paleisk Supabase SQL Editor — vienu bloku
-- Nėra DROP TABLE / TRUNCATE
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. PROFILES — papildomi laukai
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total             INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level                INT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rank_key             TEXT    NOT NULL DEFAULT 'novice',
  ADD COLUMN IF NOT EXISTS show_level           BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_badges          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_attended_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_public_decks    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_profile_details BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_owned_cards     BOOLEAN NOT NULL DEFAULT false;

-- ────────────────────────────────────────────────────────────────
-- 2. XP_TRANSACTIONS
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      INT         NOT NULL,
  reason      TEXT        NOT NULL,
  source_type TEXT        NOT NULL CHECK (source_type IN (
                'event_attendance',
                'deck_published',
                'deck_upvote_received',
                'deck_downvote_received',
                'deck_copied',
                'collection_milestone',
                'manual_admin_adjustment'
              )),
  source_id   UUID,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
  ON public.xp_transactions(user_id);

-- Unikalus indeksas: ne du kartus tas pats event/deck/vote saltinis
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_unique_source
  ON public.xp_transactions(user_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_transactions_read_own" ON public.xp_transactions;
CREATE POLICY "xp_transactions_read_own" ON public.xp_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ────────────────────────────────────────────────────────────────
-- 3. RANK_RULES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rank_rules (
  id          SERIAL PRIMARY KEY,
  rank_key    TEXT   UNIQUE NOT NULL,
  title       TEXT   NOT NULL,
  min_level   INT    NOT NULL,
  min_xp      INT    NOT NULL,
  icon        TEXT,
  color_hex   TEXT,
  sort_order  INT
);

ALTER TABLE public.rank_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rank_rules_public_read" ON public.rank_rules;
CREATE POLICY "rank_rules_public_read" ON public.rank_rules FOR SELECT USING (true);

INSERT INTO public.rank_rules (rank_key, title, min_level, min_xp, icon, color_hex, sort_order) VALUES
  ('novice',             'Naujas Keliautojas',       1,  0,     '🌱', '#6b7280', 1),
  ('table_rookie',       'Stalo Naujokas',           2,  100,   '🗺', '#9ca3af', 2),
  ('first_blood',        'Pirmo Musio Dalyvis',      3,  250,   '⚔', '#d97706', 3),
  ('deck_student',       'Kalades Mokinis',          4,  450,   '📚', '#b45309', 4),
  ('card_explorer',      'Kortu Tyrinejotojas',      5,  700,   '🔍', '#92400e', 5),
  ('ravenof_player',     'Ravenof Zaidejas',         6,  1000,  '🎮', '#7c3aed', 6),
  ('faction_sage',       'Frakciju Zinovas',         7,  1400,  '🧠', '#6d28d9', 7),
  ('tactic_smith',       'Taktikos Kalvis',          8,  1900,  '🔨', '#1d4ed8', 8),
  ('arena_warrior',      'Arenos Dalyvis',           9,  2500,  '🏟', '#0369a1', 9),
  ('deck_master',        'Deck Meistras',            10, 3200,  '🎯', '#d97706', 10),
  ('community_voice',    'Bendruomenes Balsas',      11, 4000,  '🗣', '#ca8a04', 11),
  ('tournament_knight',  'Turnyru Karys',            12, 5000,  '⚔', '#b91c1c', 12),
  ('playtest_veteran',   'Playtest Veteranas',       13, 6200,  '🎖', '#991b1b', 13),
  ('strategy_architect', 'Strategiju Architektas',   14, 7600,  '🏗', '#7e22ce', 14),
  ('faction_champion',   'Frakcijos Cempionas',      15, 9200,  '🏆', '#6d28d9', 15),
  ('ravenof_elite',      'Ravenof Elitas',           16, 11000, '💎', '#4f46e5', 16),
  ('meta_shaper',        'Metos Formuotojas',        17, 13000, '🌊', '#0891b2', 17),
  ('grand_strategist',   'Didysis Strategas',        18, 15300, '⚡', '#0d9488', 18),
  ('ravenof_legend',     'Ravenof Legenda',          19, 17900, '🌟', '#c026d3', 19),
  ('eternal_champion',   'Amzinasis Cempionas',      20, 21000, '👑', '#f59e0b', 20)
ON CONFLICT (rank_key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 4. BADGES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key         TEXT        UNIQUE NOT NULL,
  title             TEXT        NOT NULL,
  description       TEXT,
  icon              TEXT,
  category          TEXT        CHECK (category IN ('events','decks','community','collection','founder','special')),
  requirement_type  TEXT,
  requirement_value INT,
  xp_reward         INT         NOT NULL DEFAULT 0,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  sort_order        INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_public_read" ON public.badges;
CREATE POLICY "badges_public_read" ON public.badges FOR SELECT USING (true);

INSERT INTO public.badges
  (badge_key, title, description, icon, category, requirement_type, requirement_value, sort_order)
VALUES
  ('first_event',          'Pirmas Zingsnis',           'Dalyvavai savo pirmajame Ravenof renginyje.',          '🎪', 'events',     'attended_events',  1,   1),
  ('playtest_participant', 'Playtest Dalyvis',           'Dalyvavai 3 Ravenof renginiuose.',                     '🎭', 'events',     'attended_events',  3,   2),
  ('table_veteran',        'Stalo Veteranas',            'Dalyvavai 5 Ravenof renginiuose.',                     '🏅', 'events',     'attended_events',  5,   3),
  ('tournament_badge',     'Turnyru Karys',              'Dalyvavai 10 Ravenof renginiuose.',                    '⚔', 'events',     'attended_events',  10,  4),
  ('ravenof_pilgrim',      'Ravenof Piligrimas',         'Dalyvavai 20 Ravenof renginiuose.',                    '🌟', 'events',     'attended_events',  20,  5),
  ('first_deck',           'Pirmoji Kalade',             'Paskelbei savo pirma viesha kalade.',                  '📋', 'decks',      'public_decks',     1,   6),
  ('deck_builder',         'Kaladzriu Krejas',           'Paskelbei 3 vieshas kalades.',                         '🃏', 'decks',      'public_decks',     3,   7),
  ('deck_smith',           'Deck Smith',                 'Paskelbei 5 vieshas kalades.',                         '⚒', 'decks',      'public_decks',     5,   8),
  ('deck_architect',       'Strategiju Architektas',     'Paskelbei 10 viestu kaladzriu.',                       '🏗', 'decks',      'public_decks',     10,  9),
  ('first_support',        'Pirmas Palaikymas',          'Tavo kalade gavo pirma upvota.',                       '👍', 'community',  'upvotes_received', 1,   10),
  ('community_favorite',   'Bendruomenes Megstamas',     'Tavo kalades gavo 10 upvotu.',                         '⭐', 'community',  'upvotes_received', 10,  11),
  ('popular_creator',      'Populiarus Krejas',          'Tavo kalades gavo 25 upvotu.',                         '🌟', 'community',  'upvotes_received', 25,  12),
  ('meta_badge',           'Metos Formuotojas',          'Tavo kalades gavo 50 upvotu.',                         '👑', 'community',  'upvotes_received', 50,  13),
  ('discussion_spark',     'Diskusiju Kibirkstis',       'Tavo kalades gavo ir upvotu, ir downvotu.',            '🔥', 'community',  'mixed_votes',      1,   14),
  ('collector_start',      'Kolekcininko Pradzia',       'Turi 10 Ravenof korteliu.',                            '📦', 'collection', 'owned_cards',      10,  15),
  ('card_gatherer',        'Kortu Rinkejas',             'Turi 25 Ravenof korteliu.',                            '🃏', 'collection', 'owned_cards',      25,  16),
  ('card_hunter',          'Kortu Medžiotojas',          'Turi 50 Ravenof korteliu.',                            '🎯', 'collection', 'owned_cards',      50,  17),
  ('faction_collector',    'Frakcijos Rinkejas',         'Turi 20 korteliu is vienos frakcijos.',                '🏴', 'collection', 'faction_cards',    20,  18),
  ('major_collector',      'Didysis Kolekcininkas',      'Turi 100 Ravenof korteliu.',                           '💎', 'collection', 'owned_cards',      100, 19),
  ('arsenal_commander',    'Arsenalu Valdytojas',        'Turi 250 Ravenof korteliu.',                           '⚔', 'collection', 'owned_cards',      250, 20),
  ('ravenof_archivist',    'Ravenof Archyvaras',         'Turi 350 Ravenof korteliu.',                           '📚', 'collection', 'owned_cards',      350, 21),
  ('full_arsenal',         'Pilnas Arsenalas',           'Turi visas 525 Ravenof korteles!',                     '🏆', 'collection', 'owned_cards',      525, 22),
  ('early_tester',         'Ankstyvasis Testuotojas',    'Dalyvavai Ravenof playteste ankstyvoje stadijoje.',    '🧪', 'founder',    NULL,               NULL, 23),
  ('ravenof_supporter',    'Ravenof Remejas',            'Ypatingas Ravenof bendruomenes narys.',                '💎', 'special',    NULL,               NULL, 24)
ON CONFLICT (badge_key) DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 5. USER_BADGES
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id    UUID        NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_type TEXT,
  source_id   UUID,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_badges_read_all" ON public.user_badges;
CREATE POLICY "user_badges_read_all" ON public.user_badges
  FOR SELECT USING (true);

-- ────────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(p_xp INT)
RETURNS INT AS $$
BEGIN
  IF p_xp >= 21000 THEN RETURN 20; END IF;
  IF p_xp >= 17900 THEN RETURN 19; END IF;
  IF p_xp >= 15300 THEN RETURN 18; END IF;
  IF p_xp >= 13000 THEN RETURN 17; END IF;
  IF p_xp >= 11000 THEN RETURN 16; END IF;
  IF p_xp >= 9200  THEN RETURN 15; END IF;
  IF p_xp >= 7600  THEN RETURN 14; END IF;
  IF p_xp >= 6200  THEN RETURN 13; END IF;
  IF p_xp >= 5000  THEN RETURN 12; END IF;
  IF p_xp >= 4000  THEN RETURN 11; END IF;
  IF p_xp >= 3200  THEN RETURN 10; END IF;
  IF p_xp >= 2500  THEN RETURN 9;  END IF;
  IF p_xp >= 1900  THEN RETURN 8;  END IF;
  IF p_xp >= 1400  THEN RETURN 7;  END IF;
  IF p_xp >= 1000  THEN RETURN 6;  END IF;
  IF p_xp >= 700   THEN RETURN 5;  END IF;
  IF p_xp >= 450   THEN RETURN 4;  END IF;
  IF p_xp >= 250   THEN RETURN 3;  END IF;
  IF p_xp >= 100   THEN RETURN 2;  END IF;
  RETURN 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calculate_rank_from_level(p_level INT)
RETURNS TEXT AS $$
DECLARE v_rank_key TEXT;
BEGIN
  SELECT rank_key INTO v_rank_key
  FROM public.rank_rules
  WHERE min_level <= p_level
  ORDER BY min_level DESC LIMIT 1;
  RETURN COALESCE(v_rank_key, 'novice');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.recalculate_user_progress(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_xp    INT;
  v_level INT;
  v_rank  TEXT;
BEGIN
  SELECT GREATEST(0, COALESCE(SUM(amount), 0))
  INTO v_xp FROM public.xp_transactions WHERE user_id = p_user_id;
  v_level := public.calculate_level_from_xp(v_xp);
  v_rank  := public.calculate_rank_from_level(v_level);
  UPDATE public.profiles
  SET xp_total = v_xp, level = v_level, rank_key = v_rank
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.try_award_badge(
  p_user_id    UUID,
  p_badge_key  TEXT,
  p_source_type TEXT DEFAULT NULL,
  p_source_id   UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_badge_id  UUID;
  v_row_count INT;
BEGIN
  SELECT id INTO v_badge_id
  FROM public.badges WHERE badge_key = p_badge_key AND is_active = true;
  IF v_badge_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.user_badges (user_id, badge_id, source_type, source_id)
  VALUES (p_user_id, v_badge_id, p_source_type, p_source_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.award_user_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_attended_events  INT;
  v_public_decks     INT;
  v_upvotes          INT;
  v_downvotes        INT;
  v_owned_cards      INT;
  v_faction_max      INT;
BEGIN
  SELECT COUNT(*) INTO v_attended_events
  FROM public.event_registrations
  WHERE user_id = p_user_id AND status = 'attended';

  SELECT COUNT(*) INTO v_public_decks
  FROM public.decks
  WHERE user_id = p_user_id AND visibility = 'public';

  SELECT COUNT(*) INTO v_upvotes
  FROM public.deck_votes dv JOIN public.decks d ON d.id = dv.deck_id
  WHERE d.user_id = p_user_id AND dv.user_id != p_user_id AND dv.vote = 1;

  SELECT COUNT(*) INTO v_downvotes
  FROM public.deck_votes dv JOIN public.decks d ON d.id = dv.deck_id
  WHERE d.user_id = p_user_id AND dv.user_id != p_user_id AND dv.vote = -1;

  SELECT COUNT(*) INTO v_owned_cards
  FROM public.user_collections WHERE user_id = p_user_id AND quantity > 0;

  SELECT COALESCE(MAX(sub.cnt), 0) INTO v_faction_max FROM (
    SELECT SUM(uc.quantity) AS cnt
    FROM public.user_collections uc
    JOIN public.cards c ON c.id = uc.card_id
    WHERE uc.user_id = p_user_id AND uc.quantity > 0
    GROUP BY c.faction_id
  ) sub;

  IF v_attended_events >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_event'); END IF;
  IF v_attended_events >= 3  THEN PERFORM public.try_award_badge(p_user_id, 'playtest_participant'); END IF;
  IF v_attended_events >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'table_veteran'); END IF;
  IF v_attended_events >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_badge'); END IF;
  IF v_attended_events >= 20 THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_pilgrim'); END IF;

  IF v_public_decks >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_deck'); END IF;
  IF v_public_decks >= 3  THEN PERFORM public.try_award_badge(p_user_id, 'deck_builder'); END IF;
  IF v_public_decks >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'deck_smith'); END IF;
  IF v_public_decks >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'deck_architect'); END IF;

  IF v_upvotes >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_support'); END IF;
  IF v_upvotes >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'community_favorite'); END IF;
  IF v_upvotes >= 25 THEN PERFORM public.try_award_badge(p_user_id, 'popular_creator'); END IF;
  IF v_upvotes >= 50 THEN PERFORM public.try_award_badge(p_user_id, 'meta_badge'); END IF;
  IF v_upvotes >= 1 AND v_downvotes >= 1 THEN
    PERFORM public.try_award_badge(p_user_id, 'discussion_spark');
  END IF;

  IF v_owned_cards >= 10  THEN PERFORM public.try_award_badge(p_user_id, 'collector_start'); END IF;
  IF v_owned_cards >= 25  THEN PERFORM public.try_award_badge(p_user_id, 'card_gatherer'); END IF;
  IF v_owned_cards >= 50  THEN PERFORM public.try_award_badge(p_user_id, 'card_hunter'); END IF;
  IF v_owned_cards >= 100 THEN PERFORM public.try_award_badge(p_user_id, 'major_collector'); END IF;
  IF v_owned_cards >= 250 THEN PERFORM public.try_award_badge(p_user_id, 'arsenal_commander'); END IF;
  IF v_owned_cards >= 350 THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_archivist'); END IF;
  IF v_owned_cards >= 525 THEN PERFORM public.try_award_badge(p_user_id, 'full_arsenal'); END IF;
  IF v_faction_max >= 20  THEN PERFORM public.try_award_badge(p_user_id, 'faction_collector'); END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_collection_milestone_xp(p_user_id UUID)
RETURNS VOID AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.user_collections WHERE user_id = p_user_id AND quantity > 0;

  IF v_count >= 10 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 10
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 25, 'Kolekcija: 10 korteliu', 'collection_milestone', '{"threshold":10}');
  END IF;

  IF v_count >= 25 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 25
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 35, 'Kolekcija: 25 korteliu', 'collection_milestone', '{"threshold":25}');
  END IF;

  IF v_count >= 50 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 50
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 50, 'Kolekcija: 50 korteliu', 'collection_milestone', '{"threshold":50}');
  END IF;

  IF v_count >= 100 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 100
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 75, 'Kolekcija: 100 korteliu', 'collection_milestone', '{"threshold":100}');
  END IF;

  IF v_count >= 150 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 150
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 100, 'Kolekcija: 150 korteliu', 'collection_milestone', '{"threshold":150}');
  END IF;

  IF v_count >= 250 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 250
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 150, 'Kolekcija: 250 korteliu', 'collection_milestone', '{"threshold":250}');
  END IF;

  IF v_count >= 350 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 350
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 200, 'Kolekcija: 350 korteliu', 'collection_milestone', '{"threshold":350}');
  END IF;

  IF v_count >= 425 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 425
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 250, 'Kolekcija: 425 korteliu', 'collection_milestone', '{"threshold":425}');
  END IF;

  IF v_count >= 525 AND NOT EXISTS (
    SELECT 1 FROM public.xp_transactions
    WHERE user_id = p_user_id AND source_type = 'collection_milestone'
      AND (metadata->>'threshold')::int = 525
  ) THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, metadata)
    VALUES (p_user_id, 350, 'Kolekcija: 525 korteliu', 'collection_milestone', '{"threshold":525}');
  END IF;

  PERFORM public.recalculate_user_progress(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────
-- 7. TRIGGERS
-- ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_event_attendance_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'attended' AND (OLD.status IS DISTINCT FROM 'attended') THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
    VALUES (NEW.user_id, 150, 'Renginio dalyvavimas', 'event_attendance', NEW.id)
    ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
    PERFORM public.recalculate_user_progress(NEW.user_id);
    PERFORM public.award_user_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_event_attendance_xp ON public.event_registrations;
CREATE TRIGGER trg_event_attendance_xp
  AFTER UPDATE ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_attendance_xp();

CREATE OR REPLACE FUNCTION public.handle_deck_publish_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.visibility = 'public' THEN
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (NEW.user_id, 50, 'Kalade paskelbta viesai', 'deck_published', NEW.id)
      ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
      PERFORM public.recalculate_user_progress(NEW.user_id);
      PERFORM public.award_user_badges(NEW.user_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.visibility = 'public' AND (OLD.visibility IS DISTINCT FROM 'public') THEN
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (NEW.user_id, 50, 'Kalade paskelbta viesai', 'deck_published', NEW.id)
      ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
      PERFORM public.recalculate_user_progress(NEW.user_id);
      PERFORM public.award_user_badges(NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deck_publish_xp ON public.decks;
CREATE TRIGGER trg_deck_publish_xp
  AFTER INSERT OR UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.handle_deck_publish_xp();

CREATE OR REPLACE FUNCTION public.handle_deck_vote_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_author UUID;
  v_voter  UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT user_id INTO v_author FROM public.decks WHERE id = OLD.deck_id;
    v_voter := OLD.user_id;
  ELSE
    SELECT user_id INTO v_author FROM public.decks WHERE id = NEW.deck_id;
    v_voter := NEW.user_id;
  END IF;

  IF v_voter = v_author THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
    VALUES (
      v_author,
      CASE WHEN NEW.vote = 1 THEN 10 ELSE -3 END,
      CASE WHEN NEW.vote = 1 THEN 'Deck upvote gautas' ELSE 'Deck downvote gautas' END,
      CASE WHEN NEW.vote = 1 THEN 'deck_upvote_received' ELSE 'deck_downvote_received' END,
      NEW.id
    )
    ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;

  ELSIF TG_OP = 'UPDATE' AND NEW.vote != OLD.vote THEN
    DELETE FROM public.xp_transactions
    WHERE user_id = v_author AND source_id = NEW.id
      AND source_type IN ('deck_upvote_received', 'deck_downvote_received');
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
    VALUES (
      v_author,
      CASE WHEN NEW.vote = 1 THEN 10 ELSE -3 END,
      CASE WHEN NEW.vote = 1 THEN 'Deck upvote gautas' ELSE 'Deck downvote gautas' END,
      CASE WHEN NEW.vote = 1 THEN 'deck_upvote_received' ELSE 'deck_downvote_received' END,
      NEW.id
    );

  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_transactions
    WHERE user_id = v_author AND source_id = OLD.id
      AND source_type IN ('deck_upvote_received', 'deck_downvote_received');
  END IF;

  PERFORM public.recalculate_user_progress(v_author);
  PERFORM public.award_user_badges(v_author);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deck_vote_xp ON public.deck_votes;
CREATE TRIGGER trg_deck_vote_xp
  AFTER INSERT OR UPDATE OR DELETE ON public.deck_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_deck_vote_xp();

CREATE OR REPLACE FUNCTION public.handle_collection_milestone_trigger()
RETURNS TRIGGER AS $$
DECLARE v_user UUID;
BEGIN
  v_user := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  PERFORM public.handle_collection_milestone_xp(v_user);
  PERFORM public.award_user_badges(v_user);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_collection_milestone ON public.user_collections;
CREATE TRIGGER trg_collection_milestone
  AFTER INSERT OR UPDATE OR DELETE ON public.user_collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_collection_milestone_trigger();

-- ────────────────────────────────────────────────────────────────
-- 8. PRIVACY-SAFE RPC: get_public_user_collection
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_public_user_collection(p_username TEXT)
RETURNS TABLE (
  card_id        UUID,
  quantity       INT,
  card_name      TEXT,
  faction_id     INT,
  faction_name   TEXT,
  faction_slug   TEXT,
  faction_color  TEXT,
  card_type_id   INT,
  card_type_name TEXT,
  rarity_id      INT,
  rarity_name    TEXT,
  rarity_color   TEXT,
  gold_cost      INT,
  image_url      TEXT
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = p_username AND show_owned_cards = true
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    uc.card_id, uc.quantity,
    c.name, c.faction_id,
    f.name, f.slug, f.color_hex,
    c.card_type_id, ct.name,
    c.rarity_id, r.name, r.color_hex,
    c.gold_cost, c.image_url
  FROM public.user_collections uc
  JOIN public.profiles pr ON pr.id = uc.user_id
  JOIN public.cards c ON c.id = uc.card_id AND c.status = 'active'
  LEFT JOIN public.factions f ON f.id = c.faction_id
  LEFT JOIN public.card_types ct ON ct.id = c.card_type_id
  LEFT JOIN public.rarities r ON r.id = c.rarity_id
  WHERE pr.username = p_username AND uc.quantity > 0
  ORDER BY f.sort_order, c.gold_cost, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_public_user_collection(TEXT) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────
-- 9. VERIFICATION
-- ────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.rank_rules)   AS rank_count,
  (SELECT COUNT(*) FROM public.badges)       AS badge_count,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'profiles'
     AND column_name = 'xp_total')           AS xp_col,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'xp_transactions') AS xp_table,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'user_badges')     AS ub_table;
-- Laukiama: rank_count=20, badge_count=24, xp_col=1, xp_table=1, ub_table=1
