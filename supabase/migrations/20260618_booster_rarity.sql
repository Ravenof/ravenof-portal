-- ── Ravenof boosterių retumo + frakcijų sistema ───────────────────────────────
-- 2 boosterio tipai (frakcijų ribojimas), 10 kortų. Slotų retumas:
--   kortos 1–9: Paprastas12 / Magiškas9 / Unikalus6 / Epiškas3 / Legendinis1 (sum 31)
--   korta 10:   Unikalus6 / Epiškas3 / Legendinis1 (sum 10) — visada Unikalus arba geresnė.
-- Frakcijos/retumai susiejami pagal slug/sort_order (ne hardcoded id).

-- 1) Pakuotės ↔ leistinos frakcijos
create table if not exists public.pack_factions (
  pack_id    uuid not null references public.card_packs(id) on delete cascade,
  faction_id int  not null references public.factions(id)   on delete cascade,
  primary key (pack_id, faction_id)
);
alter table public.pack_factions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pack_factions' and policyname='pack_factions_read') then
    create policy "pack_factions_read" on public.pack_factions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pack_factions' and policyname='pack_factions_admin') then
    create policy "pack_factions_admin" on public.pack_factions for all using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end $$;

-- 2) Senas „test" pakas — išjungiam
update public.card_packs set is_active = false where name = 'test';

-- 3) Du boosteriai (idempotentiška pagal name)
insert into public.card_packs (name, description, cards_per_pack, daily_limit, is_active, sort_order, price_gold)
select 'Gėrio gynėjai', 'Mistikos melodija · Inkvizicijos legionas · Šviesos pulkas · Rytų vėjas · Universalus', 10, 0, true, 1, 200
where not exists (select 1 from public.card_packs where name = 'Gėrio gynėjai');

insert into public.card_packs (name, description, cards_per_pack, daily_limit, is_active, sort_order, price_gold)
select 'Tamsos aliansas', 'Vryhioko gauja · Demonų orda · Mirties maršas · Plėšikų naktis · Universalus', 10, 0, true, 2, 200
where not exists (select 1 from public.card_packs where name = 'Tamsos aliansas');

-- 4) Frakcijų susiejimas (pagal slug; idempotentiška)
insert into public.pack_factions (pack_id, faction_id)
select p.id, f.id
from public.card_packs p
join public.factions f on f.slug in ('mistikos-melodija','inkvizicijos-legionas','sviesos-pulkas','rytu-vejas','universalus')
where p.name = 'Gėrio gynėjai'
on conflict do nothing;

insert into public.pack_factions (pack_id, faction_id)
select p.id, f.id
from public.card_packs p
join public.factions f on f.slug in ('vryhioko-gauja','demonu-orda','mirties-marsas','plesiku-naktis','universalus')
where p.name = 'Tamsos aliansas'
on conflict do nothing;

-- 5) Atplėšimo funkcija v3 (slotų retumas + frakcijų ribojimas)
create or replace function public.rvn_open_pack_v3(p_pack_id uuid)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare
  v_qty int; v_count int; i int; v_card uuid;
  v_received uuid[] := '{}';
  v_factions int[]; v_restrict boolean;
  v_pick int; v_so int; v_rarity int;
begin
  select quantity into v_qty from public.user_pack_inventory where user_id = auth.uid() and pack_id = p_pack_id;
  if coalesce(v_qty,0) < 1 then raise exception 'no pack to open'; end if;

  select coalesce(cards_per_pack,10) into v_count from public.card_packs where id = p_pack_id;
  if v_count is null then v_count := 10; end if;

  select array_agg(faction_id) into v_factions from public.pack_factions where pack_id = p_pack_id;
  v_restrict := v_factions is not null and array_length(v_factions,1) > 0;

  update public.user_pack_inventory set quantity = quantity - 1 where user_id = auth.uid() and pack_id = p_pack_id;

  for i in 1..v_count loop
    -- retumo slotas pagal sort_order (1 Paprastas .. 5 Legendinis)
    if i < v_count then
      v_pick := floor(random()*31)::int;     -- 0..30
      v_so := case when v_pick < 12 then 1    -- Paprastas (12)
                   when v_pick < 21 then 2    -- Magiškas (9)
                   when v_pick < 27 then 3    -- Unikalus (6)
                   when v_pick < 30 then 4    -- Epiškas (3)
                   else 5 end;                -- Legendinis (1)
    else
      v_pick := floor(random()*10)::int;      -- 0..9 (paskutinė korta: Unikalus+)
      v_so := case when v_pick < 6 then 3     -- Unikalus (6)
                   when v_pick < 9 then 4     -- Epiškas (3)
                   else 5 end;                -- Legendinis (1)
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
