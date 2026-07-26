-- ════════════════════════════════════════════════════════════════════════════
--  DAILY QUESTS — 50 užduočių bankas + praplėsta kovos telemetrija
--  ─────────────────────────────────────────────────────────────────────────
--  1) Terminologija: žaidėjui matomas tekstas eina per i18n raktus
--     (quests.v2.*). Šablonų raktai atnaujinti į naują standartą:
--     „DI" (ne „botas"), partija = „kova" / EN „battle".
--  2) Bankas: 50 aktyvių šablonų (17 easy / 17 medium / 16 hard) su
--     conflict_group, kad kasdien nesikartotų tas pats tipas.
--  3) Telemetrija: 15 naujų metrikų iš kovos žurnalo (klientas skaičiuoja
--     src/lib/game/matchStats.ts, siunčia esamu rvn_report_match_stats).
--  4) Įjungiami stat-objectives (be jų sukasi tik ~17 „sužaisk/laimėk" tipų).
--  Idempotentiška: visi insert'ai su on conflict, alter'iai su if not exists.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Kovos telemetrijos stulpeliai ───────────────────────────────────────
alter table public.matches add column if not exists face_damage int;
alter table public.matches add column if not exists creatures_killed int;
alter table public.matches add column if not exists cards_drawn int;
alter table public.matches add column if not exists artifacts_played int;
alter table public.matches add column if not exists field_played int;
alter table public.matches add column if not exists reactions_set int;
alter table public.matches add column if not exists reactions_triggered int;
alter table public.matches add column if not exists battlecries int;
alter table public.matches add column if not exists lastwishes int;
alter table public.matches add column if not exists summons_by_effect int;
alter table public.matches add column if not exists statuses_applied int;
alter table public.matches add column if not exists heal_done int;
alter table public.matches add column if not exists champion_abilities int;
alter table public.matches add column if not exists gold_spent int;
alter table public.matches add column if not exists curses_activated int;
alter table public.matches add column if not exists hp_remaining int;
alter table public.matches add column if not exists hp_lost int;

-- ── 2) „Nustatyk reikšmę" progresas (play_factions_unique) ─────────────────
-- Skirtingų frakcijų kaladžių skaičius per dieną nėra didėjimas po 1 —
-- perskaičiuojam iš dienos kovų ir NUSTATOM absoliučią reikšmę.
create or replace function public.rvn__quests_set_progress(
  p_uid uuid, p_objective text, p_value int
) returns void language plpgsql security definer set search_path = public as $$
declare v_dk date := public.rvn__utc_date();
begin
  if p_uid is null or coalesce(p_value,0) <= 0 then return; end if;
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, greatest(q.progress, p_value)),
        is_completed = (greatest(q.progress, p_value) >= q.target_value),
        completed_at = case when greatest(q.progress, p_value) >= q.target_value and q.completed_at is null
                            then now() else q.completed_at end
  where q.user_id = p_uid and q.date_key = v_dk and not q.is_completed
    and q.objective_type = p_objective;
end $$;

