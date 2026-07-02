-- ══════════════════════════════════════════════════════════════════════════════
-- Ekonomikos balansas + sezono kelio "featured" kortos (rotacija kas mėnesį)
--
-- AUKSO LENTELĖ (pergalė/pralaimėjimas):
--   PvE easy 10/10 · normal 25/10 · hard 50/10
--   Draugiška PvP 60/20  (buvo 100/0 — lengvai farminama su draugu)
--   Ranked 80/25         (buvo 0 už eilinę kovą — nefair vs draugiška)
-- XP (rvn_report_match): pralaimėjimo XP kiek pakeltas, kad kova visada jaustųsi verta.
-- Parduotuvė: frakciniai boosteriai 250 (taiklesnis pull'as = premium), standartinis 200.
-- Sezono kelias: kortų pakopos rodo KONKREČIĄ šio mėnesio kortą (deterministinė
-- rotacija pagal YYYY-MM + pakopą; aukštesnė pakopa = retesnė, 10 pakopa = legendinė).
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1) Aukso lubos pagal priežastį ───────────────────────────────────────────
create or replace function public.rvn_award_gold(p_reason text, p_amount int)
returns int language plpgsql security definer set search_path = public as $$
declare v_max int; v_amt int; v_new int;
begin
  v_max := case p_reason
    when 'pve_easy'     then 10
    when 'pve_normal'   then 25
    when 'pve_hard'     then 50
    when 'pve_loss'     then 10
    when 'pvp_unranked' then 60
    when 'pvp_loss'     then 20
    when 'ranked_win'   then 80
    when 'ranked_loss'  then 25
    else 0 end;
  if v_max = 0 then raise exception 'unknown reason %', p_reason; end if;
  v_amt := least(greatest(coalesce(p_amount, v_max), 0), v_max);
  update public.profiles set gold = gold + v_amt where id = auth.uid() returning gold into v_new;
  return v_new;
end $$;

-- ── 2) Kovos XP: pralaimėjimas visada duoda šiek tiek ────────────────────────
create or replace function public.rvn_report_match(p_won boolean, p_mode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_xp int := 0; v_before bigint := 0; v_after bigint := 0; v_reason text;
begin
  if v_uid is null then
    return jsonb_build_object('xpGained', 0, 'totalBefore', 0, 'totalAfter', 0);
  end if;
  v_xp := case p_mode
    when 'pvp'        then case when p_won then 60 else 25 end
    when 'pve_hard'   then case when p_won then 45 else 15 end
    when 'pve_normal' then case when p_won then 25 else 10 end
    when 'pve_easy'   then case when p_won then 15 else 5  end
    else                   case when p_won then 20 else 6  end
  end;
  select coalesce(xp_total, 0) into v_before from public.profiles where id = v_uid;
  if v_xp > 0 then
    v_reason := case when p_won then 'Kovos pergalė' else 'Sužaista kova' end;
    insert into public.xp_transactions (user_id, amount, reason, source_type)
      values (v_uid, v_xp, v_reason, 'match');
  end if;
  select coalesce(xp_total, 0) into v_after from public.profiles where id = v_uid;
  v_after := greatest(v_after, v_before + v_xp);
  return jsonb_build_object('xpGained', v_xp, 'totalBefore', v_before, 'totalAfter', v_after);
end $$;

-- ── 3) Parduotuvės kainos: frakciniai boosteriai premium ─────────────────────
update public.card_packs set price_gold = 250 where name in ('Gėrio gynėjai', 'Tamsos aliansas') and price_gold = 200;

