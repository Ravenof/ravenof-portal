-- ── Klaidų pranešimai iš žaidimo (desktop / mobile / web) ────────────────────
create table if not exists public.bug_reports (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  category text not null default 'other' check (category in ('battle','cards','ui','auth','shop','other')),
  severity text not null default 'normal' check (severity in ('blocker','major','normal','minor')),
  title text not null,
  description text not null,
  expected text,
  route text,
  platform text,
  app_version text,
  device jsonb not null default '{}'::jsonb,
  game_context jsonb,
  screenshot_path text,
  status text not null default 'new' check (status in ('new','triaged','in_progress','fixed','wontfix','duplicate')),
  admin_note text,
  duplicate_of bigint references public.bug_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bug_reports_user_idx on public.bug_reports(user_id, created_at desc);
create index if not exists bug_reports_status_idx on public.bug_reports(status, created_at desc);

alter table public.bug_reports enable row level security;
drop policy if exists bug_reports_select_own on public.bug_reports;
create policy bug_reports_select_own on public.bug_reports for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists bug_reports_admin_update on public.bug_reports;
create policy bug_reports_admin_update on public.bug_reports for update using (public.is_admin());

drop trigger if exists trg_bug_reports_updated_at on public.bug_reports;
create trigger trg_bug_reports_updated_at before update on public.bug_reports
  for each row execute function public.update_updated_at_column();

-- Įrašymas per RPC (validacija + rate limit 20/val.)
create or replace function public.rvn_report_bug(
  p_category text, p_severity text, p_title text, p_description text, p_expected text,
  p_route text, p_platform text, p_app_version text, p_device jsonb, p_game_context jsonb, p_screenshot_path text
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if length(trim(coalesce(p_description, ''))) < 5 then raise exception 'description too short'; end if;
  if (select count(*) from public.bug_reports where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'too many reports, try later';
  end if;
  insert into public.bug_reports (user_id, category, severity, title, description, expected, route, platform, app_version, device, game_context, screenshot_path)
  values (auth.uid(),
          case when p_category in ('battle','cards','ui','auth','shop','other') then p_category else 'other' end,
          case when p_severity in ('blocker','major','normal','minor') then p_severity else 'normal' end,
          left(coalesce(nullif(trim(p_title), ''), left(trim(p_description), 80)), 120),
          left(p_description, 4000), left(p_expected, 2000), left(p_route, 200), left(p_platform, 20), left(p_app_version, 40),
          coalesce(p_device, '{}'::jsonb), p_game_context, left(p_screenshot_path, 300))
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.rvn_report_bug(text,text,text,text,text,text,text,text,jsonb,jsonb,text) to authenticated;

-- Storage bucket ekrano nuotraukoms (privatus; adminas skaito, autorius rašo į savo aplanką)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bug-reports', 'bug-reports', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
drop policy if exists bug_reports_upload_own on storage.objects;
create policy bug_reports_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'bug-reports' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists bug_reports_read on storage.objects;
create policy bug_reports_read on storage.objects for select to authenticated
  using (bucket_id = 'bug-reports' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
