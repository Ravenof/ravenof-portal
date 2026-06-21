-- ════════════════════════════════════════════════════════════════════════════
-- Ravenof Digital — vartotojo nustatymai (garsumas + summon efektai) DB pusėje.
-- Saugoma profiles.digital_settings (jsonb); pritaikoma localStorage greitam UX,
-- DB užtikrina išsaugojimą per įrenginius.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists digital_settings jsonb not null default '{}'::jsonb;

create or replace function public.rvn_save_digital_settings(p_settings jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.profiles set digital_settings = coalesce(p_settings, '{}'::jsonb) where id = auth.uid();
end $$;
grant execute on function public.rvn_save_digital_settings(jsonb) to authenticated;
