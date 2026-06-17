-- ── Ravenof Digital ekonomika (FAZĖ 2): pakuotės atplėšimas ──────────────────
-- rvn_open_pack: sunaudoja 1 turimą pakuotę, ištraukia cards_per_pack (def. 10)
-- kortų pagal retumo svorį (svoris pagal rarities.sort_order rangą; dažniausias =
-- didžiausias svoris → 5/4/3/2/1), prideda į user_collections, įrašo log'ą ir
-- GRĄŽINA kortų ID masyvą. Detales (paveikslą/retumą/frakciją) klientas paima atskirai.

drop function if exists public.rvn_open_pack(uuid);
create or replace function public.rvn_open_pack(p_pack_id uuid)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  v_qty int; v_count int; i int; k int; v_card uuid;
  v_received uuid[] := '{}';
  v_rarities int[]; n int; v_total_w int; v_r int; v_acc int; v_rar int;
begin
  select quantity into v_qty from public.user_pack_inventory where user_id = auth.uid() and pack_id = p_pack_id;
  if coalesce(v_qty,0) < 1 then raise exception 'no pack to open'; end if;

  select coalesce(cards_per_pack,10) into v_count from public.card_packs where id = p_pack_id;
  if v_count is null then v_count := 10; end if;

  select array_agg(id order by sort_order), count(*)::int into v_rarities, n from public.rarities;
  if n is null or n = 0 then raise exception 'no rarities'; end if;
  v_total_w := (n*(n+1))/2;

  update public.user_pack_inventory set quantity = quantity - 1 where user_id = auth.uid() and pack_id = p_pack_id;

  for i in 1..v_count loop
    v_r := floor(random()*v_total_w)::int; v_acc := 0; v_rar := null;
    for k in 1..n loop v_acc := v_acc + (n-(k-1)); if v_r < v_acc then v_rar := v_rarities[k]; exit; end if; end loop;

    select id into v_card from public.cards where status='active' and rarity_id = v_rar order by random() limit 1;
    if v_card is null then select id into v_card from public.cards where status='active' order by random() limit 1; end if;
    if v_card is null then continue; end if;

    v_received := array_append(v_received, v_card);
    update public.user_collections set quantity = quantity + 1 where user_id = auth.uid() and card_id = v_card;
    if not found then insert into public.user_collections (user_id, card_id, quantity) values (auth.uid(), v_card, 1); end if;
  end loop;

  begin
    insert into public.user_pack_openings (user_id, pack_id, cards_received) values (auth.uid(), p_pack_id, v_received);
  exception when others then null; end;

  return v_received;
end $$;

grant execute on function public.rvn_open_pack(uuid) to authenticated;
