-- ════════════════════════════════════════════════════════════════════════════
-- FIX: kampanija neprogresuoja po STORY_ONLY (Prologo) cutscene.
-- Priežastis: rvn_campaign_complete_node grantina atlygį per rvn__grant_payload
-- su source_type='campaign_mission', kurio NĖRA xp_transactions CHECK sąraše →
-- INSERT meta klaidą → atsisuka VISA RPC transakcija → mazgai neatrakinami.
-- Sprendimas: (1) prideti 'campaign_mission' (+ kitas) į CHECK; (2) apgaubti
-- atlygio dalį exception-saugiu bloku, kad atlygis NIEKADA nelaužytų progreso.
-- ════════════════════════════════════════════════════════════════════════════

-- (1) EXP šaltinių CHECK — dinamiškai: visos esamos reikšmės + žinomas sąrašas + naujos
do $$
declare v_existing text; v_list text;
begin
  alter table public.xp_transactions drop constraint if exists xp_transactions_source_type_check;
  select string_agg(v, ',') into v_existing
    from (select distinct quote_literal(source_type) as v from public.xp_transactions) q;
  v_list := coalesce(nullif(v_existing, ''), '');
  if v_list <> '' then v_list := v_list || ','; end if;
  v_list := v_list || $q$'event_attendance','deck_published','deck_upvote_received','deck_downvote_received','deck_copied','collection_milestone','manual_admin_adjustment','badge_unlocked','ranked_match','ranked_reward','ranked_achievement','ranked_season','daily_quest','login_streak','season_pass','campaign_mission'$q$;
  execute 'alter table public.xp_transactions add constraint xp_transactions_source_type_check check (source_type in (' || v_list || '))';
exception when others then null;
end $$;

-- (2) Perkuriam complete_node su apsaugotu atlygiu (atlygis nelaužo progreso)
create or replace function public.rvn_campaign_complete_node(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_node public.campaign_nodes;
  v_camp uuid;
  v_node_id uuid := (p_payload->>'nodeId')::uuid;
  v_result text := coalesce(p_payload->>'result','win');
  v_stars int := greatest(0, least(3, coalesce((p_payload->>'stars')::int, 1)));
  v_objs jsonb := coalesce(p_payload->'objectives', '[]'::jsonb);
  v_choice text := p_payload->>'choiceKey';
  v_prog public.campaign_progress;
  v_already boolean;
  v_unlock uuid[] := '{}';
  v_nxt uuid;
  v_nrule jsonb;
  v_can boolean;
  v_prev uuid;
  v_prev_done boolean;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select * into v_node from public.campaign_nodes where id = v_node_id;
  if v_node.id is null then raise exception 'node not found'; end if;
  v_camp := v_node.campaign_id;

  perform public.rvn_campaign_state(v_camp);
  select * into v_prog from public.campaign_progress where user_id=v_uid and campaign_id=v_camp;

  if v_result = 'lose' then
    update public.campaign_progress
      set failed_attempts = jsonb_set(failed_attempts, array[v_node_id::text],
            to_jsonb(coalesce((failed_attempts->>v_node_id::text)::int,0)+1)),
          last_node_id = v_node_id, updated_at = now()
      where user_id=v_uid and campaign_id=v_camp;
    return jsonb_build_object('ok', true, 'result','lose');
  end if;

  v_already := v_node_id = any(v_prog.completed_node_ids);

  foreach v_nxt in array coalesce(v_node.next_node_ids, '{}'::uuid[]) loop
    select unlock_rule into v_nrule from public.campaign_nodes where id = v_nxt;
    v_can := true;
    if coalesce(v_nrule->>'type','all_prev') = 'all_prev' then
      for v_prev in select unnest(prev_node_ids) from public.campaign_nodes where id = v_nxt loop
        v_prev_done := v_prev = any(v_prog.completed_node_ids) or v_prev = v_node_id;
        if not v_prev_done then v_can := false; end if;
      end loop;
    end if;
    if v_can then v_unlock := array_append(v_unlock, v_nxt); end if;
  end loop;

  update public.campaign_progress p set
    completed_node_ids = (select array(select distinct e from unnest(p.completed_node_ids || array[v_node_id]) e)),
    unlocked_node_ids  = (select array(select distinct e from unnest(p.unlocked_node_ids || array[v_node_id] || v_unlock) e)),
    node_stars       = jsonb_set(p.node_stars, array[v_node_id::text],
                         to_jsonb(greatest(coalesce((p.node_stars->>v_node_id::text)::int,0), v_stars))),
    node_objectives  = jsonb_set(p.node_objectives, array[v_node_id::text], v_objs),
    choices          = case when v_choice is null then p.choices
                            else jsonb_set(p.choices, array[v_node_id::text], to_jsonb(v_choice)) end,
    current_chapter_id = coalesce(v_node.chapter_id, p.current_chapter_id),
    last_node_id     = v_node_id, updated_at = now()
  where p.user_id=v_uid and p.campaign_id=v_camp;

  -- Atlygis (TIK pirmą kartą) — apsaugotas: jokia atlygio klaida nelaužo progreso/atrakinimo
  if not v_already and v_node.reward_payload is not null and v_node.reward_payload <> '{}'::jsonb then
    begin
      perform public.rvn__grant_payload(v_uid, v_node.reward_payload, 'campaign_mission');
      update public.campaign_progress
        set rewards_claimed = (select array(select distinct e from unnest(rewards_claimed || array[v_node_id]) e))
        where user_id=v_uid and campaign_id=v_camp;
    exception when others then null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'result','win',
    'firstClear', not v_already, 'stars', v_stars, 'unlocked', to_jsonb(v_unlock));
end $$;
grant execute on function public.rvn_campaign_complete_node(jsonb) to authenticated;
