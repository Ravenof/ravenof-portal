-- ── Dienos pasiūlymas: 9 kortos, booster slotų 2–10 logika, IŠ VISŲ frakcijų ──
-- Tokia pati retumo struktūra kaip boosteryje (rvn_open_pack_v3), praleidžiant 1-ą
-- kortą (slot 1). Naudojami slotai 2–10:
--   2–5  : Paprastas
--   6–7  : Magiškas
--   8    : 60% Papr / 30% Mag / 8% Unik / 1% Epišk / 1% Legend
--   9    : 65% Mag / 25% Unik / 8% Epišk / 2% Legend
--   10   : 82% Unik / 15% Epišk / 3% Legend
-- Deterministiška pagal dieną (md5). Be frakcijų ribojimo (visos frakcijos).

create or replace function public.rvn__daily_deal_ids(p_date date)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare v_ids uuid[] := '{}'; slot int; v_roll int; v_so int; v_card uuid;
begin
  for slot in 2..10 loop
    -- deterministinis 0..99 roll pagal datą+slot (saugus nuo neigiamų)
    v_roll := ((('x' || substr(md5('rvn-deal-' || p_date::text || '-' || slot::text), 1, 8))::bit(32)::bigint % 100) + 100) % 100;

    if    slot <= 5 then v_so := 1;                       -- Paprastas
    elsif slot <= 7 then v_so := 2;                       -- Magiškas
    elsif slot = 8  then v_so := case when v_roll < 60 then 1
                                      when v_roll < 90 then 2
                                      when v_roll < 98 then 3
                                      when v_roll < 99 then 4
                                      else 5 end;
    elsif slot = 9  then v_so := case when v_roll < 65 then 2
                                      when v_roll < 90 then 3
                                      when v_roll < 98 then 4
                                      else 5 end;
    else                 v_so := case when v_roll < 82 then 3   -- slot 10 (visada Unik+)
                                      when v_roll < 97 then 4
                                      else 5 end;
    end if;

    -- deterministinė tos retenybės korta (bet kuri frakcija), ne pasikartojanti
    select c.id into v_card
      from public.cards c join public.rarities r on r.id = c.rarity_id
      where c.status = 'active' and r.sort_order = v_so and c.id <> all(v_ids)
      order by md5(c.id::text || p_date::text || slot::text) limit 1;
    -- fallback: jei tos retenybės nėra – bet kuri aktyvi korta
    if v_card is null then
      select c.id into v_card from public.cards c
        where c.status = 'active' and c.id <> all(v_ids)
        order by md5(c.id::text || p_date::text || slot::text) limit 1;
    end if;

    if v_card is not null then v_ids := array_append(v_ids, v_card); end if;
  end loop;
  return v_ids;  -- iki 9 kortų
end $$;
