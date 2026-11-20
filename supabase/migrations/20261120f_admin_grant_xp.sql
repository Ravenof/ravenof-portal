-- ADMIN: skirti paskyros XP zaidejui (2026-11-20)
-- Nauja funkcija salia rvn_admin_grant_v2 (jos nekeiciam). XP eina per ta pati
-- atlygiu varikli kaip po kovos, todel lygis pakyla ir lygio atlygiai iskrenta iprastai.
-- Tik teigiama suma (XP nuimti negalima - lygio atlygiai jau butu isdalinti).

create or replace function public.rvn_admin_grant_xp(p_target uuid, p_amount int, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_admin uuid := auth.uid(); v_rewards jsonb;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then raise exception 'target not found'; end if;
  if coalesce(p_amount, 0) <= 0 then raise exception 'amount must be > 0'; end if;
  if p_amount > 1000000 then raise exception 'amount too large'; end if;

  perform public.rvn__grant_reward_payload(p_target,
    jsonb_build_array(jsonb_build_object('type', 'account_xp', 'amount', p_amount)),
    'admin', v_admin::text);
  v_rewards := public.rvn__check_level_rewards(p_target);

  insert into public.admin_grant_log(admin_id, target_id, kind, ref, ref_name, amount, note)
    values (v_admin, p_target, 'xp', null, 'xp', p_amount, p_note);

  return (select jsonb_build_object('ok', true, 'kind', 'xp', 'name', 'XP', 'amount', p_amount,
            'xp', coalesce(xp_total, 0), 'level', public.rvn__level_from_xp(coalesce(xp_total, 0)),
            'level_rewards', coalesce(v_rewards, '[]'::jsonb),
            'balances', jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence))
          from public.profiles where id = p_target);
end $$;
revoke all on function public.rvn_admin_grant_xp(uuid, int, text) from public, anon;
grant execute on function public.rvn_admin_grant_xp(uuid, int, text) to authenticated;
