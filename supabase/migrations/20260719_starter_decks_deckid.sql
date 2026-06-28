-- ════════════════════════════════════════════════════════════════════════════
-- rvn_get_starter_decks: pridedam claimed kaladės deckId (replay'ui tutoriale –
-- jei jau turima, paleidžiam su esama kalade be naujo claim).
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.rvn_get_starter_decks()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object(
    'id', s.id, 'name', s.name, 'description', s.description, 'imageUrl', s.image_url,
    'priceGold', s.price_gold, 'faction', f.name, 'factionId', s.faction_id,
    'cardCount', coalesce((select sum(quantity) from public.starter_deck_cards c where c.starter_deck_id = s.id), 0),
    'claimed', exists(select 1 from public.user_starter_deck_claims u where u.user_id = v_uid and u.starter_deck_id = s.id),
    'deckId', (select u.deck_id from public.user_starter_deck_claims u where u.user_id = v_uid and u.starter_deck_id = s.id)
  ) order by s.sort_order, s.name)
  into v_list
  from public.starter_decks s
  left join public.factions f on f.id = s.faction_id
  where s.is_active;
  return jsonb_build_object('decks', coalesce(v_list, '[]'::jsonb));
end $$;
grant execute on function public.rvn_get_starter_decks() to authenticated;