-- ── 3) rvn_report_match_stats v2 — visos metrikos ──────────────────────────
create or replace function public.rvn_report_match_stats(
  p_client_match_id uuid, p_stats jsonb, p_deck_faction_id int default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_m public.matches%rowtype;
  v_dk date := public.rvn__utc_date();
  n_creatures int; n_spells int; n_damage int; n_face int; n_kills int; n_draw int;
  n_artifacts int; n_field int; n_react_set int; n_react_trig int; n_bcry int;
  n_lastwish int; n_summon int; n_status int; n_heal int; n_champ int; n_gold int;
  n_curse int; n_turns int; n_hp_left int; n_hp_lost int; v_factions int;
  i int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_m from public.matches
    where user_id = v_uid and client_match_id = p_client_match_id for update;
  if v_m.id is null then return jsonb_build_object('error','match_not_found'); end if;
  if v_m.stats_reported_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  -- saugus skaitymas (trūkstami laukai = 0)
  n_creatures  := greatest(0, coalesce((p_stats->>'creaturesPlayed')::int, 0));
  n_spells     := greatest(0, coalesce((p_stats->>'spellsPlayed')::int, 0));
  n_damage     := greatest(0, coalesce((p_stats->>'damageDealt')::int, 0));
  n_face       := greatest(0, coalesce((p_stats->>'faceDamage')::int, 0));
  n_kills      := greatest(0, coalesce((p_stats->>'creaturesKilled')::int, 0));
  n_draw       := greatest(0, coalesce((p_stats->>'cardsDrawn')::int, 0));
  n_artifacts  := greatest(0, coalesce((p_stats->>'artifactsPlayed')::int, 0));
  n_field      := greatest(0, coalesce((p_stats->>'fieldPlayed')::int, 0));
  n_react_set  := greatest(0, coalesce((p_stats->>'reactionsSet')::int, 0));
  n_react_trig := greatest(0, coalesce((p_stats->>'reactionsTriggered')::int, 0));
  n_bcry       := greatest(0, coalesce((p_stats->>'battlecries')::int, 0));
  n_lastwish   := greatest(0, coalesce((p_stats->>'lastwishes')::int, 0));
  n_summon     := greatest(0, coalesce((p_stats->>'summonsByEffect')::int, 0));
  n_status     := greatest(0, coalesce((p_stats->>'statusesApplied')::int, 0));
  n_heal       := greatest(0, coalesce((p_stats->>'healDone')::int, 0));
  n_champ      := greatest(0, coalesce((p_stats->>'championAbilities')::int, 0));
  n_gold       := greatest(0, coalesce((p_stats->>'goldSpent')::int, 0));
  n_curse      := greatest(0, coalesce((p_stats->>'cursesActivated')::int, 0));
  n_turns      := greatest(0, coalesce((p_stats->>'turns')::int, coalesce(v_m.turns_played, 0)));
  n_hp_left    := greatest(0, coalesce((p_stats->>'hpRemaining')::int, 0));
  n_hp_lost    := greatest(0, coalesce((p_stats->>'hpLost')::int, 0));

  update public.matches set
      creatures_played = n_creatures, spells_played = n_spells, damage_dealt = n_damage,
      face_damage = n_face, creatures_killed = n_kills, cards_drawn = n_draw,
      artifacts_played = n_artifacts, field_played = n_field,
      reactions_set = n_react_set, reactions_triggered = n_react_trig,
      battlecries = n_bcry, lastwishes = n_lastwish, summons_by_effect = n_summon,
      statuses_applied = n_status, heal_done = n_heal, champion_abilities = n_champ,
      gold_spent = n_gold, curses_activated = n_curse,
      hp_remaining = n_hp_left, hp_lost = n_hp_lost,
      deck_faction_id = p_deck_faction_id, stats_reported_at = now()
    where id = v_m.id;

  if not v_m.valid_for_rewards then
    return jsonb_build_object('ok', true, 'duplicate', false, 'counted', false);
  end if;

  perform public.rvn__ensure_daily_quests(v_uid);

  -- kiekybinės metrikos
  perform public.rvn__quests_progress(v_uid, 'play_creatures',    n_creatures,  null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'play_spells',       n_spells,     null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'deal_damage',       n_damage,     null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'face_damage',       n_face,       null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'kill_creatures',    n_kills,      null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'draw_cards',        n_draw,       null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'play_artifacts',    n_artifacts,  null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'play_field',        n_field,      null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'set_reactions',     n_react_set,  null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'trigger_reactions', n_react_trig, null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'trigger_battlecry', n_bcry,       null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'trigger_lastwish',  n_lastwish,   null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'summon_by_effect',  n_summon,     null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'apply_status',      n_status,     null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'heal_done',         n_heal,       null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'champion_ability',  n_champ,      null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'spend_gold',        n_gold,       null, v_m.mode);
  perform public.rvn__quests_progress(v_uid, 'curses_activated',  n_curse,      null, v_m.mode);

  -- ištvermė: geriausias vienos kovos ėjimų skaičius (ne suma)
  perform public.rvn__quests_set_progress(v_uid, 'survive_turns', n_turns);

  -- sąlyginės pergalės
  if v_m.result = 'win' then
    if p_deck_faction_id is not null then
      perform public.rvn__quests_progress(v_uid, 'win_faction_match', 1, p_deck_faction_id, v_m.mode);
    end if;
    if n_hp_lost <= 10 then
      perform public.rvn__quests_progress(v_uid, 'win_flawless', 1, null, v_m.mode);
    end if;
    if n_turns > 0 and n_turns <= 8 then
      perform public.rvn__quests_progress(v_uid, 'win_fast', 1, null, v_m.mode);
    end if;
    if n_hp_left >= 25 then
      perform public.rvn__quests_progress(v_uid, 'win_hp_remaining', 1, null, v_m.mode);
    end if;
  end if;

  -- skirtingų frakcijų kaladės per dieną (absoliuti reikšmė)
  select count(distinct m.deck_faction_id) into v_factions
    from public.matches m
   where m.user_id = v_uid and m.deck_faction_id is not null
     and m.valid_for_rewards
     and (m.created_at at time zone 'UTC')::date = v_dk;
  perform public.rvn__quests_set_progress(v_uid, 'play_factions_unique', coalesce(v_factions, 0));

  return jsonb_build_object('ok', true, 'duplicate', false, 'counted', true);
end $$;

-- ── 4) Terminologija seniems šablonams (raktai → naujas standartas) ────────
update public.daily_quest_templates
   set title_key = 'quests.v2.playAi.title', desc_key = 'quests.v2.playAi.desc'
 where mode_restriction = 'bot' and objective_type = 'play_match';
