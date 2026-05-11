-- ════════════════════════════════════════════════════════════════
-- Achievement Expansion v1
-- • Expands badges.category CHECK → 12 categories
-- • Adds badges.requirement TEXT column
-- • Expands xp_transactions.source_type CHECK
-- • Updates try_award_badge() → awards XP on unlock
-- • Adds events.event_type + event_registrations.placement
-- • Deactivates 24 old superseded badges
-- • UPSERTs all 70 new achievements
-- • Expands award_user_badges() with all auto-checkable conditions
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. BADGES.CATEGORY — expand CHECK
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.badges
  DROP CONSTRAINT IF EXISTS badges_category_check;

ALTER TABLE public.badges
  ADD CONSTRAINT badges_category_check
  CHECK (category IN (
    'events', 'decks', 'community', 'collection', 'founder', 'special',
    'account', 'rarity_collection', 'faction_collection',
    'champion_phases', 'deckbuilding', 'tournament_placement'
  ));

-- ────────────────────────────────────────────────────────────────
-- 2. BADGES.REQUIREMENT — new text column
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS requirement TEXT;

-- ────────────────────────────────────────────────────────────────
-- 3. XP_TRANSACTIONS.SOURCE_TYPE — expand CHECK
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.xp_transactions
  DROP CONSTRAINT IF EXISTS xp_transactions_source_type_check;

ALTER TABLE public.xp_transactions
  ADD CONSTRAINT xp_transactions_source_type_check
  CHECK (source_type IN (
    'event_attendance',
    'deck_published',
    'deck_upvote_received',
    'deck_downvote_received',
    'deck_copied',
    'collection_milestone',
    'manual_admin_adjustment',
    'badge_unlocked'
  ));

-- ────────────────────────────────────────────────────────────────
-- 4. EVENTS.EVENT_TYPE — new column
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'playtest';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN ('playtest', 'tournament', 'other'));

-- ────────────────────────────────────────────────────────────────
-- 5. EVENT_REGISTRATIONS.PLACEMENT — new column
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS placement INT;

ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_placement_check;

ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_placement_check
  CHECK (placement IS NULL OR placement IN (1, 2, 3));

