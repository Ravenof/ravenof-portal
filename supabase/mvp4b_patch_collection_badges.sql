-- MVP 4B patch: add missing collection badges (150 and 425)
-- Safe: INSERT only if not exists, no DROP/TRUNCATE

INSERT INTO public.badges
  (badge_key, title, description, icon, category, requirement_type, requirement_value, xp_reward, is_active, sort_order)
VALUES
  ('collection_strategist', 'Kolekcijos Strategas',       'Turi 150 Ravenof korteliu.',  '🗂', 'collection', 'owned_cards', 150, 125, true, 23),
  ('vault_commander',       'Ravenof Saugyklos Valdytojas','Turi 425 Ravenof korteliu.',  '🔐', 'collection', 'owned_cards', 425, 300, true, 24)
ON CONFLICT (badge_key) DO NOTHING;

-- Update award_user_badges to include 150 and 425 checks
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
  IF v_owned_cards >= 150 THEN PERFORM public.try_award_badge(p_user_id, 'collection_strategist'); END IF;
  IF v_owned_cards >= 250 THEN PERFORM public.try_award_badge(p_user_id, 'arsenal_commander'); END IF;
  IF v_owned_cards >= 350 THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_archivist'); END IF;
  IF v_owned_cards >= 425 THEN PERFORM public.try_award_badge(p_user_id, 'vault_commander'); END IF;
  IF v_owned_cards >= 525 THEN PERFORM public.try_award_badge(p_user_id, 'full_arsenal'); END IF;
  IF v_faction_max >= 20  THEN PERFORM public.try_award_badge(p_user_id, 'faction_collector'); END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
