-- ══════════════════════════════════════════════════════════════════════════════
-- Fazė 6 (i18n) — KORTŲ VERTIMAI + LOKALIZUOTI VAIZDAI
--
-- `cards` lentelė lieka LT šaltiniu (fallback + variklio efektų parseris remiasi
-- LT `effect_text`). Vertimai gyvena atskirai:
--
--   card_translations — name / description / effect_text / flavor_text pagal locale
--   card_assets       — kortos vaizdas (ir kiti asset'ai) pagal locale, nes kortos
--                       PNG turi ĮKEPTĄ tekstą → EN reikia atskiro paveikslėlio
--
-- Kliento resolveris: src/lib/cards/i18n.ts  → cardText() / cardImage()
-- Eksportas/importas: node tools/cards-i18n.mjs export|import
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.card_translations (
  card_id     uuid not null references public.cards(id) on delete cascade,
  locale      text not null check (locale in ('lt','en')),
  name        text,
  description text,
  effect_text text,
  flavor_text text,
  -- editorial būsena (Fazė 8 admin): draft → review → approved
  status      text not null default 'approved' check (status in ('draft','review','approved')),
  updated_at  timestamptz not null default now(),
  primary key (card_id, locale)
);
create index if not exists ctr_locale_idx on public.card_translations (locale);

create table if not exists public.card_assets (
  card_id    uuid not null references public.cards(id) on delete cascade,
  locale     text not null check (locale in ('lt','en')),
  asset_type text not null default 'image',   -- image | art | thumb
  url        text not null,
  updated_at timestamptz not null default now(),
  primary key (card_id, locale, asset_type)
);
create index if not exists cas_locale_idx on public.card_assets (locale);

alter table public.card_translations enable row level security;
alter table public.card_assets       enable row level security;

drop policy if exists ctr_read on public.card_translations;
create policy ctr_read on public.card_translations for select using (true);
drop policy if exists ctr_admin on public.card_translations;
create policy ctr_admin on public.card_translations for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists cas_read on public.card_assets;
create policy cas_read on public.card_assets for select using (true);
drop policy if exists cas_admin on public.card_assets;
create policy cas_admin on public.card_assets for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ── LT snapshot'ai iš cards (šaltinis vis tiek lieka cards) ─────────────────
insert into public.card_translations (card_id, locale, name, description, effect_text, flavor_text)
select c.id, 'lt', c.name, c.description, c.effect_text, null
from public.cards c
on conflict (card_id, locale) do nothing;

insert into public.card_assets (card_id, locale, asset_type, url)
select c.id, 'lt', 'image', c.image_url
from public.cards c
where c.image_url is not null
on conflict (card_id, locale, asset_type) do nothing;

-- ── Rašymo helperiai (naudoja tools/cards-i18n.mjs ir admin) ────────────────
create or replace function public.rvn_set_card_translation(
  p_card_id uuid, p_locale text,
  p_name text default null, p_description text default null,
  p_effect_text text default null, p_flavor_text text default null,
  p_status text default 'approved'
) returns void language sql security definer set search_path = public as $$
  insert into public.card_translations (card_id, locale, name, description, effect_text, flavor_text, status)
  values (p_card_id, p_locale, p_name, p_description, p_effect_text, p_flavor_text, p_status)
  on conflict (card_id, locale) do update set
    name        = coalesce(excluded.name,        public.card_translations.name),
    description = coalesce(excluded.description, public.card_translations.description),
    effect_text = coalesce(excluded.effect_text, public.card_translations.effect_text),
    flavor_text = coalesce(excluded.flavor_text, public.card_translations.flavor_text),
    status      = excluded.status,
    updated_at  = now();
$$;
revoke all on function public.rvn_set_card_translation(uuid,text,text,text,text,text,text) from public, anon, authenticated;

create or replace function public.rvn_set_card_asset(
  p_card_id uuid, p_locale text, p_url text, p_asset_type text default 'image'
) returns void language sql security definer set search_path = public as $$
  insert into public.card_assets (card_id, locale, asset_type, url)
  values (p_card_id, p_locale, p_asset_type, p_url)
  on conflict (card_id, locale, asset_type) do update set url = excluded.url, updated_at = now();
$$;
revoke all on function public.rvn_set_card_asset(uuid,text,text,text) from public, anon, authenticated;

-- ── Vertimų pilnumo ataskaita (admin, Fazė 8) ───────────────────────────────
create or replace view public.card_translation_status as
select
  c.id as card_id, c.card_number, c.name as name_lt,
  t.name as name_en, t.effect_text as effect_en, t.status,
  (a.url is not null) as has_en_image,
  case
    when t.card_id is null then 'missing'
    when t.name is null or t.effect_text is null then 'partial'
    else t.status
  end as en_state
from public.cards c
left join public.card_translations t on t.card_id = c.id and t.locale = 'en'
left join public.card_assets a       on a.card_id = c.id and a.locale = 'en' and a.asset_type = 'image';
