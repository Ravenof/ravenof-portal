-- ════════════════════════════════════════════════════════════════════════════
-- AVATARO RĖMELIAI (kosmetikos rūšis 'avatar_frame') — v812.
-- Kovoje rėmas aplink žaidėjo portretą (HP taikinys) tampa pasirenkamas.
-- Esamos funkcijos (rvn_get_cosmetics, rvn__set_active_cosmetic) NELIEČIAMOS:
-- rėmeliai kataloge atsiranda savaime (filtras ne pagal rūšį), o aktyvus
-- rėmelis skaitomas / nustatomas dviem naujais RPC. Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists equipped_avatar_frame text;

-- Numatytasis rėmelis: dabartinis statinis rėmas, priklauso visiems.
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default)
values ('af_default', 'avatar_frame', 'Ravenof rėmelis',
        'Standartinis kovos avataro rėmelis — visada tavo.',
        0, null, null, -10, true,
        '/ravenof-ui/combat/avatars/frame-avatar-player.png', 'common', 'active', true)
on conflict (id) do update
  set owned_by_default = true, is_active = true, status = 'active', kind = 'avatar_frame';

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','af_default','en','name','Ravenof frame'),
  ('cosmetic','af_default','en','description','The standard battle avatar frame — always yours.')
on conflict (owner_type, owner_id, locale, field) do nothing;

-- Aktyvus rėmelis (savo arba kito žaidėjo – PvP varžovui). Validuotas:
-- neegzistuojantis / nebeturimas → NULL (klientas piešia numatytąjį).
create or replace function public.rvn_get_avatar_frame(p_user uuid default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', c.id, 'imageUrl', c.image_url)
    from public.profiles p
    join public.cosmetics c on c.id = p.equipped_avatar_frame and c.kind = 'avatar_frame'
   where p.id = coalesce(p_user, auth.uid())
     and (c.owned_by_default
          or exists (select 1 from public.user_cosmetics u where u.user_id = p.id and u.cosmetic_id = c.id))
$$;
grant execute on function public.rvn_get_avatar_frame(uuid) to authenticated;

create or replace function public.rvn_set_active_avatar_frame(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_id is not null and not exists (
    select 1 from public.cosmetics c
     where c.id = p_id and c.kind = 'avatar_frame'
       and (c.owned_by_default
            or exists (select 1 from public.user_cosmetics u where u.user_id = v_uid and u.cosmetic_id = p_id))
  ) then
    raise exception 'cosmetic_locked';
  end if;
  update public.profiles set equipped_avatar_frame = p_id where id = v_uid;
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;
grant execute on function public.rvn_set_active_avatar_frame(text) to authenticated;

-- Valiutų sargai (20260919): rėmelis irgi kosmetika → rubinų kaina leidžiama.
create or replace function public.rvn__shop_price_guard()
returns trigger language plpgsql as $$
declare v_type text;
begin
  if new.currency_type = 'rubies' and new.is_active then
    select item_type into v_type from public.shop_items where id = new.shop_item_id;
    if coalesce(v_type, '') not in ('card_back', 'player_avatar', 'avatar_frame') then
      new.is_active := false;
    end if;
  end if;
  return new;
end $$;

create or replace function public.rvn__shop_item_type_guard()
returns trigger language plpgsql as $$
begin
  if new.item_type is distinct from old.item_type and new.item_type not in ('card_back', 'player_avatar', 'avatar_frame') then
    update public.shop_item_prices set is_active = false
     where shop_item_id = new.id and currency_type = 'rubies' and is_active;
  end if;
  return new;
end $$;
