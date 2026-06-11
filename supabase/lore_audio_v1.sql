-- ============================================================
-- LORE AUDIO V1 — soundtrack ir ambient garsai atlasui
-- Paleisti: Supabase Dashboard -> SQL Editor (idempotentiska)
-- ============================================================

-- Event soundtrack + nuotrauka
alter table public.lore_events    add column if not exists image_url text;
alter table public.lore_events    add column if not exists audio_url text;

-- Lokacijos ambient garsas (vejas, miestas, miskas...)
alter table public.lore_locations add column if not exists ambient_url text;
