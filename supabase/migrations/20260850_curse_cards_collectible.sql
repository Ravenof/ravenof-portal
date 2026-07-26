-- ════════════════════════════════════════════════════════════════════════════
--  PRAKEIKSMAI = KOLEKCINĖS DEMONŲ KORTOS
--  ─────────────────────────────────────────────────────────────────────────
--  Taisyklė: prakeiksmus reikia TURĖTI (kolekcijoje), o gaunami jie iš
--  boosterių lygiai taip pat kaip kitos demonų kortos. Kad `rvn_open_pack_v3`
--  juos ištrauktų, kiekvienas aktyvus prakeiksmas privalo turėti:
--    • status = 'active'   • rarity_id (retumas)   • faction_id (Demonai)
--  Ši migracija:
--    1) parodo diagnostiką (kiek prakeiksmų ir ko jiems trūksta),
--    2) UŽPILDO TIK NULL laukus (nieko neperrašo!) — rarity = žemiausias
--       (Paprastas), faction = Demonai,
--    3) užtikrina, kad demonų boosteryje (pack_factions) yra Demonų frakcija,
--    4) pabaigoje pakartoja diagnostiką — po jos prakeiksmai kritinių
--       trūkumų turėti nebeturi.
--  Idempotentiška: pakartotinai paleidus nieko nebekeičia.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_curse_type int; v_demon int; v_rar int;
  n_all int; n_active int; n_no_rar int; n_no_fac int; n_other_fac int;
  n_fix_rar int := 0; n_fix_fac int := 0; n_packs int := 0;
begin
  -- Prakeiksmų kortos tipas (pagal pavadinimą — id nėra hardcodinamas)
  select id into v_curse_type from public.card_types
   where name ilike '%prakeik%' or name ilike '%curse%' order by id limit 1;
  if v_curse_type is null then
    raise notice 'PRAKEIKSMAI: card_types eilutės nerasta — nieko nedarau';
    return;
  end if;

  select id into v_demon from public.factions
   where name ilike '%demon%' or slug ilike '%demon%' order by sort_order nulls last, id limit 1;
  select id into v_rar from public.rarities order by sort_order nulls last, id limit 1;

  select count(*) into n_all      from public.cards where card_type_id = v_curse_type;
  select count(*) into n_active   from public.cards where card_type_id = v_curse_type and status = 'active';
  select count(*) into n_no_rar   from public.cards where card_type_id = v_curse_type and status = 'active' and rarity_id is null;
  select count(*) into n_no_fac   from public.cards where card_type_id = v_curse_type and status = 'active' and faction_id is null;
  select count(*) into n_other_fac from public.cards
   where card_type_id = v_curse_type and status = 'active' and faction_id is not null and faction_id is distinct from v_demon;

  raise notice 'PRAKEIKSMAI prieš: viso=% aktyvių=% be retumo=% be frakcijos=% kitos frakcijos=% (demonų frakcija id=%, žemiausias retumas id=%)',
    n_all, n_active, n_no_rar, n_no_fac, n_other_fac, v_demon, v_rar;

  -- 1) retumas (be jo boosteris kortos niekada neišrenka)
  if v_rar is not null and n_no_rar > 0 then
    update public.cards set rarity_id = v_rar
     where card_type_id = v_curse_type and status = 'active' and rarity_id is null;
    get diagnostics n_fix_rar = row_count;
  end if;

  -- 2) frakcija (be jos korta nepatenka į frakcinį boosterį ir į kaladės albumą)
  if v_demon is not null and n_no_fac > 0 then
    update public.cards set faction_id = v_demon
     where card_type_id = v_curse_type and status = 'active' and faction_id is null;
    get diagnostics n_fix_fac = row_count;
  end if;

  -- 3) demonų boosteryje turi būti Demonų frakcija (kitaip prakeiksmai neiškris)
  if v_demon is not null then
    insert into public.pack_factions (pack_id, faction_id)
    select p.id, v_demon from public.card_packs p
     where p.is_active
       and (p.name ilike '%demon%' or p.description ilike '%demon%')
       and not exists (select 1 from public.pack_factions pf where pf.pack_id = p.id and pf.faction_id = v_demon);
    get diagnostics n_packs = row_count;
  end if;

  select count(*) into n_no_rar from public.cards where card_type_id = v_curse_type and status = 'active' and rarity_id is null;
  select count(*) into n_no_fac from public.cards where card_type_id = v_curse_type and status = 'active' and faction_id is null;
  raise notice 'PRAKEIKSMAI po: priskirta retumų=% priskirta frakcijų=% papildyta boosterių=% | liko be retumo=% be frakcijos=%',
    n_fix_rar, n_fix_fac, n_packs, n_no_rar, n_no_fac;

  if n_other_fac > 0 then
    raise notice 'DĖMESIO: % prakeiksmų priskirti NE demonų frakcijai — jie iškris tik tos frakcijos boosteriuose (nekeičiu automatiškai)', n_other_fac;
  end if;
end $$;

-- Patogumui: peržiūra adminui — kurie prakeiksmai kritiškai nepilni
create or replace view public.rvn_curse_cards_health as
select c.id, c.card_number, c.name, c.status, c.rarity_id, c.faction_id,
       (c.status = 'active' and c.rarity_id is not null and c.faction_id is not null) as droppable
  from public.cards c
  join public.card_types t on t.id = c.card_type_id
 where t.name ilike '%prakeik%' or t.name ilike '%curse%';
