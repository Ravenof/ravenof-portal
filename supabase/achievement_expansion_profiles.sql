-- ════════════════════════════════════════════════════════════════
-- Achievement Expansion v1 — Profile Patch
-- Adds profile-based checks to award_user_badges():
--   first_step, name_recorded, face_in_arena, complete_profile,
--   open_player, secret_strategist
-- Also updates handle_new_user() to award first_step on register
-- Run AFTER achievement_expansion_v1.sql
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- Replace award_user_badges() with full profile + DB checks
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_user_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  -- Profile fields
  v_has_avatar      BOOLEAN;
  v_has_bio         BOOLEAN;
  v_is_public       BOOLEAN;
  v_has_username    BOOLEAN;
  v_privacy_changed BOOLEAN; -- always true if this fn called from settings

  -- Event/deck/community counts
  v_attended_all        INT;
  v_attended_tournaments INT;
  v_public_decks        INT;
  v_distinct_factions   INT;
  v_upvotes             INT;
  v_owned_unique        INT;
  v_total_xp            INT;
  v_votes_cast          INT;

  v_has_placement_3     BOOLEAN;
  v_has_placement_2     BOOLEAN;
  v_has_placement_1     BOOLEAN;

  -- Card-type completion
  v_owned_spell     INT; v_total_spell     INT;
  v_owned_unit      INT; v_total_unit      INT;
  v_owned_structure INT; v_total_structure INT;
  v_owned_relic     INT; v_total_relic     INT;
  v_owned_champion  INT; v_total_champion  INT;

  -- Rarity completion
  v_owned_common    INT; v_total_common    INT;
  v_owned_magic     INT; v_total_magic     INT;
  v_owned_rare      INT; v_total_rare      INT;
  v_owned_epic      INT; v_total_epic      INT;
  v_owned_legendary INT; v_total_legendary INT;

  -- Neutral faction
  v_owned_neutral   INT; v_total_neutral   INT;

  -- Deck analysis
  v_has_low_curve_deck  BOOLEAN;
  v_has_high_curve_deck BOOLEAN;
  v_has_champion_deck   BOOLEAN;
  v_has_spell_master    BOOLEAN;
  v_has_creature_cmd    BOOLEAN;
