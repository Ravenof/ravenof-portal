-- ════════════════════════════════════════════════════════════════════════════
--  PROGRESSION v2 — DIENOS UŽDUOČIŲ PATAISOS
--  ─────────────────────────────────────────────────────────────────────────
--  Rasta tikrinant „dienos užduotys neveikia":
--   1) `mode_restriction` buvo ignoruojamas skaičiuojant progresą — questas
--      „Laimėk kovą su botu" užsiskaitydavo iš BET KOKIOS pergalės (taip pat
--      reitinguotos / nereitinguotos). Dabar režimas įrašomas į questo eilutę
--      ir tikrinamas didinant progresą.
--   2) Be telemetrijos (enable_stat_objectives=false) ir be PvP likdavo per
--      mažai šablonų → visos trys dienos užduotys tapdavo „Sužaisk N kovų".
--      Pridedami botų režimo šablonai medium/hard + atskiriama „win_bot"
--      konfliktų grupė → 3 skirtingos užduotys jau nuo pirmos dienos.
--   3) Jei kuriai nors sudėtingumo klasei nelikdavo tinkamo šablono, eilutė
--      būdavo praleidžiama → mažiau nei 3 questai → dienos skrynia NIEKADA
--      neatsidarydavo. Pridėta paskutinės išeities atsarga.
--   4) Generuojant užduotis nebuvo BACKFILL'inamos tą parą jau sužaistos
--      galiojančios kovos (v1 sistema tai darė) → progresas prapuldavo, jei
--      questai sugeneruojami po kovos (pvz. pirmą kartą pritaikius migracijas).
--  Logika, atlygiai ir ekonomika NEKEIČIAMI.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Režimo apribojimas keliauja į questo eilutę ─────────────────────────
alter table public.user_daily_quests_v2
  add column if not exists mode_restriction text;

update public.user_daily_quests_v2 q
  set mode_restriction = t.mode_restriction
  from public.daily_quest_templates t
  where t.code = q.template_code and q.mode_restriction is distinct from t.mode_restriction;

-- ── 2) Papildomi šablonai be telemetrijos ir be PvP ────────────────────────
--     (bot režimas prieinamas visiems žaidėjams nuo pirmos dienos)
insert into public.daily_quest_templates
  (code, difficulty, objective_type, target_value, mode_restriction, requires_pvp, requires_faction, requires_stats, conflict_group, weight, title_key, desc_key) values
 ('med_win_bot_2',  'medium','win_match', 2, 'bot', false,false,false,'win_bot', 10,'quests.v2.winBot.title','quests.v2.winBot.desc'),
 ('hard_win_bot_3', 'hard',  'win_match', 3, 'bot', false,false,false,'win_bot', 10,'quests.v2.winBot.title','quests.v2.winBot.desc'),
 ('med_play_bot_4', 'medium','play_match',4, 'bot', false,false,false,'play_bot', 8,'quests.v2.playBot.title','quests.v2.playBot.desc'),
 ('hard_play_bot_7','hard',  'play_match',7, 'bot', false,false,false,'play_bot', 8,'quests.v2.playBot.title','quests.v2.playBot.desc')
on conflict (code) do nothing;

-- „Laimėk su botu" turi savo konfliktų grupę — kitaip jis blokuodavo visus
-- kitus pergalių questus ir likdavo tik „sužaisk N kovų".
update public.daily_quest_templates set conflict_group = 'win_bot'
  where code = 'easy_win_bot_1' and conflict_group <> 'win_bot';

-- ── 3) Progresas — su režimo patikra ───────────────────────────────────────
drop function if exists public.rvn__quests_progress(uuid, text, int, int);

create or replace function public.rvn__quests_progress(
  p_uid uuid, p_objective text, p_amount int, p_faction int default null, p_mode text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_dk date := public.rvn__utc_date();
begin
  if p_uid is null or coalesce(p_amount,0) <= 0 then return; end if;
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, q.progress + p_amount),
        is_completed = (q.progress + p_amount >= q.target_value),
        completed_at = case when (q.progress + p_amount >= q.target_value) and q.completed_at is null
                            then now() else q.completed_at end
  where q.user_id = p_uid and q.date_key = v_dk and not q.is_completed
    and q.objective_type = p_objective
    and (q.faction_id is null or q.faction_id = p_faction)
    and (q.mode_restriction is null or q.mode_restriction = p_mode);
