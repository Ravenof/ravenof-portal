-- MVP 5B: User Hub + Leaderboards
-- Safe: only ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION

-- 1. Add show_on_leaderboards to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_leaderboards BOOLEAN NOT NULL DEFAULT true;

-- 2. Level / XP leaderboard
CREATE OR REPLACE FUNCTION public.get_level_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  username    TEXT,
  display_name TEXT,
  level       INT,
  xp_total    INT,
  rank_key    TEXT,
  rank_title  TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.username,
    CASE WHEN p.show_profile_details THEN p.display_name ELSE NULL END AS display_name,
    p.level,
    p.xp_total,
    p.rank_key,
    rr.title AS rank_title
  FROM public.profiles p
  LEFT JOIN public.rank_rules rr ON rr.rank_key = p.rank_key
  WHERE p.is_public = true
    AND p.show_on_leaderboards = true
    AND p.show_level = true
  ORDER BY p.xp_total DESC, p.level DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_level_leaderboard(INT) TO anon, authenticated;

-- 3. Collection leaderboard (no direct user_collections public access)
CREATE OR REPLACE FUNCTION public.get_collection_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  username         TEXT,
  owned_count      BIGINT,
  total_active     BIGINT,
  completion_pct   NUMERIC
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.cards WHERE status = 'active';

  RETURN QUERY
  SELECT
    p.username,
    COUNT(uc.card_id)::BIGINT AS owned_count,
    v_total AS total_active,
    ROUND(COUNT(uc.card_id)::NUMERIC / GREATEST(v_total, 1) * 100, 1) AS completion_pct
  FROM public.profiles p
  JOIN public.user_collections uc ON uc.user_id = p.id AND uc.quantity > 0
  WHERE p.is_public = true
    AND p.show_on_leaderboards = true
    AND p.show_owned_cards = true
  GROUP BY p.username
  ORDER BY owned_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_collection_leaderboard(INT) TO anon, authenticated;

-- 4. Deck upvotes leaderboard (counts vote=1 across public decks)
CREATE OR REPLACE FUNCTION public.get_deck_upvotes_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  username           TEXT,
  public_decks_count BIGINT,
  total_upvotes      BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.username,
    COUNT(DISTINCT d.id)::BIGINT AS public_decks_count,
    COUNT(dv.id)::BIGINT         AS total_upvotes
  FROM public.profiles p
  JOIN public.decks d ON d.user_id = p.id AND d.visibility = 'public'
  LEFT JOIN public.deck_votes dv ON dv.deck_id = d.id AND dv.vote = 1
  WHERE p.is_public = true
    AND p.show_on_leaderboards = true
    AND p.show_public_decks = true
  GROUP BY p.username
  ORDER BY total_upvotes DESC, public_decks_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_deck_upvotes_leaderboard(INT) TO anon, authenticated;

-- 5. Events leaderboard
CREATE OR REPLACE FUNCTION public.get_events_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  username       TEXT,
  attended_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.username,
    COUNT(er.id)::BIGINT AS attended_count
  FROM public.profiles p
  JOIN public.event_registrations er ON er.user_id = p.id AND er.status = 'attended'
  WHERE p.is_public = true
    AND p.show_on_leaderboards = true
    AND p.show_attended_events = true
  GROUP BY p.username
  ORDER BY attended_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_events_leaderboard(INT) TO anon, authenticated;

-- 6. Badges leaderboard
CREATE OR REPLACE FUNCTION public.get_badges_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  username     TEXT,
  badges_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.username,
    COUNT(ub.id)::BIGINT AS badges_count
  FROM public.profiles p
  JOIN public.user_badges ub ON ub.user_id = p.id
  WHERE p.is_public = true
    AND p.show_on_leaderboards = true
    AND p.show_badges = true
  GROUP BY p.username
  ORDER BY badges_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_badges_leaderboard(INT) TO anon, authenticated;

-- Verification
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name='profiles' AND column_name='show_on_leaderboards') AS col_ok,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_name LIKE 'get_%_leaderboard') AS rpc_count;
