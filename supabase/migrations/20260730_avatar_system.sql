-- ── Ravenof Digital: Avatar sistema (1 etapas — DB + audio backend) ───────────
-- Plečia esamą cosmetics sistemą (kind='avatar'): portretas, rarity, status,
-- owned_by_default + atskira avatar_audio lentelė (7 įvykių tipai, daug klipų,
-- weight random'ui). Pirkimas/equip/inventorius jau veikia per cosmetics.

-- 1) cosmetics praplėtimas avatarui
alter table public.cosmetics add column if not exists image_url        text;
alter table public.cosmetics add column if not exists rarity           text;            -- common|rare|epic|legendary
alter table public.cosmetics add column if not exists status           text not null default 'active'; -- active|hidden|draft
alter table public.cosmetics add column if not exists owned_by_default boolean not null default false;
alter table public.cosmetics add column if not exists created_at       timestamptz not null default now();
alter table public.cosmetics add column if not exists updated_at       timestamptz not null default now();

-- 2) avatar audio klipai (per įvykio tipą; daug klipų; weight random'ui)
create table if not exists public.avatar_audio (
  id           uuid primary key default gen_random_uuid(),
  cosmetic_id  text not null references public.cosmetics(id) on delete cascade,
  event_type   text not null check (event_type in ('fightStart','hit','defeat','victory','spellCast','lowHp','selected')),
  file_url     text not null,
  display_name text,
  enabled      boolean not null default true,
  weight       int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists avatar_audio_cosmetic_idx on public.avatar_audio (cosmetic_id, event_type);
alter table public.avatar_audio enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='avatar_audio' and policyname='avaud_read') then
    create policy "avaud_read" on public.avatar_audio for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='avatar_audio' and policyname='avaud_admin_write') then
    create policy "avaud_admin_write" on public.avatar_audio for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 3) Admin rašymas į cosmetics (kad admin galėtų kurti/redaguoti avatarus)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='cosmetics' and policyname='cos_admin_write') then
    create policy "cos_admin_write" on public.cosmetics for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

-- 4) Storage bucket'ai: portretai + audio (public read; admin write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar-portraits','avatar-portraits', true, 3145728, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar-audio','avatar-audio', true, 2097152, array['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/webm'])
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatar_assets_read') then
    create policy "avatar_assets_read" on storage.objects for select
      using (bucket_id in ('avatar-portraits','avatar-audio'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatar_assets_admin_write') then
    create policy "avatar_assets_admin_write" on storage.objects for all
      using (bucket_id in ('avatar-portraits','avatar-audio') and public.is_admin())
      with check (bucket_id in ('avatar-portraits','avatar-audio') and public.is_admin());
  end if;
end $$;

-- 5) rvn_get_cosmetics — praplečiam (imageUrl, rarity, ownedByDefault); owned įskaito owned_by_default
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji,'imageUrl',image_url,
                                      'rarity',rarity,'ownedByDefault',owned_by_default) order by sort_order, name)
    into v_list from public.cosmetics where is_active and coalesce(status,'active')='active';
  select coalesce(jsonb_agg(cid),'[]'::jsonb) into v_owned from (
    select cosmetic_id as cid from public.user_cosmetics where user_id=v_uid
    union
    select id from public.cosmetics where owned_by_default and is_active
  ) q;
  select equipped_card_back, equipped_board, equipped_avatar into v_cb, v_bd, v_av from public.profiles where id=v_uid;
  return jsonb_build_object('items', coalesce(v_list,'[]'::jsonb), 'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av);
end $$;

-- 6) rvn_equip_cosmetic — leisti įsirengti ir owned_by_default avatarą (ne tik nupirktą)
create or replace function public.rvn_equip_cosmetic(p_kind text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_id is not null and not exists (
    select 1 from public.cosmetics c
    where c.id=p_id and c.kind=p_kind and (
      c.owned_by_default
      or exists (select 1 from public.user_cosmetics u where u.user_id=v_uid and u.cosmetic_id=p_id)
    )
  ) then raise exception 'not owned'; end if;
  if    p_kind = 'card_back' then update public.profiles set equipped_card_back = p_id where id=v_uid;
  elsif p_kind = 'board'     then update public.profiles set equipped_board     = p_id where id=v_uid;
  elsif p_kind = 'avatar'    then update public.profiles set equipped_avatar    = p_id where id=v_uid;
  else raise exception 'bad kind'; end if;
  return jsonb_build_object('ok', true, 'kind', p_kind, 'id', p_id);
end $$;

-- 7) Battle audio: avatarų (friendly+enemy) garsai sugrupuoti pagal event_type
create or replace function public.rvn_get_avatar_audio(p_ids text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_out jsonb;
begin
  select coalesce(jsonb_object_agg(t.cosmetic_id, t.events), '{}'::jsonb) into v_out
  from (
    select a.cosmetic_id,
           jsonb_object_agg(a.event_type, a.clips) as events
    from (
      select cosmetic_id, event_type,
             jsonb_agg(jsonb_build_object('url',file_url,'weight',greatest(1,weight)) order by created_at) as clips
      from public.avatar_audio
      where enabled and cosmetic_id = any(p_ids)
      group by cosmetic_id, event_type
    ) a
    group by a.cosmetic_id
  ) t;
  return v_out;
end $$;

-- 8) Default avatarai (portretas/audio bus įkelti per admin; emoji = fallback)
insert into public.cosmetics (id, kind, name, description, price_gold, emoji, rarity, status, owned_by_default, is_active, sort_order)
values
  ('av_nekronautas', 'avatar', 'Nekronautas', 'Numatytasis kaulų valdovo avataras.', 0,  '☠', 'common', 'active', true,  true, 1),
  ('av_inkvizitorius','avatar', 'Inkvizitorius', 'Šviesos pulko teisėjas.',            800, '⚔', 'rare',   'active', false, true, 2)
on conflict (id) do nothing;

-- 9) Grants
grant execute on function public.rvn_get_cosmetics()             to authenticated;
grant execute on function public.rvn_equip_cosmetic(text,text)   to authenticated;
grant execute on function public.rvn_get_avatar_audio(text[])    to authenticated;