-- ────────────────────────────────────────────────────────────────
-- 6. UPDATE try_award_badge() — now awards XP on first unlock
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.try_award_badge(
  p_user_id     UUID,
  p_badge_key   TEXT,
  p_source_type TEXT DEFAULT NULL,
  p_source_id   UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_badge_id  UUID;
  v_xp_reward INT;
  v_row_count INT;
BEGIN
  SELECT id, xp_reward
  INTO v_badge_id, v_xp_reward
  FROM public.badges
  WHERE badge_key = p_badge_key AND is_active = true;

  IF v_badge_id IS NULL THEN RETURN false; END IF;

  INSERT INTO public.user_badges (user_id, badge_id, source_type, source_id)
  VALUES (p_user_id, v_badge_id, p_source_type, p_source_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 AND COALESCE(v_xp_reward, 0) > 0 THEN
    INSERT INTO public.xp_transactions
      (user_id, amount, reason, source_type, source_id, metadata)
    VALUES (
      p_user_id,
      v_xp_reward,
      'Achievement: ' || p_badge_key,
      'badge_unlocked',
      v_badge_id,
      jsonb_build_object('badge_key', p_badge_key)
    )
    ON CONFLICT (user_id, source_type, source_id)
    WHERE source_id IS NOT NULL DO NOTHING;
  END IF;

  RETURN v_row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────
-- 7. DEACTIVATE OLD SUPERSEDED BADGES
--    (replaced by the new 70 — kept in DB for users who earned them)
-- ────────────────────────────────────────────────────────────────
UPDATE public.badges
SET is_active = false
WHERE badge_key IN (
  'first_event', 'playtest_participant', 'table_veteran',
  'tournament_badge', 'ravenof_pilgrim',
  'deck_builder', 'deck_architect',
  'first_support', 'community_favorite', 'popular_creator',
  'meta_badge', 'discussion_spark',
  'collector_start', 'card_gatherer', 'card_hunter',
  'faction_collector', 'major_collector', 'collection_strategist',
  'arsenal_commander', 'ravenof_archivist', 'vault_commander',
  'full_arsenal',
  'early_tester', 'ravenof_supporter'
);

-- ────────────────────────────────────────────────────────────────
-- 8. UPSERT 70 ACHIEVEMENTS
-- ────────────────────────────────────────────────────────────────
INSERT INTO public.badges
  (badge_key, title, description, icon, category, requirement_type,
   requirement_value, requirement, xp_reward, is_active, sort_order)
VALUES

-- ── ACCOUNT / PROFILE ──────────────────────────────────────────
('first_step',
  'Pirmasis Žingsnis',
  'Susikūrei Ravenof paskyrą.',
  '🌐', 'account', NULL, NULL,
  'Susikurti account.',
  50, true, 1),

('name_recorded',
  'Vardas Įrašytas',
  'Tavo vardas jau matomas Ravenof bendruomenėje.',
  '✍', 'account', NULL, NULL,
  'Pasirinkti username.',
  50, true, 2),

('face_in_arena',
  'Veidas Arenoje',
  'Įsidėjai savo profilio nuotrauką.',
  '📸', 'account', NULL, NULL,
  'Įsikelti profile picture / avatar.',
  100, true, 3),

('complete_profile',
  'Pilnas Profilis',
  'Tavo profilis atrodo paruoštas bendruomenei.',
  '✅', 'account', NULL, NULL,
  'Užpildyti pagrindinį profilį.',
  150, true, 4),

('open_player',
  'Atviras Žaidėjas',
  'Leidi kitiems matyti savo Ravenof profilį.',
  '👁', 'account', NULL, NULL,
  'Profilį nustatyti kaip public.',
  100, true, 5),

('secret_strategist',
  'Slaptas Strategas',
  'Susitvarkei profilio privatumo nustatymus.',
  '🔒', 'account', NULL, NULL,
  'Pakeisti bent vieną privacy setting.',
  75, true, 6),

('ravenof_member',
  'Ravenof Narys',
  'Pradėjai rinkti rimtesnę Ravenof patirtį.',
  '🎖', 'account', 'xp_total', 500,
  'Pasiekti 500 total XP.',
  100, true, 7),

('rising_name',
  'Kylantis Vardas',
  'Tavo vardas pradeda kilti bendruomenėje.',
  '📈', 'account', 'xp_total', 2000,
  'Pasiekti 2 000 total XP.',
  200, true, 8),

('community_face',
  'Bendruomenės Veidas',
  'Tave jau galima laikyti aktyviu Ravenof bendruomenės nariu.',
  '🌟', 'account', 'xp_total', 5000,
  'Pasiekti 5 000 total XP.',
  350, true, 9),

('ravenof_legend',
  'Ravenof Legenda',
  'Tavo progresas jau tapo legendinis.',
  '👑', 'account', 'xp_total', 15000,
  'Pasiekti 15 000 total XP.',
  750, true, 10),

-- ── COLLECTION ─────────────────────────────────────────────────
('first_card_mark',
  'Pirmoji Kortos Žymė',
  'Pažymėjai pirmą kortą kaip turimą.',
  '🃏', 'collection', 'owned_cards', 1,
  'Pažymėti pirmą kortą kaip turimą.',
  50, true, 11),

('small_collection',
  'Maža Kolekcija',
  'Tavo kolekcija pradeda augti.',
  '📦', 'collection', 'owned_cards', 25,
  'Pažymėti 25 kortas kaip turimas.',
  100, true, 12),

('growing_collection',
  'Auganti Kolekcija',
  'Jau turi rimtesnį Ravenof kortų pagrindą.',
  '📚', 'collection', 'owned_cards', 50,
  'Pažymėti 50 kortų kaip turimas.',
  150, true, 13),

('serious_collector',
  'Rimtas Kolekcionierius',
  'Tavo kolekcija jau atrodo solidžiai.',
  '💼', 'collection', 'owned_cards', 100,
  'Pažymėti 100 kortų kaip turimas.',
  250, true, 14),

('great_shelf',
  'Didžioji Lentyna',
  'Surinkai didelę Ravenof kolekcijos dalį.',
  '🏛', 'collection', 'owned_cards', 200,
  'Pažymėti 200 kortų kaip turimas.',
  500, true, 15),

('all_spells',
  'Visi Burtai',
  'Tavo rankose — visa burtų kolekcija.',
  '🔮', 'collection', 'all_type_spell', NULL,
  'Surinkti visas Spell tipo kortas.',
  600, true, 16),

('all_creatures',
  'Visi Padarai',
  'Surinkai visus Ravenof padarus.',
  '⚔', 'collection', 'all_type_unit', NULL,
  'Surinkti visas Unit tipo kortas.',
  600, true, 17),

('all_artifacts',
  'Visi Artefaktai',
  'Tavo kolekcijoje yra visi artefaktai.',
  '⚙', 'collection', 'all_type_structure', NULL,
  'Surinkti visas Structure tipo kortas.',
  500, true, 18),

('all_curses',
  'Visi Prakeiksmai',
  'Surinkai visus prakeiksmus.',
  '💀', 'collection', 'all_type_relic', NULL,
  'Surinkti visas Relic tipo kortas.',
  500, true, 19),

('all_fields',
  'Visi Laukai',
  'Tavo kolekcijoje yra visi laukai.',
  '🏔', 'collection', 'all_type_champion', NULL,
  'Surinkti visas Champion tipo kortas.',
  500, true, 20),

-- ── RARITY COLLECTION ──────────────────────────────────────────
('all_common_cards',
  'Paprastų Kortų Rinkinys',
  'Surinkai visas paprastas kortas.',
  '⬜', 'rarity_collection', 'all_rarity_common', NULL,
  'Surinkti visas Common kortas.',
  400, true, 21),

('all_magic_cards',
  'Magiškas Rinkinys',
  'Surinkai visas magiškas kortas.',
  '🔷', 'rarity_collection', 'all_rarity_magic', NULL,
  'Surinkti visas Magic kortas.',
  500, true, 22),

('all_rare_cards',
  'Retų Kortų Medžiotojas',
  'Surinkai visas retas kortas.',
  '🟣', 'rarity_collection', 'all_rarity_rare', NULL,
  'Surinkti visas Rare kortas.',
  700, true, 23),

('all_epic_cards',
  'Epiškas Kolekcionierius',
  'Surinkai visas epiškas kortas.',
  '🟠', 'rarity_collection', 'all_rarity_epic', NULL,
  'Surinkti visas Epic kortas.',
  1000, true, 24),

('all_legendary_cards',
  'Legendų Saugykla',
  'Tavo kolekcijoje yra visos legendinės kortos.',
  '🟡', 'rarity_collection', 'all_rarity_legendary', NULL,
  'Surinkti visas Legendary kortas.',
  1500, true, 25),

-- ── FACTION COLLECTION (Lithuanian factions — seeded; auto-unlock
--    pending faction data update; shows locked until then) ───────
('all_march_of_dead',
  'Mirties Maršo Archyvas',
  'Surinkai visas Mirties Maršo kortas.',
  '💀', 'faction_collection', 'all_faction_march_of_dead', NULL,
  'Surinkti visas Mirties Maršo frakcijos kortas.',
  800, true, 26),

('all_demon_horde',
  'Demonų Ordos Sandoris',
  'Surinkai visas Demonų Ordos kortas.',
  '😈', 'faction_collection', 'all_faction_demon_horde', NULL,
  'Surinkti visas Demonų Ordos frakcijos kortas.',
  800, true, 27),

('all_goblin_gang',
  'Goblinų Gaujos Krūva',
  'Surinkai visas Goblinų Gaujos kortas.',
  '👺', 'faction_collection', 'all_faction_goblin_gang', NULL,
  'Surinkti visas Goblinų Gaujos frakcijos kortas.',
  800, true, 28),

('all_raiders_night',
  'Plėšikų Nakties Grobis',
  'Surinkai visas Plėšikų Nakties kortas.',
  '🌙', 'faction_collection', 'all_faction_raiders_night', NULL,
  'Surinkti visas Plėšikų Nakties frakcijos kortas.',
  800, true, 29),

('all_mystic_melody',
  'Mistikos Melodijos Biblioteka',
  'Surinkai visas Mistikos Melodijos kortas.',
  '🎵', 'faction_collection', 'all_faction_mystic_melody', NULL,
  'Surinkti visas Mistikos Melodijos frakcijos kortas.',
  800, true, 30),

('all_eastern_wind',
  'Rytų Vėjo Šešėliai',
  'Surinkai visas Rytų Vėjo kortas.',
  '🌬', 'faction_collection', 'all_faction_eastern_wind', NULL,
  'Surinkti visas Rytų Vėjo frakcijos kortas.',
  800, true, 31),

('all_light_order',
  'Šviesos Pulko Arsenalas',
  'Surinkai visas Šviesos Pulko kortas.',
  '☀', 'faction_collection', 'all_faction_light_order', NULL,
  'Surinkti visas Šviesos Pulko frakcijos kortas.',
  800, true, 32),

('all_inquisition_legion',
  'Inkvizicijos Legiono Relikvijos',
  'Surinkai visas Inkvizicijos Legiono kortas.',
  '⚜', 'faction_collection', 'all_faction_inquisition_legion', NULL,
  'Surinkti visas Inkvizicijos Legiono frakcijos kortas.',
  800, true, 33),

('all_neutral_cards',
  'Neutralus Sandėlis',
  'Surinkai visas neutralias kortas.',
  '⚪', 'faction_collection', 'all_faction_neutral', NULL,
  'Surinkti visas Neutralias kortas.',
  700, true, 34),

-- ── CHAMPION PHASES (seeded; auto-unlock pending phase DB column)
('first_full_champion',
  'Pirmas Pilnas Čempionas',
  'Surinkai visas 3 vieno champion fazes.',
  '🏆', 'champion_phases', 'champion_phase_set', 1,
  'Turėti visas 3 to paties champion fazes.',
  300, true, 35),

('march_full_champion',
  'Mirties Maršo Čempionas',
  'Surinkai visas 3 Mirties Maršo champion fazes.',
  '💀', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Mirties Maršo champion fazes.',
  400, true, 36),

('demon_full_champion',
  'Demonų Ordos Čempionas',
  'Surinkai visas 3 Demonų Ordos champion fazes.',
  '😈', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Demonų Ordos champion fazes.',
  400, true, 37),

('goblin_full_champion',
  'Goblinų Gaujos Čempionas',
  'Surinkai visas 3 Goblinų Gaujos champion fazes.',
  '👺', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Goblinų Gaujos champion fazes.',
  400, true, 38),

('raiders_full_champion',
  'Plėšikų Nakties Čempionas',
  'Surinkai visas 3 Plėšikų Nakties champion fazes.',
  '🌙', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Plėšikų Nakties champion fazes.',
  400, true, 39),

('mystic_full_champion',
  'Mistikos Melodijos Čempionas',
  'Surinkai visas 3 Mistikos Melodijos champion fazes.',
  '🎵', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Mistikos Melodijos champion fazes.',
  400, true, 40),

('eastern_full_champion',
  'Rytų Vėjo Čempionas',
  'Surinkai visas 3 Rytų Vėjo champion fazes.',
  '🌬', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Rytų Vėjo champion fazes.',
  400, true, 41),

('light_full_champion',
  'Šviesos Pulko Čempionas',
  'Surinkai visas 3 Šviesos Pulko champion fazes.',
  '☀', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Šviesos Pulko champion fazes.',
  400, true, 42),

('inquisition_full_champion',
  'Inkvizicijos Legiono Čempionas',
  'Surinkai visas 3 Inkvizicijos Legiono champion fazes.',
  '⚜', 'champion_phases', 'champion_phase_faction', NULL,
  'Turėti visas 3 Inkvizicijos Legiono champion fazes.',
  400, true, 43),

('champion_hall',
  'Čempionų Salė',
  'Tavo kolekcijoje jau keli pilni champion phase setai.',
  '🏅', 'champion_phases', 'champion_phase_set', 5,
  'Turėti bent 5 pilnus champion phase setus.',
  1000, true, 44),

-- ── DECKBUILDING ───────────────────────────────────────────────
('first_deck',
  'Pirmoji Kaladė',
  'Sukūrei pirmą Ravenof kaladę.',
  '📋', 'deckbuilding', 'public_decks', 1,
  'Sukurti pirmą deck.',
  150, true, 45),

('public_strategy',
  'Vieša Strategija',
  'Pasidalinai savo kalade su bendruomene.',
  '📢', 'deckbuilding', 'public_decks', 1,
  'Padaryti pirmą deck public.',
  150, true, 46),

('deck_smith',
  'Kaladžių Kalvis',
  'Sukūrei kelias skirtingas kalades.',
  '⚒', 'deckbuilding', 'public_decks', 5,
  'Sukurti 5 deckus.',
  300, true, 47),

('faction_experimenter',
  'Frakcijų Eksperimentuotojas',
  'Išbandei kelias frakcijas deckbuildinge.',
  '🎨', 'deckbuilding', 'distinct_faction_decks', 3,
  'Sukurti deckus su 3 skirtingomis frakcijomis.',
  400, true, 48),

('all_faction_strategist',
  'Visų Frakcijų Strategas',
  'Sukūrei bent po vieną kaladę kiekvienai frakcijai.',
  '🗺', 'deckbuilding', 'distinct_faction_decks', 5,
  'Sukurti bent po vieną deck su kiekviena pagrindine frakcija.',
  900, true, 49),

('champion_deck',
  'Čempiono Kaladė',
  'Sukūrei kaladę aplink champion kortą.',
  '🏆', 'deckbuilding', NULL, NULL,
  'Sukurti deck su champion korta.',
  200, true, 50),

('spell_master_deck',
  'Burtų Meistras',
  'Sukūrei burtų kupiną kaladę.',
  '🔮', 'deckbuilding', NULL, NULL,
  'Sukurti deck, kuriame yra bent 10 spell kortų.',
  200, true, 51),

('creature_commander_deck',
  'Padarų Vadas',
  'Sukūrei kaladę, paremtą padarais.',
  '⚔', 'deckbuilding', NULL, NULL,
  'Sukurti deck, kuriame yra bent 20 unit kortų.',
  200, true, 52),

('low_curve_fanatic',
  'Žemos Kreivės Fanatikas',
  'Sukūrei greitą, žemos kainos kaladę.',
  '⚡', 'deckbuilding', NULL, NULL,
  'Sukurti legalų deck su avg_gold_cost <= 3.',
  250, true, 53),

('heavy_deck_architect',
  'Sunkiosios Kaladės Architektas',
  'Sukūrei brangių kortų ir vėlyvo žaidimo kaladę.',
  '🏗', 'deckbuilding', NULL, NULL,
  'Sukurti legalų deck su avg_gold_cost >= 6.',
  250, true, 54),

-- ── COMMUNITY ──────────────────────────────────────────────────
('first_vote',
  'Pirmas Balsas',
  'Pirmą kartą įvertinai kito žaidėjo kaladę.',
  '👍', 'community', NULL, NULL,
  'Pirmą kartą upvotinti deck.',
  50, true, 55),

('first_recognition',
  'Pirmas Pripažinimas',
  'Tavo kaladė gavo pirmą bendruomenės balsą.',
  '⭐', 'community', 'upvotes_received', 1,
  'Tavo deck gauna pirmą upvote.',
  100, true, 56),

('community_spark',
  'Bendruomenės Kibirkštis',
  'Tavo kaladė pradeda traukti dėmesį.',
  '✨', 'community', 'upvotes_received', 5,
  'Tavo deck gauna 5 upvotus.',
  250, true, 57),

('popular_deck',
  'Populiari Kaladė',
  'Bendruomenė pastebėjo tavo strategiją.',
  '🔥', 'community', 'upvotes_received', 10,
  'Tavo deck gauna 10 upvotų.',
  500, true, 58),

('meta_footprint',
  'Meta Pėdsakas',
  'Tavo kaladė jau paliko pėdsaką meta žaidime.',
  '🌊', 'community', 'upvotes_received', 25,
  'Tavo deck gauna 25 upvotus.',
  1000, true, 59),

('copied_strategy',
  'Nukopijuota Strategija',
  'Kitas žaidėjas nukopijavo tavo kaladę.',
  '📋', 'community', NULL, NULL,
  'Tavo deck pirmą kartą nukopijuojamas.',
  200, true, 60),

('inspirer',
  'Įkvėpėjas',
  'Tavo kaladės įkvėpė kitus žaidėjus.',
  '💡', 'community', NULL, NULL,
  'Tavo deck nukopijuojamas 10 kartų.',
  700, true, 61),

-- ── EVENT PARTICIPATION ────────────────────────────────────────
('first_playtest',
  'Pirmas Playtestas',
  'Dalyvavai pirmame Ravenof playtest evente.',
  '🎪', 'events', 'attended_events', 1,
  'Būti pažymėtam kaip attended pirmame evente.',
  300, true, 62),

('returning_player',
  'Sugrįžęs Žaidėjas',
  'Sugrįžai į dar vieną Ravenof eventą.',
  '🔄', 'events', 'attended_events', 2,
  'Dalyvauti 2 eventuose.',
  300, true, 63),

('regular_tester',
  'Nuolatinis Testuotojas',
  'Tapai reguliariu playtest dalyviu.',
  '🎭', 'events', 'attended_events', 5,
  'Dalyvauti 5 eventuose.',
  700, true, 64),

('veteran_table',
  'Veteranų Stalas',
  'Tavo vardas jau žinomas prie testavimo stalo.',
  '🏅', 'events', 'attended_events', 10,
  'Dalyvauti 10 eventų.',
  1200, true, 65),

('tournament_participant',
  'Turnyro Dalyvis',
  'Sudalyvavai pirmame Ravenof turnyre.',
  '⚔', 'events', 'attended_tournaments', 1,
  'Dalyvauti pirmame turnyre.',
  400, true, 66),

('tournament_regular',
  'Turnyrų Reguliaras',
  'Turnyrai tau jau ne naujiena.',
  '🏟', 'events', 'attended_tournaments', 5,
  'Dalyvauti 5 turnyruose.',
  1000, true, 67),

-- ── TOURNAMENT PLACEMENT ───────────────────────────────────────
('on_podium',
  'Ant Podiumo',
  'Užėmei 3 vietą Ravenof turnyre.',
  '🥉', 'tournament_placement', NULL, NULL,
  'Užimti 3 vietą turnyre.',
  700, true, 68),

('finalist',
  'Finalininkas',
  'Pasiekei turnyro finalą.',
  '🥈', 'tournament_placement', NULL, NULL,
  'Užimti 2 vietą turnyre.',
  1000, true, 69),

('tournament_champion',
  'Turnyro Čempionas',
  'Laimėjai Ravenof turnyrą.',
  '🥇', 'tournament_placement', NULL, NULL,
  'Užimti 1 vietą turnyre.',
  1500, true, 70)

ON CONFLICT (badge_key) DO UPDATE SET
  title             = EXCLUDED.title,
  description       = EXCLUDED.description,
  icon              = EXCLUDED.icon,
  category          = EXCLUDED.category,
  requirement_type  = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  requirement       = EXCLUDED.requirement,
  xp_reward         = EXCLUDED.xp_reward,
  is_active         = EXCLUDED.is_active,
  sort_order        = EXCLUDED.sort_order;

-- ────────────────────────────────────────────────────────────────
-- 9. EXPANDED award_user_badges()
--    Covers: collection, rarity, neutral faction, XP thresholds,
--    events, tournaments, community upvotes, deck counts,
--    deck faction diversity, deck analysis
--    Champion-phase + Lithuanian-faction checks: TODO (no DB data)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_user_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_attended_all        INT;
  v_attended_tournaments INT;
  v_public_decks        INT;
  v_distinct_factions   INT;
  v_upvotes             INT;
  v_owned_unique        INT;
  v_total_xp            INT;
  v_has_placement_3     BOOLEAN;
  v_has_placement_2     BOOLEAN;
  v_has_placement_1     BOOLEAN;
  v_votes_cast          INT;

  -- card-type counts
  v_owned_spell         INT;
  v_total_spell         INT;
  v_owned_unit          INT;
  v_total_unit          INT;
  v_owned_structure     INT;
  v_total_structure     INT;
  v_owned_relic         INT;
  v_total_relic         INT;
  v_owned_champion      INT;
  v_total_champion      INT;

  -- rarity counts
  v_owned_common        INT;
  v_total_common        INT;
  v_owned_magic         INT;
  v_total_magic         INT;
  v_owned_rare          INT;
  v_total_rare          INT;
  v_owned_epic          INT;
  v_total_epic          INT;
  v_owned_legendary     INT;
  v_total_legendary     INT;

  -- neutral faction
  v_owned_neutral       INT;
  v_total_neutral       INT;

  -- deck analysis
  v_has_low_curve_deck  BOOLEAN;
  v_has_high_curve_deck BOOLEAN;
  v_has_champion_deck   BOOLEAN;
  v_has_spell_master    BOOLEAN;
  v_has_creature_cmd    BOOLEAN;
BEGIN

  -- ── BASIC COUNTS ───────────────────────────────────────────
  SELECT COUNT(*) INTO v_attended_all
  FROM public.event_registrations
  WHERE user_id = p_user_id AND status = 'attended';

  SELECT COUNT(*) INTO v_attended_tournaments
  FROM public.event_registrations er
  JOIN public.events e ON e.id = er.event_id
  WHERE er.user_id = p_user_id AND er.status = 'attended'
    AND e.event_type = 'tournament';

  SELECT COUNT(*) INTO v_public_decks
  FROM public.decks
  WHERE user_id = p_user_id AND visibility = 'public';

  SELECT COUNT(DISTINCT faction_id) INTO v_distinct_factions
  FROM public.decks
  WHERE user_id = p_user_id AND visibility = 'public'
    AND faction_id IS NOT NULL;

  SELECT COALESCE(SUM(xp.amount), 0) INTO v_total_xp
  FROM public.xp_transactions xp
  WHERE xp.user_id = p_user_id;

  SELECT COUNT(*) INTO v_owned_unique
  FROM public.user_collections WHERE user_id = p_user_id AND quantity > 0;

  SELECT COUNT(*) INTO v_upvotes
  FROM public.deck_votes dv JOIN public.decks d ON d.id = dv.deck_id
  WHERE d.user_id = p_user_id AND dv.user_id != p_user_id AND dv.vote = 1;

  SELECT COUNT(*) INTO v_votes_cast
  FROM public.deck_votes WHERE user_id = p_user_id AND vote = 1;

  SELECT
    EXISTS (SELECT 1 FROM public.event_registrations WHERE user_id = p_user_id AND status = 'attended' AND placement = 3),
    EXISTS (SELECT 1 FROM public.event_registrations WHERE user_id = p_user_id AND status = 'attended' AND placement = 2),
    EXISTS (SELECT 1 FROM public.event_registrations WHERE user_id = p_user_id AND status = 'attended' AND placement = 1)
  INTO v_has_placement_3, v_has_placement_2, v_has_placement_1;

  -- ── CARD TYPE COUNTS ───────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_spell, v_total_spell
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Spell'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_unit, v_total_unit
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Unit'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_structure, v_total_structure
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Structure'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_relic, v_total_relic
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Relic'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_champion, v_total_champion
  FROM public.cards c
  JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Champion'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  -- ── RARITY COUNTS ──────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_common, v_total_common
  FROM public.cards c
  JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Common'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_magic, v_total_magic
  FROM public.cards c
  JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Magic'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_rare, v_total_rare
  FROM public.cards c
  JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Rare'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_epic, v_total_epic
  FROM public.cards c
  JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Epic'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_legendary, v_total_legendary
  FROM public.cards c
  JOIN public.rarities r ON r.id = c.rarity_id AND r.name = 'Legendary'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
  WHERE c.status = 'active';

  -- ── NEUTRAL FACTION ────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE uc.card_id IS NOT NULL AND uc.quantity > 0),
    COUNT(*)
  INTO v_owned_neutral, v_total_neutral
  FROM public.cards c
  JOIN public.factions f ON f.id = c.faction_id AND f.slug = 'neutral'
  LEFT JOIN public.user_collections uc ON uc.card_id = c.id AND uc.user_id = p_user_id AND uc.quantity > 0
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
      SELECT d.id, SUM(dc.quantity) AS cnt
      FROM public.decks d
      JOIN public.deck_cards dc ON dc.deck_id = d.id
      JOIN public.cards c ON c.id = dc.card_id
      JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Spell'
      WHERE d.user_id = p_user_id AND d.visibility = 'public'
      GROUP BY d.id
      HAVING SUM(dc.quantity) >= 10
    ) sub
  ) INTO v_has_spell_master;

  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT d.id, SUM(dc.quantity) AS cnt
      FROM public.decks d
      JOIN public.deck_cards dc ON dc.deck_id = d.id
      JOIN public.cards c ON c.id = dc.card_id
      JOIN public.card_types ct ON ct.id = c.card_type_id AND ct.name = 'Unit'
      WHERE d.user_id = p_user_id AND d.visibility = 'public'
      GROUP BY d.id
      HAVING SUM(dc.quantity) >= 20
    ) sub
  ) INTO v_has_creature_cmd;

  -- ── AWARD BADGES ───────────────────────────────────────────

  -- Collection
  IF v_owned_unique >= 1   THEN PERFORM public.try_award_badge(p_user_id, 'first_card_mark'); END IF;
  IF v_owned_unique >= 25  THEN PERFORM public.try_award_badge(p_user_id, 'small_collection'); END IF;
  IF v_owned_unique >= 50  THEN PERFORM public.try_award_badge(p_user_id, 'growing_collection'); END IF;
  IF v_owned_unique >= 100 THEN PERFORM public.try_award_badge(p_user_id, 'serious_collector'); END IF;
  IF v_owned_unique >= 200 THEN PERFORM public.try_award_badge(p_user_id, 'great_shelf'); END IF;

  -- Card type completions (own all active of that type)
  IF v_total_spell > 0     AND v_owned_spell     = v_total_spell     THEN PERFORM public.try_award_badge(p_user_id, 'all_spells'); END IF;
  IF v_total_unit > 0      AND v_owned_unit      = v_total_unit      THEN PERFORM public.try_award_badge(p_user_id, 'all_creatures'); END IF;
  IF v_total_structure > 0 AND v_owned_structure = v_total_structure THEN PERFORM public.try_award_badge(p_user_id, 'all_artifacts'); END IF;
  IF v_total_relic > 0     AND v_owned_relic     = v_total_relic     THEN PERFORM public.try_award_badge(p_user_id, 'all_curses'); END IF;
  IF v_total_champion > 0  AND v_owned_champion  = v_total_champion  THEN PERFORM public.try_award_badge(p_user_id, 'all_fields'); END IF;

  -- Rarity completions
  IF v_total_common > 0    AND v_owned_common    = v_total_common    THEN PERFORM public.try_award_badge(p_user_id, 'all_common_cards'); END IF;
  IF v_total_magic > 0     AND v_owned_magic     = v_total_magic     THEN PERFORM public.try_award_badge(p_user_id, 'all_magic_cards'); END IF;
  IF v_total_rare > 0      AND v_owned_rare      = v_total_rare      THEN PERFORM public.try_award_badge(p_user_id, 'all_rare_cards'); END IF;
  IF v_total_epic > 0      AND v_owned_epic      = v_total_epic      THEN PERFORM public.try_award_badge(p_user_id, 'all_epic_cards'); END IF;
  IF v_total_legendary > 0 AND v_owned_legendary = v_total_legendary THEN PERFORM public.try_award_badge(p_user_id, 'all_legendary_cards'); END IF;

  -- Neutral faction
  IF v_total_neutral > 0   AND v_owned_neutral   = v_total_neutral   THEN PERFORM public.try_award_badge(p_user_id, 'all_neutral_cards'); END IF;

  -- XP thresholds
  IF v_total_xp >= 500   THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_member'); END IF;
  IF v_total_xp >= 2000  THEN PERFORM public.try_award_badge(p_user_id, 'rising_name'); END IF;
  IF v_total_xp >= 5000  THEN PERFORM public.try_award_badge(p_user_id, 'community_face'); END IF;
  IF v_total_xp >= 15000 THEN PERFORM public.try_award_badge(p_user_id, 'ravenof_legend'); END IF;

  -- Deckbuilding
  IF v_public_decks >= 1 THEN
    PERFORM public.try_award_badge(p_user_id, 'first_deck');
    PERFORM public.try_award_badge(p_user_id, 'public_strategy');
  END IF;
  IF v_public_decks >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'deck_smith'); END IF;
  IF v_distinct_factions >= 3 THEN PERFORM public.try_award_badge(p_user_id, 'faction_experimenter'); END IF;
  IF v_distinct_factions >= 5 THEN PERFORM public.try_award_badge(p_user_id, 'all_faction_strategist'); END IF;
  IF v_has_low_curve_deck  THEN PERFORM public.try_award_badge(p_user_id, 'low_curve_fanatic'); END IF;
  IF v_has_high_curve_deck THEN PERFORM public.try_award_badge(p_user_id, 'heavy_deck_architect'); END IF;
  IF v_has_champion_deck   THEN PERFORM public.try_award_badge(p_user_id, 'champion_deck'); END IF;
  IF v_has_spell_master    THEN PERFORM public.try_award_badge(p_user_id, 'spell_master_deck'); END IF;
  IF v_has_creature_cmd    THEN PERFORM public.try_award_badge(p_user_id, 'creature_commander_deck'); END IF;

  -- Community upvotes
  IF v_upvotes >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_recognition'); END IF;
  IF v_upvotes >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'community_spark'); END IF;
  IF v_upvotes >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'popular_deck'); END IF;
  IF v_upvotes >= 25 THEN PERFORM public.try_award_badge(p_user_id, 'meta_footprint'); END IF;

  -- Votes cast
  IF v_votes_cast >= 1 THEN PERFORM public.try_award_badge(p_user_id, 'first_vote'); END IF;

  -- Events
  IF v_attended_all >= 1  THEN PERFORM public.try_award_badge(p_user_id, 'first_playtest'); END IF;
  IF v_attended_all >= 2  THEN PERFORM public.try_award_badge(p_user_id, 'returning_player'); END IF;
  IF v_attended_all >= 5  THEN PERFORM public.try_award_badge(p_user_id, 'regular_tester'); END IF;
  IF v_attended_all >= 10 THEN PERFORM public.try_award_badge(p_user_id, 'veteran_table'); END IF;

  -- Tournaments
  IF v_attended_tournaments >= 1 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_participant'); END IF;
  IF v_attended_tournaments >= 5 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_regular'); END IF;

  -- Placement
  IF v_has_placement_3 THEN PERFORM public.try_award_badge(p_user_id, 'on_podium'); END IF;
  IF v_has_placement_2 THEN PERFORM public.try_award_badge(p_user_id, 'finalist'); END IF;
  IF v_has_placement_1 THEN PERFORM public.try_award_badge(p_user_id, 'tournament_champion'); END IF;

  -- ── RECALCULATE ONCE at end (picks up any badge XP awarded) ─
  PERFORM public.recalculate_user_progress(p_user_id);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────
