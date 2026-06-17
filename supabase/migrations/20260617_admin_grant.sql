-- ── Admin: skirti auksą ir pakuotes vartotojams ──────────────────────────────
-- rvn_admin_grant: tik admin (profiles.role='admin') gali pridėti auksą ir/arba
-- pakuotes pasirinktam vartotojui. SECURITY DEFINER (apeina RLS su patikra).

create or replace function public.rvn_admin_grant(p_target uuid, p_gold int, p_pack_id uuid, p_packs int)
returns int language plpgsql security definer set search_path = public as $$
declare v_new int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'not admin';
  end if;
  if coalesce(p_gold, 0) <> 0 then
    update public.profiles set gold = greatest(0, gold + p_gold) where id = p_target;
  end if;
  if p_pack_id is not null and coalesce(p_packs, 0) > 0 then
    insert into public.user_pack_inventory (user_id, pack_id, quantity)
      values (p_target, p_pack_id, p_packs)
      on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + p_packs;
  end if;
  select gold into v_new from public.profiles where id = p_target;
  return coalesce(v_new, 0);
end $$;

grant execute on function public.rvn_admin_grant(uuid, int, uuid, int) to authenticated;