update public.daily_quest_templates
   set title_key = 'quests.v2.winAi.title', desc_key = 'quests.v2.winAi.desc'
 where mode_restriction = 'bot' and objective_type = 'win_match';

-- ── 5) 50 užduočių bankas ──────────────────────────────────────────────────
-- (kodai nauji ten, kur keitėsi prasmė; seni kodai lieka lentelėje dėl FK iš
--  user_daily_quests_v2, bet dubliai išjungiami žemiau.)
insert into public.daily_quest_templates
  (code, difficulty, objective_type, target_value, mode_restriction, requires_pvp, requires_faction, requires_stats, conflict_group, weight, title_key, desc_key) values
 -- ── LENGVOS (17) ──
 ('easy_play_1',         'easy','play_match',        1, null,      false,false,false,'play_match',      10,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('easy_play_2',         'easy','play_match',        2, null,      false,false,false,'play_match',       8,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('easy_play_ai_2',      'easy','play_match',        2, 'bot',     false,false,false,'play_ai',         10,'quests.v2.playAi.title','quests.v2.playAi.desc'),
 ('easy_win_1',          'easy','win_match',         1, null,      false,false,false,'win_match',       10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('easy_win_ai_1',       'easy','win_match',         1, 'bot',     false,false,false,'win_ai',          10,'quests.v2.winAi.title','quests.v2.winAi.desc'),
 ('easy_creatures_5',    'easy','play_creatures',    5, null,      false,false,true, 'play_creatures',  10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('easy_spells_3',       'easy','play_spells',       3, null,      false,false,true, 'play_spells',     10,'quests.v2.playSpells.title','quests.v2.playSpells.desc'),
 ('easy_damage_30',      'easy','deal_damage',      30, null,      false,false,true, 'deal_damage',      9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('easy_face_20',        'easy','face_damage',      20, null,      false,false,true, 'face_damage',      9,'quests.v2.faceDamage.title','quests.v2.faceDamage.desc'),
 ('easy_kill_3',         'easy','kill_creatures',    3, null,      false,false,true, 'kill_creatures',   9,'quests.v2.killCreatures.title','quests.v2.killCreatures.desc'),
 ('easy_draw_10',        'easy','draw_cards',       10, null,      false,false,true, 'cards',            8,'quests.v2.drawCards.title','quests.v2.drawCards.desc'),
 ('easy_artifacts_1',    'easy','play_artifacts',    1, null,      false,false,true, 'artifacts',        7,'quests.v2.playArtifacts.title','quests.v2.playArtifacts.desc'),
 ('easy_reaction_set_2', 'easy','set_reactions',     2, null,      false,false,true, 'reactions',        7,'quests.v2.setReactions.title','quests.v2.setReactions.desc'),
 ('easy_battlecry_3',    'easy','trigger_battlecry', 3, null,      false,false,true, 'keywords',         8,'quests.v2.triggerBattlecry.title','quests.v2.triggerBattlecry.desc'),
 ('easy_status_3',       'easy','apply_status',      3, null,      false,false,true, 'status',           8,'quests.v2.applyStatus.title','quests.v2.applyStatus.desc'),
 ('easy_gold_800',       'easy','spend_gold',      800, null,      false,false,true, 'economy',          7,'quests.v2.spendGold.title','quests.v2.spendGold.desc'),
 ('easy_survive_8',      'easy','survive_turns',     8, null,      false,false,true, 'tempo',            7,'quests.v2.surviveTurns.title','quests.v2.surviveTurns.desc'),
 -- ── VIDUTINĖS (17) ──
 ('med_play_3',          'medium','play_match',      3, null,      false,false,false,'play_match',      10,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('med_win_2',           'medium','win_match',       2, null,      false,false,false,'win_match',       10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('med_win_ai_2',        'medium','win_match',       2, 'bot',     false,false,false,'win_ai',          10,'quests.v2.winAi.title','quests.v2.winAi.desc'),
 ('med_play_ai_4',       'medium','play_match',      4, 'bot',     false,false,false,'play_ai',          8,'quests.v2.playAi.title','quests.v2.playAi.desc'),
 ('med_pvp_play_1',      'medium','play_match',      1, 'unranked',true, false,false,'pvp',              6,'quests.v2.pvpPlay.title','quests.v2.pvpPlay.desc'),
 ('med_faction_win_1',   'medium','win_faction_match',1,null,      false,true, true, 'faction',          7,'quests.v2.factionWin.title','quests.v2.factionWin.desc'),
 ('med_creatures_12',    'medium','play_creatures',  12,null,      false,false,true, 'play_creatures',  10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('med_spells_8',        'medium','play_spells',      8,null,      false,false,true, 'play_spells',     10,'quests.v2.playSpells.title','quests.v2.playSpells.desc'),
 ('med_damage_80',       'medium','deal_damage',     80,null,      false,false,true, 'deal_damage',      9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('med_face_60',         'medium','face_damage',     60,null,      false,false,true, 'face_damage',      9,'quests.v2.faceDamage.title','quests.v2.faceDamage.desc'),
 ('med_kill_8',          'medium','kill_creatures',   8,null,      false,false,true, 'kill_creatures',   9,'quests.v2.killCreatures.title','quests.v2.killCreatures.desc'),
 ('med_reaction_trig_3', 'medium','trigger_reactions',3,null,      false,false,true, 'reactions',        7,'quests.v2.triggerReactions.title','quests.v2.triggerReactions.desc'),
 ('med_lastwish_4',      'medium','trigger_lastwish', 4,null,      false,false,true, 'keywords',         7,'quests.v2.triggerLastwish.title','quests.v2.triggerLastwish.desc'),
 ('med_champion_3',      'medium','champion_ability', 3,null,      false,false,true, 'champion',         7,'quests.v2.championAbility.title','quests.v2.championAbility.desc'),
 ('med_summon_effect_5', 'medium','summon_by_effect', 5,null,      false,false,true, 'summon',           7,'quests.v2.summonByEffect.title','quests.v2.summonByEffect.desc'),
 ('med_heal_25',         'medium','heal_done',       25,null,      false,false,true, 'heal',             7,'quests.v2.healDone.title','quests.v2.healDone.desc'),
 ('med_win_clean_1',     'medium','win_flawless',     1,null,      false,false,true, 'win_special',      6,'quests.v2.winFlawless.title','quests.v2.winFlawless.desc'),
 -- ── SUNKIOS (16) ──
 ('hard_play_5',         'hard','play_match',         5,null,      false,false,false,'play_match',       9,'quests.v2.playMatch.title','quests.v2.playMatch.desc'),
 ('hard_win_3',          'hard','win_match',          3,null,      false,false,false,'win_match',       10,'quests.v2.winMatch.title','quests.v2.winMatch.desc'),
 ('hard_win_ai_3',       'hard','win_match',          3,'bot',     false,false,false,'win_ai',          10,'quests.v2.winAi.title','quests.v2.winAi.desc'),
 ('hard_play_ai_7',      'hard','play_match',         7,'bot',     false,false,false,'play_ai',          8,'quests.v2.playAi.title','quests.v2.playAi.desc'),
 ('hard_ranked_win_1',   'hard','win_match',          1,'ranked',  true, false,false,'pvp',              6,'quests.v2.pvpWin.title','quests.v2.pvpWin.desc'),
 ('hard_faction_win_2',  'hard','win_faction_match',  2,null,      false,true, true, 'faction',          7,'quests.v2.factionWin.title','quests.v2.factionWin.desc'),
 ('hard_creatures_25',   'hard','play_creatures',    25,null,      false,false,true, 'play_creatures',  10,'quests.v2.playCreatures.title','quests.v2.playCreatures.desc'),
 ('hard_spells_15',      'hard','play_spells',       15,null,      false,false,true, 'play_spells',      9,'quests.v2.playSpells.title','quests.v2.playSpells.desc'),
 ('hard_damage_150',     'hard','deal_damage',      150,null,      false,false,true, 'deal_damage',      9,'quests.v2.dealDamage.title','quests.v2.dealDamage.desc'),
 ('hard_face_120',       'hard','face_damage',      120,null,      false,false,true, 'face_damage',      9,'quests.v2.faceDamage.title','quests.v2.faceDamage.desc'),
 ('hard_kill_15',        'hard','kill_creatures',    15,null,      false,false,true, 'kill_creatures',   9,'quests.v2.killCreatures.title','quests.v2.killCreatures.desc'),
 ('hard_win_fast_1',     'hard','win_fast',           1,null,      false,false,true, 'win_special',      6,'quests.v2.winFast.title','quests.v2.winFast.desc'),
 ('hard_win_hp_1',       'hard','win_hp_remaining',   1,null,      false,false,true, 'win_special',      6,'quests.v2.winHp.title','quests.v2.winHp.desc'),
 ('hard_factions_2',     'hard','play_factions_unique',2,null,     false,false,true, 'faction',          6,'quests.v2.factionsUnique.title','quests.v2.factionsUnique.desc'),
 ('hard_field_3',        'hard','play_field',         3,null,      false,false,true, 'field',            6,'quests.v2.playField.title','quests.v2.playField.desc'),
 ('hard_curses_5',       'hard','curses_activated',   5,null,      false,false,true, 'curse',            6,'quests.v2.cursesActivated.title','quests.v2.cursesActivated.desc')
on conflict (code) do update set
  difficulty = excluded.difficulty, objective_type = excluded.objective_type,
  target_value = excluded.target_value, mode_restriction = excluded.mode_restriction,
  requires_pvp = excluded.requires_pvp, requires_faction = excluded.requires_faction,
  requires_stats = excluded.requires_stats, conflict_group = excluded.conflict_group,
  weight = excluded.weight, title_key = excluded.title_key, desc_key = excluded.desc_key,
  is_active = true, updated_at = now();

-- ── 6) Seni dublikatai — išjungiami (eilutės lieka dėl FK) ─────────────────
update public.daily_quest_templates set is_active = false, updated_at = now()
 where code in ('easy_win_bot_1','med_win_bot_2','hard_win_bot_3','med_play_bot_4','hard_play_bot_7','hard_pvp_win_1');

-- ── 7) Įjungiam telemetrijos questus ───────────────────────────────────────
update public.economy_config
   set value = jsonb_set(value, '{generation,enable_stat_objectives}', 'true'::jsonb, true)
 where key = 'daily_quests_v2';

-- ── 8) Sveikatos patikra (matoma migracijos log'e) ─────────────────────────
do $$
declare v_all int; v_e int; v_m int; v_h int;
begin
  select count(*) into v_all from public.daily_quest_templates where is_active;
  select count(*) into v_e   from public.daily_quest_templates where is_active and difficulty='easy';
  select count(*) into v_m   from public.daily_quest_templates where is_active and difficulty='medium';
  select count(*) into v_h   from public.daily_quest_templates where is_active and difficulty='hard';
  raise notice 'daily_quest_templates: aktyvūs=% (easy=%, medium=%, hard=%)', v_all, v_e, v_m, v_h;
  if v_e = 0 or v_m = 0 or v_h = 0 then
    raise exception 'Kiekvienam sudėtingumui privalo likti bent po vieną aktyvų šabloną';
  end if;
end $$;
