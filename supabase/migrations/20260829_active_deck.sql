-- ════════════════════════════════════════════════════════════════════════════
-- Globali aktyvi kaladė + kaladės-avataro susiejimas.
-- profiles.active_deck_id jau yra (20260827). Čia: setter RPC, avatar binding,
-- backfill esamiems (bendra → ranked locked → pirma pilna → pirma bet kokia).
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) kaladės avataro override (cosmetics.id; NULL = globalus avataras)
alter table public.decks add column if not exists bound_avatar text;

-- 2) aktyvios kaladės nustatymas (nuosavybės validacija serveryje)
create or replace function public.rvn_set_active_deck(p_deck uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_deck is not null and not exists (select 1 from public.decks d where d.id = p_deck and d.user_id = v_uid) then
    raise exception 'ne tavo kaladė';
  end if;
  update public.profiles set active_deck_id = p_deck where id = v_uid;
end $$;
grant execute on function public.rvn_set_active_deck(uuid) to authenticated;

-- 3) kaladės avataro susiejimas (NULL = grįžti prie globalaus)
create or replace function public.rvn_set_deck_avatar(p_deck uuid, p_avatar text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.decks d where d.id = p_deck and d.user_id = v_uid) then
    raise exception 'ne tavo kaladė';
  end if;
  if p_avatar is not null and not exists (
    select 1 from public.cosmetics c where c.id = p_avatar and c.kind = 'avatar'
      and (coalesce(c.owned_by_default, false)
        or exists (select 1 from public.user_cosmetics uc where uc.user_id = v_uid and uc.cosmetic_id = c.id))
  ) then
    raise exception 'avataras neturimas';
  end if;
  update public.decks set bound_avatar = p_avatar where id = p_deck and user_id = v_uid;
end $$;
grant execute on function public.rvn_set_deck_avatar(uuid, text) to authenticated;

-- 4) Backfill: esami žaidėjai gauna protingą aktyvią kaladę (NEkeičiam turintiems)
update public.profiles p set active_deck_id = coalesce(
  (select rp.locked_deck_id from public.ranked_profiles rp where rp.user_id = p.id and rp.locked_deck_id is not null order by rp.season_id desc limit 1),
  (select d.id from public.decks d where d.user_id = p.id and coalesce(d.card_count, 0) = 30 order by d.updated_at desc nulls last limit 1),
  (select d.id from public.decks d where d.user_id = p.id order by d.updated_at desc nulls last limit 1)
) where p.active_deck_id is null;
