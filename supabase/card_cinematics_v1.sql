-- ── card-cinematics bucket: Premium kino pop-up vaizdo įrašai ──────────────────
-- Summon (Legendiniai/Čempionai) + Čempiono skill cinematics.
-- Saugoma: cards.gameplay.summonCinematic ir championSkillConfig.skills[].cinematic
-- (tik public URL/path + metaduomenys; PATYS FAILAI čia, ne DB).
-- Paleisk Supabase SQL editoriuje PRIEŠ naudojant CinematicUpload admin UI.
-- Public read (žaidėjai parsisiunčia), rašymas tik adminams.

-- 1) Public bucket (didesnis failo limitas video; suderinti su MAX cinematic size)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-cinematics', 'card-cinematics', true,
  6291456,  -- 6 MB hard ceiling (UI siūlo 5 MB; warn > 2 MB)
  array['video/webm','video/mp4','image/webp','image/jpeg','image/png']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = array['video/webm','video/mp4','image/webp','image/jpeg','image/png'];

-- 2) Viešas skaitymas
drop policy if exists "card_cinematics_public_read" on storage.objects;
create policy "card_cinematics_public_read"
  on storage.objects for select
  using (bucket_id = 'card-cinematics');

-- 3) Įkėlimas — tik adminai
drop policy if exists "card_cinematics_admin_insert" on storage.objects;
create policy "card_cinematics_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'card-cinematics'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- 4) Atnaujinimas (upsert) — tik adminai
drop policy if exists "card_cinematics_admin_update" on storage.objects;
create policy "card_cinematics_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'card-cinematics'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- 5) Trynimas — tik adminai
drop policy if exists "card_cinematics_admin_delete" on storage.objects;
create policy "card_cinematics_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'card-cinematics'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