end $$;

-- ── 4) Trigeris perduoda kovos režimą ──────────────────────────────────────
create or replace function public.rvn__quests_from_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not NEW.valid_for_rewards then return NEW; end if;
  perform public.rvn__ensure_daily_quests(NEW.user_id);
  perform public.rvn__quests_progress(NEW.user_id, 'play_match', 1, null, NEW.mode);
  if NEW.result = 'win' then
    perform public.rvn__quests_progress(NEW.user_id, 'win_match', 1, null, NEW.mode);
  end if;
  return NEW;
end $$;

-- Telemetrijos questai režimo neriboja (mode_restriction null) — perduodam
-- tikrą kovos režimą, kad ateityje būtų galima riboti ir juos.
create or replace function public.rvn_report_match_stats(
  p_client_match_id uuid, p_stats jsonb, p_deck_faction_id int default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_m public.matches%rowtype; v_c int; v_s int; v_d int;
begin
  if v_uid is null then return jsonb_build_object('error','no_auth'); end if;
  select * into v_m from public.matches
    where user_id = v_uid and client_match_id = p_client_match_id for update;
  if v_m.id is null then return jsonb_build_object('error','match_not_found'); end if;
  if v_m.stats_reported_at is not null then return jsonb_build_object('ok', true, 'duplicate', true); end if;

  v_c := greatest(0, coalesce((p_stats->>'creaturesPlayed')::int, 0));
  v_s := greatest(0, coalesce((p_stats->>'spellsPlayed')::int, 0));
  v_d := greatest(0, coalesce((p_stats->>'damageDealt')::int, 0));

  update public.matches set creatures_played = v_c, spells_played = v_s, damage_dealt = v_d,
         deck_faction_id = p_deck_faction_id, stats_reported_at = now()
    where id = v_m.id;

  if v_m.valid_for_rewards then
    perform public.rvn__ensure_daily_quests(v_uid);
    perform public.rvn__quests_progress(v_uid, 'play_creatures', v_c, null, v_m.mode);
    perform public.rvn__quests_progress(v_uid, 'play_spells', v_s, null, v_m.mode);
    perform public.rvn__quests_progress(v_uid, 'deal_damage', v_d, null, v_m.mode);
    if v_m.result = 'win' and p_deck_faction_id is not null then
      perform public.rvn__quests_progress(v_uid, 'win_faction_match', 1, p_deck_faction_id, v_m.mode);
    end if;
  end if;
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- ── 5) Generavimas: garantuotai 3 questai + režimas + backfill ─────────────
create or replace function public.rvn__ensure_daily_quests(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dk date := public.rvn__utc_date(); v_cfg jsonb; v_diff text; v_t public.daily_quest_templates;
  v_groups text[] := '{}'; v_codes text[] := '{}'; v_fac int; v_factions int[];
  v_ver int := public.rvn__economy_version();
begin
  if p_uid is null then return; end if;
  if exists (select 1 from public.user_daily_quests_v2 where user_id=p_uid and date_key=v_dk) then return; end if;

  select value into v_cfg from public.economy_config where key='daily_quests_v2';
  v_factions := public.rvn__playable_deck_factions(p_uid);

  foreach v_diff in array array['easy','medium','hard'] loop
    v_t := public.rvn__pick_quest_template(p_uid, v_diff, v_groups, v_codes);
    -- paskutinė išeitis: geriau pasikartojanti užduotis nei jokios — kitaip
    -- žaidėjas turėtų < 3 questų ir dienos skrynia niekada neatsidarytų.
    if v_t.code is null then
      select * into v_t from public.daily_quest_templates t
       where t.is_active and t.difficulty = v_diff and not t.requires_stats and not t.requires_pvp
         and not t.requires_faction
       order by random() * t.weight desc limit 1;
    end if;
    if v_t.code is null then continue; end if;
    v_groups := array_append(v_groups, v_t.conflict_group);
    v_codes  := array_append(v_codes, v_t.code);
    v_fac := null;
    if v_t.requires_faction and array_length(v_factions,1) > 0 then
      v_fac := v_factions[1 + floor(random() * array_length(v_factions,1))::int];
    end if;
    insert into public.user_daily_quests_v2(user_id, date_key, difficulty, template_code, objective_type,
                                         target_value, faction_id, mode_restriction, rewards, economy_version)
      values (p_uid, v_dk, v_diff, v_t.code, v_t.objective_type, v_t.target_value, v_fac,
              v_t.mode_restriction, coalesce(v_cfg->'rewards'->v_diff, '[]'::jsonb), v_ver)
      on conflict (user_id, date_key, difficulty) do nothing;
  end loop;

  insert into public.user_daily_quest_meta(user_id, date_key) values (p_uid, v_dk) on conflict do nothing;

  -- ── BACKFILL: šią UTC parą jau sužaistos galiojančios kovos ──────────────
  --  Režimą ribojantiems questams — tik to režimo kovos; neribojantiems — visos.
  --  DĖMESIO: `update ... from (...) cross join lateral (... target_alias ...)`
  --  PostgreSQL'e NEGALIOJA (invalid reference to FROM-clause entry) — todėl
  --  „done" suskaičiuojamas atskirame použklausyje su savo alias'u.
  update public.user_daily_quests_v2 q
    set progress = least(q.target_value, d.done),
        is_completed = (d.done >= q.target_value),
        completed_at = case when d.done >= q.target_value and q.completed_at is null then now() else q.completed_at end
  from (
    select u.id,
           case u.objective_type when 'play_match' then s.played
                                 when 'win_match'  then s.won else 0 end as done
      from public.user_daily_quests_v2 u
      join (
        select m.mode, count(*) as played, count(*) filter (where m.result = 'win') as won
          from public.matches m
         where m.user_id = p_uid and m.valid_for_rewards
           and (m.created_at at time zone 'UTC')::date = v_dk
         group by m.mode
      ) s on s.mode = u.mode_restriction
     where u.user_id = p_uid and u.date_key = v_dk
    union all
    select u.id,
           case u.objective_type when 'play_match' then s.played
                                 when 'win_match'  then s.won else 0 end
      from public.user_daily_quests_v2 u
      cross join (
        select count(*) as played, count(*) filter (where m.result = 'win') as won
          from public.matches m
         where m.user_id = p_uid and m.valid_for_rewards
           and (m.created_at at time zone 'UTC')::date = v_dk
      ) s
     where u.user_id = p_uid and u.date_key = v_dk and u.mode_restriction is null
  ) d
  where q.id = d.id and not q.is_completed and d.done > 0;
end $$;

-- ── 6) Režimo apribojimas visada sinchronizuojamas su šablonu ─────────────
--     Taip padengiami VISI keliai (generavimas, reroll, admin taisymai) —
--     nereikia kartoti to paties `update` kelete funkcijų.
create or replace function public.rvn__quest_sync_mode()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select t.mode_restriction into NEW.mode_restriction
    from public.daily_quest_templates t where t.code = NEW.template_code;
  return NEW;
