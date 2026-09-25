-- ════════════════════════════════════════════════════════════════════════════
-- KRYŽMINIS (ŽMK ⇄ KLASIKA) REITINGO MATCHMAKING'AS (2026-10-02)
-- ════════════════════════════════════════════════════════════════════════════
--  • rvn_queue_poll: laukiant grąžina `otherFormat` — kiek žaidėjų laukia KITO
--    formato aktyviame sezone TAVO tenykščio rango spindulyje (profilis kitame
--    sezone sukuriamas, jei nėra). Klientas rodo pasiūlymą.
--  • rvn_queue_switch(p_to_format): ATOMIŠKAI perkelia mane į kito formato eilę ir
--    suporuoja su konkrečiu laukiančiuoju (kambarys su to formato žyme). Kandidatui
--    dingus — 'gone' (lieku savo eilėje). Dvigubo „taip" lenktynės sprendžiamos
--    `for update` užraktais: vienas suporuoja, kitas pamato 'matched'.
--  Laukiančio žaidėjo NEKLAUSIAMA — sutinka tik pereinantis.

create or replace function public.rvn_queue_poll(p_range int default 3)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_me public.ranked_queue;
  v_opp public.ranked_queue;
  v_match_id uuid;
  v_host uuid; v_guest uuid; v_host_deck uuid; v_guest_deck uuid;
  v_host_name text; v_guest_name text;
  v_is_host boolean; v_format text;
  v_other_fmt text; v_other_season uuid; v_other_step int; v_other_n int := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_me from public.ranked_queue where user_id = v_uid;
  if v_me.user_id is null then return jsonb_build_object('status','left'); end if;

  if v_me.match_id is not null then
    select host_id into v_host from public.pvp_matches where id = v_me.match_id;
    return jsonb_build_object('status','matched', 'matchId', v_me.match_id::text,
      'isHost', (v_host = v_uid), 'opponent', v_me.matched_with::text);
  end if;

  select * into v_opp from public.ranked_queue
    where user_id <> v_uid and matched_with is null and match_id is null
      and season_id = v_me.season_id
      and abs(rank_step - v_me.rank_step) <= p_range
    order by enqueued_at asc
    for update skip locked
    limit 1;

  if v_opp.user_id is null then
    -- Kitas formatas: ar ten kas nors laukia mano tenykščio rango spindulyje?
    select coalesce(format,'zmk') into v_format from public.ranked_seasons where id = v_me.season_id;
    v_other_fmt := case when v_format = 'classic' then 'zmk' else 'classic' end;
    select id into v_other_season from public.ranked_seasons where is_active and format = v_other_fmt limit 1;
    if v_other_season is not null then
      select rank_step into v_other_step from public.ranked_profiles where user_id = v_uid and season_id = v_other_season;
      v_other_step := coalesce(v_other_step, 0);
      select count(*) into v_other_n from public.ranked_queue
        where user_id <> v_uid and matched_with is null and match_id is null
          and season_id = v_other_season and abs(rank_step - v_other_step) <= p_range;
    end if;
    return jsonb_build_object('status','waiting',
      'otherFormat', case when v_other_n > 0 then jsonb_build_object('format', v_other_fmt, 'waiting', v_other_n) else null end);
  end if;

  select coalesce(format, 'zmk') into v_format from public.ranked_seasons where id = v_me.season_id;

  v_host := v_opp.user_id; v_host_deck := v_opp.deck_id;
  v_guest := v_uid;        v_guest_deck := v_me.deck_id;
  select coalesce(display_name, username, 'Žaidėjas') into v_host_name from public.profiles where id = v_host;
  select coalesce(display_name, username, 'Žaidėjas') into v_guest_name from public.profiles where id = v_guest;

  insert into public.pvp_matches (is_public, status, host_id, host_deck_id, host_name, guest_id, guest_deck_id, guest_name, format)
    values (true, 'ready', v_host, v_host_deck, v_host_name, v_guest, v_guest_deck, v_guest_name, coalesce(v_format, 'zmk'))
    returning id into v_match_id;

  update public.ranked_queue set matched_with = v_guest, match_id = v_match_id where user_id = v_host;
  update public.ranked_queue set matched_with = v_host,  match_id = v_match_id where user_id = v_guest;

  v_is_host := (v_host = v_uid);
  return jsonb_build_object('status','matched', 'matchId', v_match_id::text,
    'isHost', v_is_host, 'opponent', v_opp.user_id::text);
end $$;
grant execute on function public.rvn_queue_poll(int) to authenticated;

create or replace function public.rvn_queue_switch(p_to_format text, p_range int default 3)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_me public.ranked_queue; v_opp public.ranked_queue;
  v_fmt text := case when p_to_format = 'classic' then 'classic' else 'zmk' end;
  v_season public.ranked_seasons; v_p public.ranked_profiles;
  v_match_id uuid; v_host uuid; v_host_name text; v_guest_name text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- 1) mano eilutė (užrakinta): jei mane jau suporavo — grąžinam matched, nieko nekeičiam
  select * into v_me from public.ranked_queue where user_id = v_uid for update;
  if v_me.user_id is null then return jsonb_build_object('status','left'); end if;
  if v_me.match_id is not null then
    select host_id into v_host from public.pvp_matches where id = v_me.match_id;
    return jsonb_build_object('status','matched', 'matchId', v_me.match_id::text,
      'isHost', (v_host = v_uid), 'opponent', v_me.matched_with::text);
  end if;
  -- 2) kito formato sezonas + mano profilis jame (rangas ten)
  v_season := public.rvn_active_season(v_fmt);
  if v_season.id = v_me.season_id then return jsonb_build_object('status','same'); end if;
  v_p := public.rvn_ensure_ranked_profile(v_fmt);
  -- 3) konkretus kandidatas kitame sezone (užrakinam; lenktynėse laukiam, o ne praleidžiam)
  select * into v_opp from public.ranked_queue
    where user_id <> v_uid and matched_with is null and match_id is null
      and season_id = v_season.id
      and abs(rank_step - v_p.rank_step) <= p_range
    order by enqueued_at asc
    for update
    limit 1;
  if v_opp.user_id is null then return jsonb_build_object('status','gone'); end if;
  -- 4) perkeliam mane į kitą sezoną ir suporuojam su juo (jis = host, aš = guest)
  update public.ranked_queue set season_id = v_season.id, rank_step = v_p.rank_step, enqueued_at = now() where user_id = v_uid;
  select coalesce(display_name, username, 'Žaidėjas') into v_host_name from public.profiles where id = v_opp.user_id;
  select coalesce(display_name, username, 'Žaidėjas') into v_guest_name from public.profiles where id = v_uid;
  insert into public.pvp_matches (is_public, status, host_id, host_deck_id, host_name, guest_id, guest_deck_id, guest_name, format)
    values (true, 'ready', v_opp.user_id, v_opp.deck_id, v_host_name, v_uid, v_me.deck_id, v_guest_name, v_fmt)
    returning id into v_match_id;
  update public.ranked_queue set matched_with = v_uid,         match_id = v_match_id where user_id = v_opp.user_id;
  update public.ranked_queue set matched_with = v_opp.user_id, match_id = v_match_id where user_id = v_uid;
  return jsonb_build_object('status','matched', 'matchId', v_match_id::text, 'isHost', false,
    'opponent', v_opp.user_id::text, 'format', v_fmt);
end $$;
grant execute on function public.rvn_queue_switch(text, int) to authenticated;