-- 10. UPDATE TRIGGER HANDLERS — remove redundant recalculate
--     (award_user_badges now calls it at the end)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_event_attendance_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'attended' AND (OLD.status IS DISTINCT FROM 'attended') THEN
    INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
    VALUES (NEW.user_id, 150, 'Renginio dalyvavimas', 'event_attendance', NEW.id)
    ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
    PERFORM public.award_user_badges(NEW.user_id);
  END IF;
  -- Also check placement-based achievements when placement is set
  IF NEW.placement IS DISTINCT FROM OLD.placement AND NEW.placement IS NOT NULL THEN
    PERFORM public.award_user_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_deck_publish_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.visibility = 'public' THEN
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (NEW.user_id, 50, 'Kalade paskelbta viesai', 'deck_published', NEW.id)
      ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
      PERFORM public.award_user_badges(NEW.user_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.visibility = 'public' AND (OLD.visibility IS DISTINCT FROM 'public') THEN
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (NEW.user_id, 50, 'Kalade paskelbta viesai', 'deck_published', NEW.id)
      ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
      PERFORM public.award_user_badges(NEW.user_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    IF NEW.vote = 1 THEN
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (v_author, 10, 'Deck upvote gautas', 'deck_upvote_received', NEW.id)
      ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
    ELSE
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (v_author, -3, 'Deck downvote gautas', 'deck_downvote_received', NEW.id)
      ON CONFLICT (user_id, source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.vote != OLD.vote THEN
    DELETE FROM public.xp_transactions
    WHERE user_id = v_author AND source_id = NEW.id
      AND source_type IN ('deck_upvote_received', 'deck_downvote_received');
    IF NEW.vote = 1 THEN
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (v_author, 10, 'Deck upvote gautas', 'deck_upvote_received', NEW.id);
    ELSE
      INSERT INTO public.xp_transactions (user_id, amount, reason, source_type, source_id)
      VALUES (v_author, -3, 'Deck downvote gautas', 'deck_downvote_received', NEW.id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.xp_transactions
    WHERE user_id = v_author AND source_id = OLD.id
      AND source_type IN ('deck_upvote_received', 'deck_downvote_received');
  END IF;

  -- Award voter badge (first_vote)
  IF TG_OP = 'INSERT' AND NEW.vote = 1 THEN
    PERFORM public.award_user_badges(v_voter);
  END IF;

  PERFORM public.award_user_badges(v_author);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- ────────────────────────────────────────────────────────────────
-- 11. VERIFICATION
-- ────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.badges WHERE is_active = true)                  AS active_badges,
  (SELECT COUNT(*) FROM public.badges WHERE is_active = false)                 AS deactivated_badges,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'account')              AS account,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'collection')           AS collection,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'rarity_collection')    AS rarity,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'faction_collection')   AS faction,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'champion_phases')      AS champion,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'deckbuilding')         AS deckbuilding,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'community')            AS community,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'events')               AS events,
  (SELECT COUNT(*) FROM public.badges WHERE category = 'tournament_placement') AS tournament,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'badges'
     AND column_name = 'requirement')                                           AS req_col,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'events'
     AND column_name = 'event_type')                                            AS event_type_col,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'event_registrations'
     AND column_name = 'placement')                                             AS placement_col;
-- Expected: active_badges=70, deactivated_badges=24,
--           req_col=1, event_type_col=1, placement_col=1
