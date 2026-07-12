-- ══════════════════════════════════════════════════════════════════════════════
-- BUG FIX: dienos užduotys (user_daily_tasks) neprogresuoja, jei žaidėjas dar
-- NEBUVO atsidaręs Hub'o/užduočių tą dieną.
--
-- Priežastis: eilutės `user_daily_tasks` generuojamos TINGIAI (`rvn_get_daily_tasks`),
-- o progresą skaičiuoja trigeris ant `matches`, kuris tik UPDATE'ina JAU esančias
-- eilutes. Jei žaidėjas iš karto po prisijungimo (arba po dienos ribos 05:00)
-- eina į kovą — eilučių nėra, `update` paliečia 0 eilučių → progreso nėra.
-- Vėliau atsidarius Hub'ą eilutės sugeneruojamos jau su progress = 0.
--
-- Sprendimas:
--   1) `rvn__ensure_daily_tasks(uid)` — generavimas išskirtas į atskirą funkciją;
--   2) trigeris ant `matches` PIRMA užtikrina eilutes, tik tada didina progresą;
--   3) generuojant eilutes progresas BACKFILL'inamas iš šiandienos galiojančių kovų
--      (kad jau sužaistos kovos nedingtų).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1) Generavimas + backfill ───────────────────────────────────────────────
create or replace function public.rvn__ensure_daily_tasks(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dk text := public.rvn__daily_key();
  v_diff text; v_used text[] := '{}'; v_tpl record; v_cnt int;
begin
  if p_uid is null then return; end if;

  select count(*) into v_cnt from public.user_daily_tasks where user_id = p_uid and date_key = v_dk;
  if v_cnt = 0 then
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

    -- saugiklis: jei dėl bet kokios priežasties nieko neįsirašė
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

    -- ── BACKFILL: šiandien jau sužaistos GALIOJANČIOS kovos ────────────────
    -- (kovos, sužaistos prieš sugeneruojant užduotis, nebedingsta)
    update public.user_daily_tasks t
      set progress = least(t.target_value, x.done),
          is_completed = (x.done >= t.target_value),
          completed_at = case when x.done >= t.target_value and t.completed_at is null then now() else t.completed_at end
    from (
      select
        count(*) filter (where true)                                            as play_match,
        count(*) filter (where m.result = 'win')                                as win_match,
        count(*) filter (where m.result = 'win' and m.mode = 'bot')             as win_bot,
        count(*) filter (where m.result = 'win' and m.mode = 'unranked')        as win_unranked,
        count(*) filter (where m.result = 'win' and m.mode = 'ranked')          as win_ranked,
        count(*) filter (where m.mode = 'ranked')                               as play_ranked
      from public.matches m
      where m.user_id = p_uid and m.valid_for_rewards
        and to_char((m.created_at - interval '5 hours')::date, 'YYYY-MM-DD') = v_dk
    ) c
    cross join lateral (
      select case t.objective_type
        when 'play_match'   then c.play_match
        when 'win_match'    then c.win_match
        when 'win_bot'      then c.win_bot
        when 'win_unranked' then c.win_unranked
        when 'win_ranked'   then c.win_ranked
        when 'play_ranked'  then c.play_ranked
        else 0 end as done
    ) x
    where t.user_id = p_uid and t.date_key = v_dk and not t.is_completed and x.done > 0;
  end if;
end $$;

grant execute on function public.rvn__ensure_daily_tasks(uuid) to authenticated;

-- ── 2) Trigeris: PIRMA užtikrinam eilutes, tik tada progresas ───────────────
create or replace function public.rvn__daily_task_from_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_dk text := public.rvn__daily_key();
begin
  if not NEW.valid_for_rewards then return NEW; end if;

  -- KRITINIS FIX: jei žaidėjas šiandien dar neatsidarė užduočių — sugeneruojam
  perform public.rvn__ensure_daily_tasks(NEW.user_id);

  update public.user_daily_tasks t
    set progress = least(t.target_value, t.progress + 1),
        is_completed = (t.progress + 1 >= t.target_value),
        completed_at = case when (t.progress + 1 >= t.target_value) and t.completed_at is null then now() else t.completed_at end
  where t.user_id = NEW.user_id and t.date_key = v_dk and not t.is_completed
    and (
      t.objective_type = 'play_match'
      or (t.objective_type = 'win_match'    and NEW.result = 'win')
      or (t.objective_type = 'win_bot'      and NEW.result = 'win' and NEW.mode = 'bot')
      or (t.objective_type = 'win_unranked' and NEW.result = 'win' and NEW.mode = 'unranked')
      or (t.objective_type = 'win_ranked'   and NEW.result = 'win' and NEW.mode = 'ranked')
      or (t.objective_type = 'play_ranked'  and NEW.mode = 'ranked')
    );
  return NEW;
end $$;

drop trigger if exists trg_daily_task_from_match on public.matches;
create trigger trg_daily_task_from_match after insert on public.matches
  for each row execute function public.rvn__daily_task_from_match();

-- ── 3) rvn_get_daily_tasks: naudoja bendrą generavimą (be dubliavimo) ───────
create or replace function public.rvn_get_daily_tasks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk text := public.rvn__daily_key();
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;

  perform public.rvn__ensure_daily_tasks(v_uid);

  return jsonb_build_object(
    'dateKey', v_dk,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'templateId', template_id, 'difficulty', difficulty, 'objectiveType', objective_type,
        'title', title, 'description', description, 'progress', progress, 'target', target_value,
        'rewardPayload', reward_payload, 'completed', is_completed, 'claimed', is_claimed)
        order by case difficulty when 'easy' then 1 when 'medium' then 2 else 3 end)
      from public.user_daily_tasks where user_id = v_uid and date_key = v_dk), '[]'::jsonb),
    'allDone', coalesce((select count(*) = 3 and bool_and(is_completed)
      from public.user_daily_tasks where user_id = v_uid and date_key = v_dk), false),
    'chestClaimed', coalesce((select is_claimed
      from public.user_daily_completion where user_id = v_uid and date_key = v_dk), false),
    'reroll', coalesce((select jsonb_build_object('freeUsed', free_reroll_used, 'paidCount', paid_reroll_count)
      from public.user_daily_rerolls where user_id = v_uid and date_key = v_dk),
      jsonb_build_object('freeUsed', false, 'paidCount', 0))
  );
end $$;

grant execute on function public.rvn_get_daily_tasks() to authenticated;
