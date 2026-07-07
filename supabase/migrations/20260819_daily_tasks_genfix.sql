-- ════════════════════════════════════════════════════════════════════════════
--  Fix: dienos užduotys prod'e nesigeneruodavo (user_daily_completion eilutės
--  kūrėsi, bet user_daily_tasks likdavo tuščia → UI „Šiandien užduočių nėra").
--  Priežastis: prod'e buvusi senesnė rvn_get_daily_tasks versija.
--  Čia — sutvirtinta generacija: (1) aiškus template kiekio check,
--  (2) fallback be objective_type filtro, (3) galutinis saugiklis — jei po
--  ciklo vis tiek 0 užduočių, įrašomi bet kurie 3 aktyvūs šablonai.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_get_daily_tasks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_dk text := public.rvn__daily_key();
  v_diff text; v_used text[] := '{}'; v_tpl record; v_cnt int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;

  select count(*) into v_cnt from public.user_daily_tasks where user_id=v_uid and date_key=v_dk;
  if v_cnt = 0 then
    foreach v_diff in array array['easy','medium','hard'] loop
      select * into v_tpl from public.daily_task_templates
        where is_active and difficulty=v_diff and not (objective_type = any(v_used))
        order by random() * weight desc limit 1;
      if not found then
        select * into v_tpl from public.daily_task_templates where is_active and difficulty=v_diff order by random() limit 1;
      end if;
      if found then
        v_used := array_append(v_used, v_tpl.objective_type);
        insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type, title, description, target_value, reward_payload)
          values (v_uid, v_tpl.id, v_dk, v_diff, v_tpl.objective_type, v_tpl.title, v_tpl.description, v_tpl.target_value, v_tpl.reward_payload)
          on conflict (user_id, date_key, difficulty) do nothing;
      end if;
    end loop;

    -- galutinis saugiklis: jei dėl bet kokios priežasties nieko neįsirašė,
    -- imame bet kuriuos 3 aktyvius šablonus (po vieną difficulty, jei yra)
    select count(*) into v_cnt from public.user_daily_tasks where user_id=v_uid and date_key=v_dk;
    if v_cnt = 0 then
      insert into public.user_daily_tasks(user_id, template_id, date_key, difficulty, objective_type, title, description, target_value, reward_payload)
      select v_uid, t.id, v_dk, t.difficulty, t.objective_type, t.title, t.description, t.target_value, t.reward_payload
      from (
        select distinct on (difficulty) * from public.daily_task_templates
        where is_active order by difficulty, random()
      ) t
      on conflict (user_id, date_key, difficulty) do nothing;
    end if;

    insert into public.user_daily_completion(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
    insert into public.user_daily_rerolls(user_id, date_key) values (v_uid, v_dk) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'dateKey', v_dk,
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id',id,'difficulty',difficulty,'objectiveType',objective_type,
        'title',title,'description',description,'progress',progress,'target',target_value,
        'rewardPayload',reward_payload,'completed',is_completed,'claimed',is_claimed)
        order by case difficulty when 'easy' then 1 when 'medium' then 2 else 3 end)
      from public.user_daily_tasks where user_id=v_uid and date_key=v_dk), '[]'::jsonb),
    'allDone', coalesce((select count(*)=3 and bool_and(is_completed) from public.user_daily_tasks where user_id=v_uid and date_key=v_dk), false),
    'chestClaimed', coalesce((select is_claimed from public.user_daily_completion where user_id=v_uid and date_key=v_dk), false),
    'reroll', coalesce((select jsonb_build_object('freeUsed',free_reroll_used,'paidCount',paid_reroll_count) from public.user_daily_rerolls where user_id=v_uid and date_key=v_dk), '{"freeUsed":false,"paidCount":0}'::jsonb)
  );
end $$;

grant execute on function public.rvn_get_daily_tasks() to authenticated;