end $$;

drop trigger if exists trg_quest_sync_mode on public.user_daily_quests_v2;
create trigger trg_quest_sync_mode before insert or update of template_code
  on public.user_daily_quests_v2
  for each row execute function public.rvn__quest_sync_mode();

-- ── 7) Trigeris perkuriamas su nauja funkcija ──────────────────────────────
drop trigger if exists trg_quests_v2_from_match on public.matches;
create trigger trg_quests_v2_from_match after insert on public.matches
  for each row execute function public.rvn__quests_from_match();

grant execute on function public.rvn_report_match_stats(uuid, jsonb, int) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  KRITINIS: v1 (`user_daily_tasks`) generavimas buvo NEVEIKIANTIS
--  ─────────────────────────────────────────────────────────────────────────
--  20260835_daily_tasks_selfheal.sql backfill'e naudojama konstrukcija
--     update ... from (...) c cross join lateral (select ... t.objective_type ...)
--  PostgreSQL'e neteisėta — UPDATE tikslinės lentelės alias'o negalima naudoti
--  FROM sąrašo lateral'e. Sakinys metasi „invalid reference to FROM-clause
--  entry for table t", todėl VISAS `rvn__ensure_daily_tasks` kvietimas
--  atsukamas atgal:
--    • `rvn_get_daily_tasks()` (pagrindinis puslapis) grąžindavo klaidą →
--      dienos užduotys nesugeneruodavo NIEKADA;
--    • trigeris ant `matches` taip pat metėsi → pirmoji paros kova galėjo
--      nepasirašyti.
--  Čia sakinys perrašomas teisinga forma. Ekonomika/logika nekeičiama.
-- ════════════════════════════════════════════════════════════════════════════
do $do$
begin
  if to_regprocedure('public.rvn__ensure_daily_tasks(uuid)') is null then return; end if;

  create or replace function public.rvn__ensure_daily_tasks(p_uid uuid)
  returns void language plpgsql security definer set search_path = public as $fn$
  declare
    v_dk text := public.rvn__daily_key();
    v_diff text; v_used text[] := '{}'; v_tpl record; v_cnt int;
  begin
    if p_uid is null then return; end if;

    select count(*) into v_cnt from public.user_daily_tasks where user_id = p_uid and date_key = v_dk;
    if v_cnt <> 0 then return; end if;

    foreach v_diff in array array['easy','medium','hard'] loop
      select * into v_tpl from public.daily_task_templates
        where is_active and difficulty = v_diff and not (objective_type = any(v_used))
        order by random() * weight desc limit 1;
      if not found then
        select * into v_tpl from public.daily_task_templates
          where is_active and difficulty = v_diff order by random() limit 1;
      end if;
      if found then
        v_used := array_append(v_used, v_tpl.objective_type);
        insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type,
                                            title, description, target_value, reward_payload)
          values (p_uid, v_tpl.id, v_dk, v_diff, v_tpl.objective_type,
                  v_tpl.title, v_tpl.description, v_tpl.target_value, v_tpl.reward_payload)
          on conflict (user_id, date_key, difficulty) do nothing;
      end if;
    end loop;

    select count(*) into v_cnt from public.user_daily_tasks where user_id = p_uid and date_key = v_dk;
    if v_cnt = 0 then
      insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type,
                                          title, description, target_value, reward_payload)
      select p_uid, t.id, v_dk, t.difficulty, t.objective_type, t.title, t.description, t.target_value, t.reward_payload
      from (
        select distinct on (difficulty) * from public.daily_task_templates
        where is_active order by difficulty, random()
      ) t
      on conflict (user_id, date_key, difficulty) do nothing;
    end if;

    insert into public.user_daily_completion(user_id, date_key) values (p_uid, v_dk) on conflict do nothing;
    insert into public.user_daily_rerolls(user_id, date_key)  values (p_uid, v_dk) on conflict do nothing;

    -- BACKFILL (perrašyta teisinga forma)
    update public.user_daily_tasks t
      set progress = least(t.target_value, d.done),
          is_completed = (d.done >= t.target_value),
          completed_at = case when d.done >= t.target_value and t.completed_at is null then now() else t.completed_at end
    from (
      select u.id,
             case u.objective_type
               when 'play_match'   then c.play_match
               when 'win_match'    then c.win_match
               when 'win_bot'      then c.win_bot
               when 'win_unranked' then c.win_unranked
               when 'win_ranked'   then c.win_ranked
               when 'play_ranked'  then c.play_ranked
               else 0 end as done
        from public.user_daily_tasks u
        cross join (
          select
            count(*)                                                     as play_match,
            count(*) filter (where m.result = 'win')                     as win_match,
            count(*) filter (where m.result = 'win' and m.mode = 'bot')  as win_bot,
            count(*) filter (where m.result = 'win' and m.mode = 'unranked') as win_unranked,
            count(*) filter (where m.result = 'win' and m.mode = 'ranked')   as win_ranked,
            count(*) filter (where m.mode = 'ranked')                    as play_ranked
          from public.matches m
          where m.user_id = p_uid and m.valid_for_rewards
            and to_char((m.created_at - interval '5 hours')::date, 'YYYY-MM-DD') = v_dk
        ) c
       where u.user_id = p_uid and u.date_key = v_dk
    ) d
    where t.id = d.id and not t.is_completed and d.done > 0;
  end $fn$;
end
$do$;
