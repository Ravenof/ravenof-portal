-- ── Ravenof boosterio retumo struktūra v2 (10 kortų, fiksuoti slotai) ─────────
-- Pozicijos (sort_order: 1 Paprastas, 2 Magiškas, 3 Unikalus, 4 Epiškas, 5 Legendinis):
--   1–5  : 100% Paprastas
--   6–7  : 100% Magiškas
--   8    : 60% Paprastas / 30% Magiškas / 8% Unikalus / 1% Epiškas / 1% Legendinis
--   9    : 65% Magiškas / 25% Unikalus / 8% Epiškas / 2% Legendinis
--   10   : 82% Unikalus / 15% Epiškas / 3% Legendinis (visada Unikalus arba geriau)
-- Taikoma ABIEM boosteriams (ta pati funkcija + pack_factions frakcijų ribojimas).

create or replace function public.rvn_open_pack_v3(p_pack_id uuid)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  v_qty int; v_count int; i int; v_card uuid;
  v_received uuid[] := '{}';
  v_factions int[]; v_restrict boolean;
  v_roll int; v_so int; v_rarity int;
begin
  select quantity into v_qty from public.user_pack_inventory where user_id = auth.uid() and pack_id = p_pack_id;
  if coalesce(v_qty,0) < 1 then raise exception 'no pack to open'; end if;

  select coalesce(cards_per_pack,10) into v_count from public.card_packs where id = p_pack_id;
  if v_count is null then v_count := 10; end if;

  select array_agg(faction_id) into v_factions from public.pack_factions where pack_id = p_pack_id;
  v_restrict := v_factions is not null and array_length(v_factions,1) > 0;

  update public.user_pack_inventory set quantity = quantity - 1 where user_id = auth.uid() and pack_id = p_pack_id;

  for i in 1..v_count loop
    -- retumo slotas (sort_order) pagal poziciją; 10-os kortos pakas (kitokio dydžio
    -- pakams paskutinė korta visada laikoma „10-a", tarpinės – wildcard 8-os logika)
    if i <= 5 then
      v_so := 1;                                   -- Paprastas
    elsif i = 6 or i = 7 then
      v_so := 2;                                   -- Magiškas
    elsif i = v_count then
      -- paskutinė korta (garant. Unikalus+)
      v_roll := floor(random()*100)::int + 1;      -- 1..100
      v_so := case when v_roll <= 82 then 3        -- Unikalus 82%
                   when v_roll <= 97 then 4        -- Epiškas 15%
                   else 5 end;                     -- Legendinis 3%
    elsif i = v_count - 1 then
      -- priešpaskutinė korta (geresnis wildcard)
      v_roll := floor(random()*100)::int + 1;
      v_so := case when v_roll <= 65 then 2        -- Magiškas 65%
                   when v_roll <= 90 then 3        -- Unikalus 25%
                   when v_roll <= 98 then 4        -- Epiškas 8%
                   else 5 end;                     -- Legendinis 2%
    else
      -- wildcard slotas (8-a ir bet kuri kita tarpinė)
      v_roll := floor(random()*100)::int + 1;
      v_so := case when v_roll <= 60 then 1        -- Paprastas 60%
                   when v_roll <= 90 then 2        -- Magiškas 30%
                   when v_roll <= 98 then 3        -- Unikalus 8%
                   when v_roll <= 99 then 4        -- Epiškas 1%
                   else 5 end;                     -- Legendinis 1%
    end if;

    select id into v_rarity from public.rarities where sort_order = v_so limit 1;

    -- traukti kortą: ta retenybė + leistinos frakcijos; fallback į leistiną frakciją; fallback į bet kurią
    if v_restrict then
      select id into v_card from public.cards
        where status='active' and rarity_id = v_rarity and faction_id = any(v_factions)
        order by random() limit 1;
      if v_card is null then
        select id into v_card from public.cards
          where status='active' and faction_id = any(v_factions)
          order by random() limit 1;
      end if;
    else
      select id into v_card from public.cards
        where status='active' and rarity_id = v_rarity
        order by random() limit 1;
      if v_card is null then
        select id into v_card from public.cards where status='active' order by random() limit 1;
      end if;
    end if;
    if v_card is null then continue; end if;

    v_received := array_append(v_received, v_card);
    update public.user_collections set quantity = quantity + 1 where user_id = auth.uid() and card_id = v_card;
    if not found then insert into public.user_collections (user_id, card_id, quantity) values (auth.uid(), v_card, 1); end if;
  end loop;

  return v_received;
end $$;

grant execute on function public.rvn_open_pack_v3(uuid) to authenticated;
