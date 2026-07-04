-- ═══════════════════════════════════════════════════════════════════════════
--  Ravenof — Level-up atlygiai (daily/progression UX)
--  Lygio slenksčiai VEIDRODIS src/lib/gamification/levels.ts (source of truth).
--  Pakilus lygiu: auksas (100 + lygis*25) + pakuotės (kas 5 lvl = 1, kas 10 = 2).
--  rvn_report_match dabar grąžina ir 'levelReward' (klientas rodo šventėje).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Lygis iš XP (identiška levels.ts LEVEL_THRESHOLDS)
create or replace function public.rvn__level_from_xp(p_xp bigint)
returns int language plpgsql immutable as $$
declare
  t int[] := array[0,100,250,500,850,1250,1750,2350,3000,3750,4600,5500,6500,7600,8800,
    10100,11500,13000,14600,16300,18100,20000,22000,24100,26300,28600,31000,33500,36100,38800,
    41700,44800,48100,51600,55300,59200,63300,67600,72100,76800,81500,86000,90000,93500,96500,
    98000,99000,99500,99800,100000];
  i int;
begin
  for i in reverse 50..1 loop
    if p_xp >= t[i] then return i; end if;
  end loop;
  return 1;
end $$;

-- 2) Atlygis už pasiektą lygį (deterministinis; veidrodis levels.ts levelReward)
create or replace function public.rvn__level_reward(p_level int)
returns jsonb language plpgsql immutable as $$
declare v jsonb;
begin
  v := jsonb_build_object('gold', 100 + p_level * 25);
  if p_level % 10 = 0 then v := v || '{"boosters":2}'::jsonb;
  elsif p_level % 5 = 0 then v := v || '{"boosters":1}'::jsonb;
  end if;
  return v;
end $$;

-- 3) rvn_report_match: + level-up atlygiai už kiekvieną perliptą lygį
create or replace function public.rvn_report_match(p_won boolean, p_mode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_xp    int  := 0;
  v_before bigint := 0;
  v_after  bigint := 0;
  v_reason text;
  v_lb int; v_la int; v_lvl int;
  v_pay jsonb; v_gold int := 0; v_boost int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('xpGained', 0, 'totalBefore', 0, 'totalAfter', 0);
  end if;

  v_xp := case p_mode
    when 'pvp'        then case when p_won then 60 else 20 end
    when 'pve_hard'   then case when p_won then 45 else 12 end
    when 'pve_normal' then case when p_won then 25 else 8  end
    when 'pve_easy'   then case when p_won then 15 else 5  end
    else                   case when p_won then 20 else 6  end
  end;

  select coalesce(xp_total, 0) into v_before from public.profiles where id = v_uid;

  if v_xp > 0 then
    v_reason := case when p_won then 'Kovos pergalė' else 'Sužaista kova' end;
    insert into public.xp_transactions (user_id, amount, reason, source_type)
      values (v_uid, v_xp, v_reason, 'match');
  end if;

  select coalesce(xp_total, 0) into v_after from public.profiles where id = v_uid;
  v_after := greatest(v_after, v_before + v_xp);

  -- Level-up atlygiai (už kiekvieną perliptą lygį, jei peršoko kelis)
  v_lb := public.rvn__level_from_xp(v_before);
  v_la := public.rvn__level_from_xp(v_after);
  if v_la > v_lb then
    for v_lvl in (v_lb + 1)..v_la loop
      v_pay := public.rvn__level_reward(v_lvl);
      perform public.rvn__grant_payload(v_uid, v_pay, 'match');
      v_gold  := v_gold  + coalesce((v_pay->>'gold')::int, 0);
      v_boost := v_boost + coalesce((v_pay->>'boosters')::int, 0);
    end loop;
  end if;

  return jsonb_build_object(
    'xpGained',    v_xp,
    'totalBefore', v_before,
    'totalAfter',  v_after,
    'levelReward', case when v_la > v_lb
      then jsonb_build_object('gold', v_gold, 'boosters', v_boost)
      else null end
  );
end $$;

grant execute on function public.rvn_report_match(boolean, text) to authenticated;
