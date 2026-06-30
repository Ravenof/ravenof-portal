-- ── Avatar idle video (atsitiktinai groja vietoj portreto kas 20–60 s) ────────
alter table public.cosmetics add column if not exists videos jsonb not null default '[]'::jsonb;

-- Video bucket (mp4/webm; ~10 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatar-video','avatar-video', true, 10485760, array['video/mp4','video/webm'])
on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatar_video_read') then
    create policy "avatar_video_read" on storage.objects for select using (bucket_id = 'avatar-video');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatar_video_admin_write') then
    create policy "avatar_video_admin_write" on storage.objects for all
      using (bucket_id = 'avatar-video' and public.is_admin())
      with check (bucket_id = 'avatar-video' and public.is_admin());
  end if;
end $$;

-- rvn_get_cosmetics – grąžinti ir videos
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji,'imageUrl',image_url,
                                      'rarity',rarity,'ownedByDefault',owned_by_default,'videos',coalesce(videos,'[]'::jsonb)) order by sort_order, name)
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
grant execute on function public.rvn_get_cosmetics() to authenticated;
