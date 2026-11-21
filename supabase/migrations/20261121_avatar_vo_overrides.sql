-- ════════════════════════════════════════════════════════════════════════════
-- Avatarų balsų pataisos iš admino (v821). Patys klipai guli žaidimo failuose
-- (public/avatars/v2/<slug>/vo/<lt|en>/<įvykis>-<nr>.mp3); ši lentelė leidžia:
--   • išjungti blogą klipą            (variant = nr, disabled = true)
--   • pakeisti klipą nauju            (variant = nr, file_url = naujas failas)
--   • pridėti papildomą klipą įvykiui (variant = null, file_url = failas)
-- Failai keliami į esamą bucket'ą 'avatar-audio'. Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.avatar_vo_overrides (
  id          bigserial primary key,
  avatar_id   text not null,
  lang        text not null check (lang in ('lt','en')),
  event       text not null,
  variant     int,
  disabled    boolean not null default false,
  file_url    text,
  note        text,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists avatar_vo_overrides_variant_uq
  on public.avatar_vo_overrides (avatar_id, lang, event, variant) where variant is not null;
create index if not exists avatar_vo_overrides_avatar_idx on public.avatar_vo_overrides (avatar_id, lang);

alter table public.avatar_vo_overrides enable row level security;
drop policy if exists avvo_read on public.avatar_vo_overrides;
create policy avvo_read on public.avatar_vo_overrides for select using (true);
drop policy if exists avvo_admin_write on public.avatar_vo_overrides;
create policy avvo_admin_write on public.avatar_vo_overrides for all using (public.is_admin()) with check (public.is_admin());
grant select on public.avatar_vo_overrides to anon, authenticated;
grant insert, update, delete on public.avatar_vo_overrides to authenticated;
grant usage, select on sequence public.avatar_vo_overrides_id_seq to authenticated;
