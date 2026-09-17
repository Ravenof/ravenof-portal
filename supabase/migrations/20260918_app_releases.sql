-- ── Live release sistema: bundle'ai, kanalai (admin → tester → stable), rollback, vartai ──
-- Planas: claude/release-rollback-updater-planas.md. Viskas idempotentiška.
--
--  app_bundles      – visi kada nors publikuoti kliento bundle'ai (NEKEIČIAMI; failai guli
--                     content-addressed bucket'e `app-bundles`, čia tik manifesto URL).
--  app_channels     – 3 rodyklės: kurį bundle'ą gauna admin / tester / stable.
--  app_release_log  – auditas (publish / promote / rollback / set / revoke / config).
--  app_config       – 1 eilutė: maintenance, min shell versijos, atsisiuntimo nuorodos, kill-switch flag'ai.
--  app_channel_overrides – admino prisegtas kanalas konkrečiam žaidėjui (pvz. adminas → stable bug'o atkūrimui).
--  app_update_events – kliento updater'io telemetrija (downloaded / applied / rolled_back / failed).
--
-- Kanalą VISADA parenka serveris pagal profiles.role – klientas jo nurodyti negali.

-- ─── Lentelės ────────────────────────────────────────────────────────────────
create table if not exists public.app_bundles (
  id bigint generated always as identity primary key,
  version text not null unique,                  -- = APP_VERSION (commit numeris), pvz. '693'
  version_num integer not null,                  -- skaitinis palyginimui
  git_sha text,
  manifest_url text not null,                    -- JSON: [{file_name, file_hash (sha256), download_url}]
  files_count integer not null default 0,
  size_bytes bigint not null default 0,          -- viso bundle'o dydis
  engine_version integer not null default 1,     -- didinamas tik keičiant engine / PvP protokolą
  min_shell_android text,                        -- mažiausias APK versionName, su kuriuo šis bundle'as veikia
  min_shell_desktop text,
  requires_migration text,                       -- migracijos failo vardas, kuris PRIVALO būti pritaikytas
  notes_lt text,
  notes_en text,
  status text not null default 'active' check (status in ('active','revoked')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_channels (
  channel text primary key check (channel in ('admin','tester','stable')),
  bundle_id bigint references public.app_bundles(id) on delete set null,
  previous_bundle_id bigint references public.app_bundles(id) on delete set null,
  mandatory boolean not null default false,      -- true → klientas privalo atsisiųsti prieš žaisdamas
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.app_channels (channel) values ('admin'), ('tester'), ('stable') on conflict (channel) do nothing;

create table if not exists public.app_release_log (
  id bigint generated always as identity primary key,
  action text not null check (action in ('publish','promote','rollback','set','revoke','config')),
  channel text,
  from_bundle bigint references public.app_bundles(id) on delete set null,
  to_bundle bigint references public.app_bundles(id) on delete set null,
  reason text,
  detail jsonb,
  actor uuid references public.profiles(id) on delete set null,
  at timestamptz not null default now()
);
create index if not exists app_release_log_at_idx on public.app_release_log(at desc);

create table if not exists public.app_config (
  id integer primary key default 1 check (id = 1),
  maintenance boolean not null default false,
  maintenance_message_lt text,
  maintenance_message_en text,
  min_shell_android text,                        -- globalus minimumas (nepriklausomai nuo bundle'o)
  min_shell_desktop text,
  shell_url_android text,                        -- iš kur parsisiųsti naują APK
  shell_url_desktop text,                        -- iš kur parsisiųsti naują EXE
  pvp_server_url text,
  flags jsonb not null default '{}'::jsonb,      -- kill-switch'ai: {"pvp_enabled":true,...}
  updated_at timestamptz not null default now()
);
insert into public.app_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.app_channel_overrides (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('admin','tester','stable')),
  note text,
  set_by uuid references public.profiles(id) on delete set null,
  set_at timestamptz not null default now()
);

create table if not exists public.app_update_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event text not null check (event in ('downloaded','applied','rolled_back','download_failed','checksum_failed','shell_outdated')),
  bundle_version text,
  from_version text,
  platform text,
  shell_version text,
  detail text,
  at timestamptz not null default now()
);
create index if not exists app_update_events_at_idx on public.app_update_events(at desc);
create index if not exists app_update_events_bundle_idx on public.app_update_events(bundle_version, event);

-- ─── RLS: skaito/rašo tik adminas; klientai – tik per RPC ────────────────────
alter table public.app_bundles enable row level security;
alter table public.app_channels enable row level security;
alter table public.app_release_log enable row level security;
alter table public.app_config enable row level security;
alter table public.app_channel_overrides enable row level security;
alter table public.app_update_events enable row level security;

drop policy if exists app_bundles_admin_read on public.app_bundles;
create policy app_bundles_admin_read on public.app_bundles for select using (public.is_admin());
drop policy if exists app_channels_admin_read on public.app_channels;
create policy app_channels_admin_read on public.app_channels for select using (public.is_admin());
drop policy if exists app_release_log_admin_read on public.app_release_log;
create policy app_release_log_admin_read on public.app_release_log for select using (public.is_admin());
drop policy if exists app_config_admin_read on public.app_config;
create policy app_config_admin_read on public.app_config for select using (public.is_admin());
drop policy if exists app_channel_overrides_admin_read on public.app_channel_overrides;
create policy app_channel_overrides_admin_read on public.app_channel_overrides for select using (public.is_admin());
drop policy if exists app_update_events_admin_read on public.app_update_events;
create policy app_update_events_admin_read on public.app_update_events for select using (public.is_admin());

-- ─── Pagalbinės ──────────────────────────────────────────────────────────────
-- Taškais skirtos versijos palyginimas: '1.0.692' vs '1.0.700' → -1 / 0 / 1. Ne skaičiai laikomi 0.
create or replace function public.rvn__version_cmp(a text, b text)
returns integer language plpgsql immutable as $$
declare
  pa text[] := string_to_array(coalesce(a, ''), '.');
  pb text[] := string_to_array(coalesce(b, ''), '.');
  n integer := greatest(coalesce(array_length(pa, 1), 0), coalesce(array_length(pb, 1), 0));
  i integer; x bigint; y bigint;
begin
  for i in 1..n loop
    x := coalesce(nullif(regexp_replace(coalesce(pa[i], '0'), '\D', '', 'g'), '')::bigint, 0);
    y := coalesce(nullif(regexp_replace(coalesce(pb[i], '0'), '\D', '', 'g'), '')::bigint, 0);
    if x < y then return -1; elsif x > y then return 1; end if;
  end loop;
  return 0;
end $$;

-- Kuriam kanalui priklauso dabartinis vartotojas (override > rolė > stable).
create or replace function public.rvn__release_channel_for(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select o.channel from public.app_channel_overrides o where o.user_id = p_user),
    (select case p.role when 'admin' then 'admin' when 'tester' then 'tester' else 'stable' end
       from public.profiles p where p.id = p_user),
    'stable');
$$;

-- ─── Kliento RPC: ką man dabar reikia turėti? ────────────────────────────────
-- Kviečia ir neprisijungęs klientas (anon) → visada 'stable'.
-- Kanalas be bundle'o krenta žemyn: admin → tester → stable.
create or replace function public.rvn_get_release(p_platform text default null, p_shell_version text default null, p_bundle_version text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_channel text := public.rvn__release_channel_for(auth.uid());
  v_is_admin boolean := coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
  v_cfg public.app_config;
  v_ch public.app_channels;
  v_b public.app_bundles;
  v_min_shell text;
  v_shell_url text;
  v_cur_revoked boolean := false;
  v_override boolean := exists (select 1 from public.app_channel_overrides where user_id = auth.uid());
  v_try text;
begin
  select * into v_cfg from public.app_config where id = 1;

  foreach v_try in array (case v_channel when 'admin' then array['admin','tester','stable'] when 'tester' then array['tester','stable'] else array['stable'] end) loop
    select c.* into v_ch from public.app_channels c where c.channel = v_try;
    if v_ch.bundle_id is not null then
      select b.* into v_b from public.app_bundles b where b.id = v_ch.bundle_id and b.status = 'active';
      exit when v_b.id is not null;
    end if;
  end loop;

  if p_bundle_version is not null then
    select (status = 'revoked') into v_cur_revoked from public.app_bundles where version = p_bundle_version;
  end if;

  if p_platform = 'android' then
    v_min_shell := case when public.rvn__version_cmp(v_b.min_shell_android, v_cfg.min_shell_android) >= 0 then coalesce(v_b.min_shell_android, v_cfg.min_shell_android) else v_cfg.min_shell_android end;
    v_shell_url := v_cfg.shell_url_android;
  elsif p_platform = 'desktop' then
    v_min_shell := case when public.rvn__version_cmp(v_b.min_shell_desktop, v_cfg.min_shell_desktop) >= 0 then coalesce(v_b.min_shell_desktop, v_cfg.min_shell_desktop) else v_cfg.min_shell_desktop end;
    v_shell_url := v_cfg.shell_url_desktop;
  end if;

  return jsonb_build_object(
    'channel', v_channel,
    'maintenance', coalesce(v_cfg.maintenance, false) and not v_is_admin,
    'maintenance_message_lt', v_cfg.maintenance_message_lt,
    'maintenance_message_en', v_cfg.maintenance_message_en,
    'min_shell_version', v_min_shell,
    'shell_outdated', (v_min_shell is not null and p_shell_version is not null and public.rvn__version_cmp(p_shell_version, v_min_shell) < 0),
    'shell_download_url', v_shell_url,
    'pvp_server_url', v_cfg.pvp_server_url,
    'flags', coalesce(v_cfg.flags, '{}'::jsonb),
    'bundle', case when v_b.id is null then null else jsonb_build_object(
      'version', v_b.version,
      'version_num', v_b.version_num,
      'manifest_url', v_b.manifest_url,
      'files_count', v_b.files_count,
      'size_bytes', v_b.size_bytes,
      'engine_version', v_b.engine_version,
      'notes_lt', v_b.notes_lt,
      'notes_en', v_b.notes_en,
      -- privaloma: kanalas pažymėtas mandatory, ARBA kliento turimas bundle'as atšauktas,
      -- ARBA žaidėjui prisegtas kanalo override (tada jis turi gauti TIKSLIAI to kanalo bundle'ą, net jei senesnis)
      'mandatory', coalesce(v_ch.mandatory, false) or coalesce(v_cur_revoked, false) or v_override
    ) end
  );
end $$;
grant execute on function public.rvn_get_release(text, text, text) to anon, authenticated;

-- ─── Kliento RPC: updater'io telemetrija ─────────────────────────────────────
create or replace function public.rvn_report_update_event(p_event text, p_bundle_version text, p_from_version text, p_platform text, p_shell_version text, p_detail text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('downloaded','applied','rolled_back','download_failed','checksum_failed','shell_outdated') then return; end if;
  -- apsauga nuo šiukšlinimo: ne daugiau kaip 30 įvykių per valandą iš vieno vartotojo
  if auth.uid() is not null and (select count(*) from public.app_update_events where user_id = auth.uid() and at > now() - interval '1 hour') >= 30 then return; end if;
  insert into public.app_update_events (user_id, event, bundle_version, from_version, platform, shell_version, detail)
  values (auth.uid(), p_event, left(p_bundle_version, 40), left(p_from_version, 40), left(p_platform, 20), left(p_shell_version, 40), left(p_detail, 500));
end $$;
grant execute on function public.rvn_report_update_event(text, text, text, text, text, text) to anon, authenticated;

-- ─── Admin RPC: publikavimas (tools/publish-bundle.mjs) – VISADA tik į 'admin' kanalą ─────
create or replace function public.rvn_admin_release_publish(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id bigint; v_prev bigint; v_ver text := trim(p->>'version');
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if coalesce(v_ver, '') = '' or coalesce(p->>'manifest_url', '') = '' then raise exception 'version and manifest_url required'; end if;
  if exists (select 1 from public.app_bundles where version = v_ver) then
    raise exception 'bundle % already published (bundles are immutable – bump APP_VERSION)', v_ver;
  end if;
  insert into public.app_bundles (version, version_num, git_sha, manifest_url, files_count, size_bytes, engine_version,
                                  min_shell_android, min_shell_desktop, requires_migration, notes_lt, notes_en, created_by)
  values (v_ver, coalesce(nullif(regexp_replace(v_ver, '\D', '', 'g'), '')::integer, 0), p->>'git_sha', p->>'manifest_url',
          coalesce((p->>'files_count')::integer, 0), coalesce((p->>'size_bytes')::bigint, 0), coalesce((p->>'engine_version')::integer, 1),
          nullif(p->>'min_shell_android', ''), nullif(p->>'min_shell_desktop', ''), nullif(p->>'requires_migration', ''),
          nullif(p->>'notes_lt', ''), nullif(p->>'notes_en', ''), auth.uid())
  returning id into v_id;

  select bundle_id into v_prev from public.app_channels where channel = 'admin';
  update public.app_channels set previous_bundle_id = v_prev, bundle_id = v_id, mandatory = false, updated_by = auth.uid(), updated_at = now()
   where channel = 'admin';
  insert into public.app_release_log (action, channel, from_bundle, to_bundle, reason, actor)
  values ('publish', 'admin', v_prev, v_id, p->>'notes_lt', auth.uid());
  return jsonb_build_object('id', v_id, 'version', v_ver, 'channel', 'admin');
end $$;
grant execute on function public.rvn_admin_release_publish(jsonb) to authenticated;

-- ─── Admin RPC: patvirtinimas į kitą kanalą (admin → tester → stable; peršokti negalima) ──
create or replace function public.rvn_admin_release_promote(p_to text, p_reason text default null, p_mandatory boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_from text; v_src bigint; v_prev bigint; v_b public.app_bundles;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  v_from := case p_to when 'tester' then 'admin' when 'stable' then 'tester' else null end;
  if v_from is null then raise exception 'promote target must be tester or stable'; end if;
  select bundle_id into v_src from public.app_channels where channel = v_from;
  if v_src is null then raise exception 'channel % has no bundle to promote', v_from; end if;
  select * into v_b from public.app_bundles where id = v_src;
  if v_b.status <> 'active' then raise exception 'bundle % is revoked', v_b.version; end if;
  select bundle_id into v_prev from public.app_channels where channel = p_to;
  if v_prev = v_src then raise exception 'channel % already on bundle %', p_to, v_b.version; end if;
  update public.app_channels set previous_bundle_id = v_prev, bundle_id = v_src, mandatory = coalesce(p_mandatory, false), updated_by = auth.uid(), updated_at = now()
   where channel = p_to;
  insert into public.app_release_log (action, channel, from_bundle, to_bundle, reason, actor) values ('promote', p_to, v_prev, v_src, p_reason, auth.uid());
  return jsonb_build_object('channel', p_to, 'version', v_b.version);
end $$;
grant execute on function public.rvn_admin_release_promote(text, text, boolean) to authenticated;

-- ─── Admin RPC: rollback – kanalas grįžta į previous_bundle_id, klientams PRIVALOMA ──────
create or replace function public.rvn_admin_release_rollback(p_channel text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cur bigint; v_prev bigint; v_ver text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason required'; end if;
  select bundle_id, previous_bundle_id into v_cur, v_prev from public.app_channels where channel = p_channel;
  if v_prev is null then raise exception 'channel % has no previous bundle – use rvn_admin_release_set', p_channel; end if;
  select version into v_ver from public.app_bundles where id = v_prev and status = 'active';
  if v_ver is null then raise exception 'previous bundle is revoked or missing – use rvn_admin_release_set'; end if;
  update public.app_channels set bundle_id = v_prev, previous_bundle_id = v_cur, mandatory = true, updated_by = auth.uid(), updated_at = now()
   where channel = p_channel;
  insert into public.app_release_log (action, channel, from_bundle, to_bundle, reason, actor) values ('rollback', p_channel, v_cur, v_prev, p_reason, auth.uid());
  return jsonb_build_object('channel', p_channel, 'version', v_ver);
end $$;
grant execute on function public.rvn_admin_release_rollback(text, text) to authenticated;

-- ─── Admin RPC: priskirti kanalui BET KURĮ aktyvų bundle'ą (rollback per kelis žingsnius) ─
-- Saugiklis: į tester/stable galima dėti tik bundle'ą, kuris jau buvo bent 'admin' kanale (t. y. bet kurį publikuotą),
-- ir kurio versija NE naujesnė už tą, kas šiuo metu yra aukštesniame kanale (kad nebūtų peršokama eilė).
create or replace function public.rvn_admin_release_set(p_channel text, p_bundle_id bigint, p_mandatory boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cur bigint; v_b public.app_bundles; v_up_num integer;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_channel not in ('admin','tester','stable') then raise exception 'bad channel'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason required'; end if;
  select * into v_b from public.app_bundles where id = p_bundle_id;
  if v_b.id is null or v_b.status <> 'active' then raise exception 'bundle missing or revoked'; end if;
  if p_channel <> 'admin' then
    select b.version_num into v_up_num from public.app_channels c join public.app_bundles b on b.id = c.bundle_id
     where c.channel = case p_channel when 'stable' then 'tester' else 'admin' end;
    if v_up_num is not null and v_b.version_num > v_up_num then
      raise exception 'bundle % is newer than the upstream channel – promote it instead', v_b.version;
    end if;
  end if;
  select bundle_id into v_cur from public.app_channels where channel = p_channel;
  update public.app_channels set previous_bundle_id = v_cur, bundle_id = p_bundle_id, mandatory = coalesce(p_mandatory, false), updated_by = auth.uid(), updated_at = now()
   where channel = p_channel;
  insert into public.app_release_log (action, channel, from_bundle, to_bundle, reason, actor) values ('set', p_channel, v_cur, p_bundle_id, p_reason, auth.uid());
  return jsonb_build_object('channel', p_channel, 'version', v_b.version);
end $$;
grant execute on function public.rvn_admin_release_set(text, bigint, boolean, text) to authenticated;

-- ─── Admin RPC: atšaukti bundle'ą (niekas jo nebegaus; kas jį turi – priverstinai keis) ──
create or replace function public.rvn_admin_release_revoke(p_bundle_id bigint, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ch record; v_ver text;
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'reason required'; end if;
  select version into v_ver from public.app_bundles where id = p_bundle_id;
  if v_ver is null then raise exception 'bundle missing'; end if;
  update public.app_bundles set status = 'revoked' where id = p_bundle_id;
  -- kanalai, rodę į atšauktą bundle'ą, grįžta į ankstesnį (jei jis aktyvus), kitaip lieka tušti (kris į žemesnį kanalą)
  for v_ch in select * from public.app_channels where bundle_id = p_bundle_id loop
    update public.app_channels c
       set bundle_id = (select b.id from public.app_bundles b where b.id = v_ch.previous_bundle_id and b.status = 'active'),
           previous_bundle_id = null, mandatory = true, updated_by = auth.uid(), updated_at = now()
     where c.channel = v_ch.channel;
  end loop;
  insert into public.app_release_log (action, from_bundle, reason, actor) values ('revoke', p_bundle_id, p_reason, auth.uid());
  return jsonb_build_object('revoked', v_ver);
end $$;
grant execute on function public.rvn_admin_release_revoke(bigint, text) to authenticated;

-- ─── Admin RPC: vartai / konfigūracija (dalinis patch'as) ────────────────────
create or replace function public.rvn_admin_app_config_set(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  update public.app_config set
    maintenance            = case when p ? 'maintenance' then (p->>'maintenance')::boolean else maintenance end,
    maintenance_message_lt = case when p ? 'maintenance_message_lt' then nullif(p->>'maintenance_message_lt', '') else maintenance_message_lt end,
    maintenance_message_en = case when p ? 'maintenance_message_en' then nullif(p->>'maintenance_message_en', '') else maintenance_message_en end,
    min_shell_android      = case when p ? 'min_shell_android' then nullif(p->>'min_shell_android', '') else min_shell_android end,
    min_shell_desktop      = case when p ? 'min_shell_desktop' then nullif(p->>'min_shell_desktop', '') else min_shell_desktop end,
    shell_url_android      = case when p ? 'shell_url_android' then nullif(p->>'shell_url_android', '') else shell_url_android end,
    shell_url_desktop      = case when p ? 'shell_url_desktop' then nullif(p->>'shell_url_desktop', '') else shell_url_desktop end,
    pvp_server_url         = case when p ? 'pvp_server_url' then nullif(p->>'pvp_server_url', '') else pvp_server_url end,
    flags                  = case when p ? 'flags' then coalesce(p->'flags', '{}'::jsonb) else flags end,
    updated_at = now()
  where id = 1;
  insert into public.app_release_log (action, reason, detail, actor) values ('config', p->>'reason', p - 'reason', auth.uid());
  return (select to_jsonb(c) from public.app_config c where id = 1);
end $$;
grant execute on function public.rvn_admin_app_config_set(jsonb) to authenticated;

-- ─── Admin RPC: kanalo override konkrečiam žaidėjui (null kanalas = nuimti) ───
create or replace function public.rvn_admin_release_override(p_user uuid, p_channel text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  if p_channel is null then
    delete from public.app_channel_overrides where user_id = p_user;
  else
    insert into public.app_channel_overrides (user_id, channel, note, set_by) values (p_user, p_channel, p_note, auth.uid())
    on conflict (user_id) do update set channel = excluded.channel, note = excluded.note, set_by = excluded.set_by, set_at = now();
  end if;
end $$;
grant execute on function public.rvn_admin_release_override(uuid, text, text) to authenticated;

-- ─── Admin RPC: visas /admin/releases ekranas viena užklausa ─────────────────
create or replace function public.rvn_admin_release_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'config', (select to_jsonb(c) from public.app_config c where id = 1),
    'my_channel', public.rvn__release_channel_for(auth.uid()),
    'channels', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'channel', c.channel, 'mandatory', c.mandatory, 'updated_at', c.updated_at,
        'updated_by', (select username from public.profiles where id = c.updated_by),
        'bundle', (select jsonb_build_object('id', b.id, 'version', b.version, 'created_at', b.created_at, 'status', b.status) from public.app_bundles b where b.id = c.bundle_id),
        'previous', (select jsonb_build_object('id', b.id, 'version', b.version, 'status', b.status) from public.app_bundles b where b.id = c.previous_bundle_id),
        'players_24h', (select count(*) from public.profiles p join public.app_bundles b on b.id = c.bundle_id
                         where p.last_app_version = b.version and p.last_seen_at > now() - interval '24 hours'),
        'bugs_24h', (select count(*) from public.bug_reports r join public.app_bundles b on b.id = c.bundle_id
                      where r.app_version = b.version and r.created_at > now() - interval '24 hours'),
        'rollbacks_24h', (select count(*) from public.app_update_events e join public.app_bundles b on b.id = c.bundle_id
                           where e.bundle_version = b.version and e.event = 'rolled_back' and e.at > now() - interval '24 hours')
      ) order by case c.channel when 'admin' then 1 when 'tester' then 2 else 3 end), '[]'::jsonb)
      from public.app_channels c),
    'bundles', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.id desc), '[]'::jsonb) from (
        select b.id, b.version, b.git_sha, b.files_count, b.size_bytes, b.engine_version, b.min_shell_android, b.min_shell_desktop,
               b.requires_migration, b.notes_lt, b.notes_en, b.status, b.created_at,
               (select count(*) from public.profiles p where p.last_app_version = b.version and p.last_seen_at > now() - interval '7 days') as players_7d,
               (select count(*) from public.bug_reports r where r.app_version = b.version) as bugs_total,
               (select count(*) from public.app_update_events e where e.bundle_version = b.version and e.event = 'rolled_back') as rollbacks_total,
               (select count(*) from public.app_update_events e where e.bundle_version = b.version and e.event = 'applied') as applied_total
          from public.app_bundles b order by b.id desc limit 40) x),
    'adoption', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.players_7d desc), '[]'::jsonb) from (
        select coalesce(last_platform, '?') as platform, coalesce(last_app_version, '?') as version,
               count(*) filter (where last_seen_at > now() - interval '24 hours') as players_24h,
               count(*) as players_7d
          from public.profiles where last_seen_at > now() - interval '7 days'
         group by 1, 2) x),
    'overrides', (
      select coalesce(jsonb_agg(jsonb_build_object('user_id', o.user_id, 'username', p.username, 'channel', o.channel, 'note', o.note, 'set_at', o.set_at)), '[]'::jsonb)
        from public.app_channel_overrides o join public.profiles p on p.id = o.user_id),
    'log', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.at desc), '[]'::jsonb) from (
        select l.id, l.action, l.channel, l.reason, l.detail, l.at,
               (select version from public.app_bundles where id = l.from_bundle) as from_version,
               (select version from public.app_bundles where id = l.to_bundle) as to_version,
               (select username from public.profiles where id = l.actor) as actor
          from public.app_release_log l order by l.at desc limit 60) x)
  );
end $$;
grant execute on function public.rvn_admin_release_overview() to authenticated;

-- ─── Storage: viešas bucket'as bundle'ų failams (content-addressed, nekeičiami) ─────────
insert into storage.buckets (id, name, public)
values ('app-bundles', 'app-bundles', true)
on conflict (id) do nothing;
drop policy if exists app_bundles_public_read on storage.objects;
create policy app_bundles_public_read on storage.objects for select using (bucket_id = 'app-bundles');
drop policy if exists app_bundles_admin_insert on storage.objects;
create policy app_bundles_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'app-bundles' and public.is_admin());
-- Sąmoningai NĖRA update/delete policy: publikuoti failai nekeičiami ir netrinami iš kliento.
