-- ── card-audio bucket: per-kortos iškvietimo balsai (gameplay.voiceLines) ──────
-- Paleisk Supabase SQL editoriuje PRIEŠ naudojant VoiceLinesUpload admin UI.
-- Public read (žaidėjai gali parsisiųsti balsus), rašymas tik adminams.

-- 1) Public bucket
insert into storage.buckets (id, name, public)
values ('card-audio', 'card-audio', true)
on conflict (id) do update set public = true;

-- 2) Viešas skaitymas
drop policy if exists "card_audio_public_read" on storage.objects;
create policy "card_audio_public_read"
  on storage.objects for select
  using (bucket_id = 'card-audio');

-- 3) Įkėlimas — tik adminai
drop policy if exists "card_audio_admin_insert" on storage.objects;
create policy "card_audio_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'card-audio'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- 4) Atnaujinimas (upsert) — tik adminai
drop policy if exists "card_audio_admin_update" on storage.objects;
create policy "card_audio_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'card-audio'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- 5) Trynimas — tik adminai
drop policy if exists "card_audio_admin_delete" on storage.objects;
create policy "card_audio_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'card-audio'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
