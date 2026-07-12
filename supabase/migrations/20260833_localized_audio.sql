-- ══════════════════════════════════════════════════════════════════════════════
-- Fazė 7 (i18n) — LOKALIZUOTAS AUDIO (kortų ir avatarų balsai)
--
-- Dabar balsai LT-only ir išbarstyti: kortos → cards.gameplay->'voiceLines'
-- (URL masyvas), avatarai → avatar_audio lentelė. Šis modelis suvienodina ir
-- prideda kalbą + transkripciją (subtitrams/prieinamumui).
--
-- Fallback politika (klientas, src/lib/game/audioI18n.ts):
--   pasirinkta kalba → (jei įjungtas nustatymas) LT → tyla
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.localized_audio (
  id         uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('card','avatar')),
  owner_id   text not null,                 -- cards.id::text arba cosmetics.id
  locale     text not null check (locale in ('lt','en')),
  trigger    text not null,                 -- kortoms: 'summon'; avatarams: fightStart|hit|defeat|victory|spellCast|lowHp|selected
  url        text not null,
  transcript text,                          -- kas pasakoma (subtitrai / admin peržiūra)
  weight     int  not null default 1,       -- atsitiktinio parinkimo svoris
  sort_order int  not null default 0,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists la_owner_idx  on public.localized_audio (owner_type, owner_id, locale);
create index if not exists la_locale_idx on public.localized_audio (locale);
create unique index if not exists la_unique_url on public.localized_audio (owner_type, owner_id, locale, trigger, url);

alter table public.localized_audio enable row level security;
drop policy if exists la_read on public.localized_audio;
create policy la_read on public.localized_audio for select using (enabled);
drop policy if exists la_admin on public.localized_audio;
create policy la_admin on public.localized_audio for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── LT migracija: kortų voiceLines (gameplay JSONB) → localized_audio ───────
insert into public.localized_audio (owner_type, owner_id, locale, trigger, url, sort_order)
select 'card', c.id::text, 'lt', 'summon', v.url, (v.ord - 1)::int
from public.cards c
cross join lateral jsonb_array_elements_text(coalesce(c.gameplay->'voiceLines', '[]'::jsonb))
     with ordinality as v(url, ord)
where coalesce(c.gameplay->'voiceLines', '[]'::jsonb) <> '[]'::jsonb
on conflict (owner_type, owner_id, locale, trigger, url) do nothing;

-- ── LT migracija: avatar_audio → localized_audio ────────────────────────────
insert into public.localized_audio (owner_type, owner_id, locale, trigger, url, transcript, weight, enabled)
select 'avatar', a.cosmetic_id, 'lt', a.event_type, a.file_url, a.display_name, a.weight, a.enabled
from public.avatar_audio a
on conflict (owner_type, owner_id, locale, trigger, url) do nothing;

-- ── Skaitymo RPC: gražina map'ą klientui ───────────────────────────────────
-- rvn_get_localized_audio('card', array['<uuid>'], 'en')
--   → { "<owner_id>": { "<trigger>": [ {url, weight, transcript}, ... ] } }
create or replace function public.rvn_get_localized_audio(
  p_owner_type text, p_ids text[], p_locale text
) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(t.owner_id, t.triggers), '{}'::jsonb)
  from (
    select a.owner_id, jsonb_object_agg(a.trigger, a.clips) as triggers
    from (
      select owner_id, trigger,
             jsonb_agg(jsonb_build_object('url', url, 'weight', weight, 'transcript', transcript)
                       order by sort_order, created_at) as clips
      from public.localized_audio
      where enabled and owner_type = p_owner_type and locale = p_locale and owner_id = any(p_ids)
      group by owner_id, trigger
    ) a
    group by a.owner_id
  ) t;
$$;
grant execute on function public.rvn_get_localized_audio(text, text[], text) to anon, authenticated;

-- ── Rašymo helperis (admin / įrankiai) ─────────────────────────────────────
create or replace function public.rvn_set_localized_audio(
  p_owner_type text, p_owner_id text, p_locale text, p_trigger text, p_url text,
  p_transcript text default null, p_weight int default 1, p_sort_order int default 0
) returns void language sql security definer set search_path = public as $$
  insert into public.localized_audio (owner_type, owner_id, locale, trigger, url, transcript, weight, sort_order)
  values (p_owner_type, p_owner_id, p_locale, p_trigger, p_url, p_transcript, p_weight, p_sort_order)
  on conflict (owner_type, owner_id, locale, trigger, url) do update set
    transcript = coalesce(excluded.transcript, public.localized_audio.transcript),
    weight     = excluded.weight,
    sort_order = excluded.sort_order,
    enabled    = true,
    updated_at = now();
$$;
revoke all on function public.rvn_set_localized_audio(text,text,text,text,text,text,int,int) from public, anon, authenticated;

-- ── Pilnumo ataskaita (admin) ──────────────────────────────────────────────
create or replace view public.localized_audio_status as
select owner_type, locale, count(distinct owner_id) as owners, count(*) as clips
from public.localized_audio
where enabled
group by owner_type, locale;
