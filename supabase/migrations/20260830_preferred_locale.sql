-- ── Lokalizacija: vartotojo kalbos preferencija ────────────────────────────────
-- LT lieka šaltinio kalba; EN — pilna antra kalba. Kanoniniai kodai: 'lt' | 'en'.
alter table profiles
  add column if not exists preferred_locale text not null default 'lt'
  check (preferred_locale in ('lt', 'en'));

comment on column profiles.preferred_locale is
  'Vartotojo pasirinkta sąsajos kalba (lt|en). Sinchronizuojama tarp įrenginių.';
