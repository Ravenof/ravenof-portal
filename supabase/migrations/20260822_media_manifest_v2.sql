-- ════════════════════════════════════════════════════════════════════════════
--  Manifest v2: įtraukiami ir SANTYKINIAI /public keliai (pvz. /cards/x.webp —
--  386 kortų art gyvena Vercel public/, ne Supabase!). Jiems bytes=0 (dydis
--  nežinomas — progress skaičiuoja failais). Klientas absoliutina su origin.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_media_manifest()
returns table(url text, kind text, tier int, bytes bigint)
language sql security definer set search_path = public, storage as $$
  with urls as (
    select c.image_url as url, 'card-art' as kind, 2 as tier
      from public.cards c where c.status = 'active' and c.image_url is not null
    union all
    select jsonb_array_elements_text(c.gameplay->'voiceLines'), 'voice', 2
      from public.cards c where c.status = 'active' and jsonb_typeof(c.gameplay->'voiceLines') = 'array'
    union all
    select c.gameplay->'summonCinematic'->>'webm', 'cinematic', 3 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'webm' is not null
    union all
    select c.gameplay->'summonCinematic'->>'mp4', 'cinematic', 3 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'mp4' is not null
    union all
    select c.gameplay->'summonCinematic'->>'poster', 'cinematic-poster', 2 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'poster' is not null
    union all
    select s.value->'cinematic'->>'webm', 'cinematic', 3
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'webm' is not null
    union all
    select s.value->'cinematic'->>'mp4', 'cinematic', 3
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'mp4' is not null
    union all
    select s.value->'cinematic'->>'poster', 'cinematic-poster', 2
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'poster' is not null
    union all
    select co.image_url, 'cosmetic', 1 from public.cosmetics co where co.image_url is not null
    union all
    select jsonb_array_elements_text(co.videos), 'avatar-video', 3
      from public.cosmetics co where jsonb_typeof(co.videos) = 'array'
    union all
    select aa.file_url, 'avatar-voice', 2 from public.avatar_audio aa where aa.enabled
    union all
    select p.image_url, 'pack', 1 from public.card_packs p where p.image_url is not null
    union all
    select f.icon_url, 'ui', 1 from public.factions f where f.icon_url is not null
  ),
  storage_urls as (
    select distinct on (u.url) u.url, u.kind, u.tier,
      split_part(split_part(u.url, '/storage/v1/object/public/', 2), '/', 1) as bucket,
      substr(
        split_part(u.url, '/storage/v1/object/public/', 2),
        length(split_part(split_part(u.url, '/storage/v1/object/public/', 2), '/', 1)) + 2
      ) as path
    from urls u
    where u.url like '%/storage/v1/object/public/%'
    order by u.url, u.tier
  ),
  relative_urls as (
    -- Vercel /public failai (pvz. /cards/xxx.webp) — dydis nežinomas (bytes=0)
    select distinct on (u.url) u.url, u.kind, u.tier
    from urls u
    where u.url like '/%' and u.url not like '//%'
    order by u.url, u.tier
  )
  select s.url, s.kind, s.tier, coalesce((o.metadata->>'size')::bigint, 0) as bytes
  from storage_urls s
  left join storage.objects o on o.bucket_id = s.bucket and o.name = s.path
  union all
  select r.url, r.kind, r.tier, 0::bigint from relative_urls r;
$$;

grant execute on function public.rvn_media_manifest() to authenticated;