BEGIN

  -- ── PROFILE ────────────────────────────────────────────────
  SELECT
    avatar_url IS NOT NULL AND length(trim(avatar_url)) > 0,
    bio IS NOT NULL AND length(trim(bio)) > 0,
    COALESCE(is_public, false),
    username IS NOT NULL AND length(trim(username)) > 0
  INTO v_has_avatar, v_has_bio, v_is_public, v_has_username
  FROM public.profiles WHERE id = p_user_id;

  -- ── EVENT / TOURNAMENT COUNTS ──────────────────────────────
  SELECT COUNT(*) INTO v_attended_all
  FROM public.event_registrations
  WHERE user_id = p_user_id AND status = 'attended';

  SELECT COUNT(*) INTO v_attended_tournaments
  FROM public.event_registrations er
  JOIN public.events e ON e.id = er.event_id
  WHERE er.user_id = p_user_id AND er.status = 'attended'
    AND e.event_type = 'tournament';

  SELECT
    EXISTS (SELECT 1 FROM public.event_registrations
            WHERE user_id = p_user_id AND status = 'attended' AND placement = 3),
    EXISTS (SELECT 1 FROM public.event_registrations
            WHERE user_id = p_user_id AND status = 'attended' AND placement = 2),
    EXISTS (SELECT 1 FROM public.event_registrations
            WHERE user_id = p_user_id AND status = 'attended' AND placement = 1)
  INTO v_has_placement_3, v_has_placement_2, v_has_placement_1;

  -- ── DECK / COMMUNITY COUNTS ────────────────────────────────
  SELECT COUNT(*) INTO v_public_decks
  FROM public.decks WHERE user_id = p_user_id AND visibility = 'public';

  SELECT COUNT(DISTINCT faction_id) INTO v_distinct_factions
  FROM public.decks
  WHERE user_id = p_user_id AND visibility = 'public' AND faction_id IS NOT NULL;

  SELECT COALESCE(SUM(xp.amount), 0) INTO v_total_xp
  FROM public.xp_transactions xp WHERE xp.user_id = p_user_id;

  SELECT COUNT(*) INTO v_owned_unique
  FROM public.user_collections WHERE user_id = p_user_id AND quantity > 0;

  SELECT COUNT(*) INTO v_upvotes
  FROM public.deck_votes dv JOIN public.decks d ON d.id = dv.deck_id
  WHERE d.user_id = p_user_id AND dv.user_id != p_user_id AND dv.vote = 1;

  SELECT COUNT(*) INTO v_votes_cast
  FROM public.deck_votes WHERE user_id = p_user_id AND vote = 1;

  -- ── CARD TYPE COMPLETION ───────────────────────────────────
  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_spell, v_total_spell
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Spell'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_unit, v_total_unit
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Unit'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_structure, v_total_structure
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Structure'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_relic, v_total_relic
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Relic'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_champion, v_total_champion
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Champion'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  -- ── RARITY COMPLETION ──────────────────────────────────────
  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_common, v_total_common
  FROM public.cards c JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Common'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_magic, v_total_magic
  FROM public.cards c JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Magic'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_rare, v_total_rare
  FROM public.cards c JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Rare'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_epic, v_total_epic
  FROM public.cards c JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Epic'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_legendary, v_total_legendary
  FROM public.cards c JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Legendary'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  -- ── NEUTRAL FACTION ────────────────────────────────────────
  SELECT COUNT(*) FILTER (WHERE uc.quantity > 0), COUNT(*)
  INTO v_owned_neutral, v_total_neutral
  FROM public.cards c
  JOIN public.factions f ON f.id = c.faction_id AND f.slug = 'neutral'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id
  WHERE c.status = 'active';

  -- ── DECK ANALYSIS ──────────────────────────────────────────
  SELECT EXISTS (
    SELECT 1 FROM public.decks
    WHERE user_id = p_user_id AND visibility = 'public'
      AND card_count >= 20 AND COALESCE(avg_gold_cost, 99) <= 3
  ) INTO v_has_low_curve_deck;

  SELECT EXISTS (
    SELECT 1 FROM public.decks
    WHERE user_id = p_user_id AND visibility = 'public'
      AND card_count >= 20 AND COALESCE(avg_gold_cost, 0) >= 6
  ) INTO v_has_high_curve_deck;

  SELECT EXISTS (
    SELECT 1 FROM public.decks d
    JOIN public.deck_cards dc ON dc.deck_id = d.id
    JOIN public.cards c ON c.id = dc.card_id
    JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Champion'
    WHERE d.user_id = p_user_id AND d.visibility = 'public'
  ) INTO v_has_champion_deck;

  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT d.id
      FROM public.decks d
      JOIN public.deck_cards dc ON dc.deck_id = d.id
      JOIN public.cards c ON c.id = dc.card_id
      JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Spell'
      WHERE d.user_id = p_user_id AND d.visibility = 'public'
      GROUP BY d.id HAVING SUM(dc.quantity) >= 10
    ) sub
  ) INTO v_has_spell_master;

  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT d.id
      FROM public.decks d
      JOIN public.deck_cards dc ON dc.deck_id = d.id
      JOIN public.cards c ON c.id = dc.card_id
      JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Unit'
      WHERE d.user_id = p_user_id AND d.visibility = 'public'
      GROUP BY d.id HAVING SUM(dc.quantity) >= 20
    ) sub
  ) INTO v_has_creature_cmd;

  -- ════════════════════════════════════════════════════════════
  -- AWARD BADGES
  -- ════════════════════════════════════════════════════════════

  -- Profile / Account
  PERFORM public.try_award_badge(p_user_id, 'first_step');
  IF v_has_username THEN
    PERFORM public.try_award_badge(p_user_id, 'name_recorded');
  END IF;
  IF v_has_avatar THEN
    PERFORM public.try_award_badge(p_user_id, 'face_in_arena');
  END IF;
  IF v_has_bio AND v_has_avatar THEN
    PERFORM public.try_award_badge(p_user_id, 'complete_profile');
  END IF;
  IF v_is_public THEN
    PERFORM public.try_award_badge(p_user_id, 'open_player');
  END IF;
  -- secret_strategist: awarded from server action when settings change

  -- XP thresholds
  IF v_total_xp >= 500   THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_member'); END IF;
  IF v_total_xp >= 2000  THEN PERFORM public.try_award_badge(p_user_id, 'rising_name'); END IF;
  IF v_total_xp >= 5000  THEN PERFORM public.try_award_badge(p_user_id, 'community_face'); END IF;
  IF v_total_xp >= 15000 THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_legend'); END IF;

  -- Collection count
  IF v_owned_unique >= 1   THEN PERFORM public.try_award_badge(p_user_id, 'first_card_mark'); END IF;
  IF v_owned_unique >= 25  THEN PERFORM public.try_award_badge(p_user_id, 'small_collection'); END IF;
  IF v_owned_unique >= 50  THEN PERFORM public.try_award_badge(p_user_id, 'growing_collection'); END IF;
  IF v_owned_unique >= 100 THEN PERFORM public.try_award_badge(p_user_id, 'serious_collector'); END IF;
  IF v_owned_unique >= 200 THEN PERFORM public.try_award_badge(p_user_id, 'great_shelf'); END IF;

  -- Card type completions
  IF v_total_spell     > 0 AND v_owned_spell     = v_total_spell     THEN PERFORM public.try_award_badge(p_user_id, 'all_spells'); END IF;
  IF v_total_unit      > 0 AND v_owned_unit      = v_total_unit      THEN PERFORM public.try_award_badge(p_user_id, 'all_creatures'); END IF;
  IF v_total_structure > 0 AND v_owned_structure = v_total_structure THEN PERFORM public.try_award_badge(p_user_id, 'all_artifacts'); END IF;
  IF v_total_relic     > 0 AND v_owned_relic     = v_total_relic     THEN PERFORM public.try_award_badge(p_user_id, 'all_curses'); END IF;
  IF v_total_champion  > 0 AND v_owned_champion  = v_total_champion  THEN PERFORM public.try_award_badge(p_user_id, 'all_fields'); END IF;

  -- Rarity completions
  IF v_total_common    > 0 AND v_owned_common    = v_total_common    THEN PERFORM public.try_award_badge(p_user_id, 'all_common_cards'); END IF;
  IF v_total_magic     > 0 AND v_owned_magic     = v_total_magic     THEN PERFORM public.try_award_badge(p_user_id, 'all_magic_cards'); END IF;
  IF v_total_rare      > 0 AND v_owned_rare      = v_total_rare      THEN PERFORM public.try_award_badge(p_user_id, 'all_rare_cards'); END IF;
  IF v_total_epic      > 0 AND v_owned_epic      = v_total_epic      THEN PERFORM public.try_award_badge(p_user_id, 'all_epic_cards'); END IF;
  IF v_total_legendary > 0 AND v_owned_legendary = v_total_legendary THEN PERFORM public.try_award_badge(p_user_id, 'all_legendary_cards'); END IF;

  -- Neutral faction completion
  IF v_total_neutral   > 0 AND v_owned_neutral   = v_total_neutral   THEN PERFORM public.try_award_badge(p_user_id, 'all_neutral_cards'); END IF;

  -- Deckbuilding
  IF v_public_decks >= 1 THEN
    PERFORM public.try_award_badge(p_user_id, 'first_deck');
    PERFORM public.try_award_badge(p_user_id, 'public_strategy');
  END IF;
  IF v_public_decks >= 5          THEN PERFORM public.try_award_badge(p_user_id, 'deck_smith'); END IF;
  IF v_distinct_factions >= 3     THEN PERFORM public.try_award_badge(p_user_id, 'faction_experimenter'); END IF;
  IF v_distinct_factions >= 5     THEN PERFORM public.try_award_badge(p_user_id, 'all_faction_strategist'); END IF;
  IF v_has_low_curve_deck          THEN PERFORM public.try_award_badge(p_user_id, 'low_curve_fanatic'); END IF;
  IF v_has_high_curve_deck         THEN PERFORM public.try_award_badge(p_user_id, 'heavy_deck_architect'); END IF;
  IF v_has_champion_deck           THEN PERFORM public.try_award_badge(p_user_id, 'champion_deck'); END IF;
  IF v_has_spell_master            THEN PERFORM public.try_award_badge(p_user_id, 'spell_master_deck'); END IF;
  IF v_has_creature_cmd            THEN PERFORM public.try_award_badge(p_user_id, 'creature_commander_deck'); END IF;

  -- Community
  IF v_upvotes >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_recognition'); END IF;
  IF v_upvotes >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'community_spark'); END IF;
  IF v_upvotes >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'popular_deck'); END IF;
  IF v_upvotes >= 25 THEN PERFORM public.try_award_badge(p_user_id, 'meta_footprint'); END IF;
  IF v_votes_cast >= 1 THEN PERFORM public.try_award_badge(p_user_id, 'first_vote'); END IF;

  -- Events
  IF v_attended_all >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_playtest'); END IF;
  IF v_attended_all >= 2  THEN PERFORM public.try_award_badge(p_user_id, 'returning_player'); END IF;
  IF v_attended_all >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'regular_tester'); END IF;
  IF v_attended_all >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'veteran_table'); END IF;

  -- Tournaments
  IF v_attended_tournaments >= 1 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_participant'); END IF;
  IF v_attended_tournaments >= 5 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_regular'); END IF;

  -- Placements
  IF v_has_placement_3 THEN PERFORM public.try_award_badge(p_user_id, 'on_podium'); END IF;
  IF v_has_placement_2 THEN PERFORM public.try_award_badge(p_user_id, 'finalist'); END IF;
  IF v_has_placement_1 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_champion'); END IF;

  -- Recalculate XP/level/rank once at the end
  PERFORM public.recalculate_user_progress(p_user_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────
-- Update handle_new_user() — award first_step on registration
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
BEGIN
  -- Derive a username from email prefix, sanitised
  v_username := split_part(NEW.email, '@', 1);
  v_username := regexp_replace(v_username, '[^a-zA-Z0-9_]', '_', 'g');
  v_username := lower(v_username);

  -- Ensure uniqueness by appending random suffix when clashing
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || '_' || floor(random() * 9000 + 1000)::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, v_username, v_username)
  ON CONFLICT (id) DO NOTHING;

  -- Award first_step immediately (user exists)
  BEGIN
    PERFORM public.try_award_badge(NEW.id, 'first_step');
    IF v_username IS NOT NULL AND length(v_username) > 0 THEN
      PERFORM public.try_award_badge(NEW.id, 'name_recorded');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- badge award failure must not block registration
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GRANT remains the same (SECURITY DEFINER functions keep their own grants)
GRANT EXECUTE ON FUNCTION public.award_user_badges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_award_badge(UUID, TEXT, TEXT, UUID) TO authenticated;