-- ── 4) Šio mėnesio "featured" korta pakopai (deterministinė rotacija) ────────
create or replace function public.rvn_pass_featured_card(p_tier int, p_cardmin text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_so int; v_card record;
begin
  v_so := case p_cardmin when 'magic' then 2 when 'unique' then 3 when 'epic' then 4 when 'legendary' then 5 else 2 end;
  select c.id, c.name, c.image_url, r.name as rarity into v_card
    from public.cards c
    join public.rarities r on r.id = c.rarity_id
   where c.status = 'active' and r.sort_order >= v_so
   order by md5(c.id::text || to_char(current_date, 'YYYY-MM') || p_tier::text)
   limit 1;
  if v_card.id is null then return null; end if;
  return jsonb_build_object('id', v_card.id, 'name', v_card.name, 'imageUrl', v_card.image_url, 'rarity', v_card.rarity);
end $$;

-- ── 5) Sezono kelias grąžina featured kortą prie pakopų su cardMin ───────────
create or replace function public.rvn_get_season_pass()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_season public.season_pass_seasons; v_up public.user_season_pass; v_tiers jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_season from public.season_pass_seasons where is_active order by starts_at desc limit 1;
  if v_season.id is null then return jsonb_build_object('season', null); end if;
  v_sid := v_season.id;
  select * into v_up from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  if v_up.user_id is null then
    insert into public.user_season_pass (user_id, season_id) values (v_uid, v_sid) on conflict do nothing;
    select * into v_up from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  end if;
  select jsonb_agg(
      jsonb_build_object(
        'tier', tier, 'xpRequired', xp_required, 'title', title, 'reward', reward_payload,
        'card', case when reward_payload ? 'cardMin'
                     then public.rvn_pass_featured_card(tier, reward_payload->>'cardMin')
                     else null end
      ) order by tier)
    into v_tiers from public.season_pass_tiers where season_id=v_sid;
  return jsonb_build_object(
    'season', jsonb_build_object('id',v_season.id,'title',v_season.title,'endsAt',v_season.ends_at),
    'xp', v_up.xp, 'claimedTiers', to_jsonb(v_up.claimed_tiers), 'tiers', coalesce(v_tiers,'[]'::jsonb));
end $$;

-- ── 6) Claim skiria BŪTENT rodomą featured kortą ─────────────────────────────
create or replace function public.rvn_claim_pass_tier(p_tier int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_sid uuid; v_xpreq int; v_payload jsonb; v_up public.user_season_pass;
        v_card jsonb; v_card_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_sid from public.season_pass_seasons where is_active order by starts_at desc limit 1;
  if v_sid is null then raise exception 'no active season'; end if;
  select xp_required, reward_payload into v_xpreq, v_payload from public.season_pass_tiers where season_id=v_sid and tier=p_tier;
  if v_xpreq is null then raise exception 'tier not found'; end if;
  select * into v_up from public.user_season_pass where user_id=v_uid and season_id=v_sid;
  if v_up.user_id is null then raise exception 'no pass'; end if;
  if v_up.xp < v_xpreq then raise exception 'tier locked'; end if;
  if p_tier = any(v_up.claimed_tiers) then raise exception 'already claimed'; end if;
  update public.user_season_pass set claimed_tiers = array_append(claimed_tiers, p_tier) where user_id=v_uid and season_id=v_sid;

  -- featured korta (jei pakopa jos turi) — skiriam TĄ PAČIĄ, kurią UI rodė
  if v_payload ? 'cardMin' then
    v_card := public.rvn_pass_featured_card(p_tier, v_payload->>'cardMin');
    if v_card is not null then
      v_card_id := (v_card->>'id')::uuid;
      insert into public.user_collections (user_id, card_id, quantity)
        values (v_uid, v_card_id, 1)
        on conflict (user_id, card_id) do update set quantity = public.user_collections.quantity + 1;
    end if;
    perform public.rvn__grant_payload(v_uid, v_payload - 'cardMin', 'season_pass');
  else
    perform public.rvn__grant_payload(v_uid, v_payload, 'season_pass');
  end if;

  return jsonb_build_object('ok', true, 'reward', v_payload, 'card', v_card);
end $$;

grant execute on function public.rvn_award_gold(text, int)        to authenticated;
grant execute on function public.rvn_report_match(boolean, text)  to authenticated;
grant execute on function public.rvn_pass_featured_card(int, text) to authenticated;
grant execute on function public.rvn_get_season_pass()            to authenticated;
grant execute on function public.rvn_claim_pass_tier(int)         to authenticated;
