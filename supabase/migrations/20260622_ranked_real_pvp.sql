-- ════════════════════════════════════════════════════════════════════════════
-- Ranked realių žaidėjų kovos: suporavus DU tikrus žaidėjus, sukuriamas realus
-- pvp_matches kambarys (host/guest) ir kova vyksta per esamą realtime PvP sync
-- (broadcast), o NE per lokalų AI. rvn_queue_poll dabar grąžina match_id + roles.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn_queue_poll(p_range int default 3)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_me public.ranked_queue;
  v_opp public.ranked_queue;
  v_match_id uuid;
  v_host uuid; v_guest uuid; v_host_deck uuid; v_guest_deck uuid;
  v_host_name text; v_guest_name text;
  v_is_host boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_me from public.ranked_queue where user_id = v_uid;
  if v_me.user_id is null then return jsonb_build_object('status','left'); end if;

  -- Jau suporuotas (mane suporavo kita pusė)?
  if v_me.match_id is not null then
    select host_id into v_host from public.pvp_matches where id = v_me.match_id;
    return jsonb_build_object('status','matched', 'matchId', v_me.match_id::text,
      'isHost', (v_host = v_uid), 'opponent', v_me.matched_with::text);
  end if;

  -- Ieškom kito laukiančio žaidėjo rango spindulyje (užrakinam, kad nebūtų lenktynių)
  select * into v_opp from public.ranked_queue
    where user_id <> v_uid and matched_with is null and match_id is null
      and abs(rank_step - v_me.rank_step) <= p_range
    order by enqueued_at asc
    for update skip locked
    limit 1;

  if v_opp.user_id is null then
    return jsonb_build_object('status','waiting');
  end if;

  -- Host = anksčiau laukęs (v_opp), guest = dabartinis (v_me)
  v_host := v_opp.user_id; v_host_deck := v_opp.deck_id;
  v_guest := v_uid;        v_guest_deck := v_me.deck_id;
  select coalesce(display_name, username, 'Žaidėjas') into v_host_name from public.profiles where id = v_host;
  select coalesce(display_name, username, 'Žaidėjas') into v_guest_name from public.profiles where id = v_guest;

  insert into public.pvp_matches (is_public, status, host_id, host_deck_id, host_name, guest_id, guest_deck_id, guest_name)
    values (true, 'ready', v_host, v_host_deck, v_host_name, v_guest, v_guest_deck, v_guest_name)
    returning id into v_match_id;

  update public.ranked_queue set matched_with = v_guest, match_id = v_match_id where user_id = v_host;
  update public.ranked_queue set matched_with = v_host,  match_id = v_match_id where user_id = v_guest;

  v_is_host := (v_host = v_uid); -- dabartinis žaidėjas yra guest, tad false
  return jsonb_build_object('status','matched', 'matchId', v_match_id::text,
    'isHost', v_is_host, 'opponent', v_opp.user_id::text);
end $$;

grant execute on function public.rvn_queue_poll(int) to authenticated;
