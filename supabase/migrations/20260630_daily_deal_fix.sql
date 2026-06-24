-- ── Dienos pasiūlymo fix: patikimas deterministinis parinkimas (be setseed/bit) ─
-- Anksčiau naudotas setseed + bit(32) triukas galėjo nesukurti helperio kai kuriose
-- PG versijose → rvn_get_daily_deal tyliai grąžindavo tuščią. Dabar – md5 rikiavimas.

create or replace function public.rvn__daily_deal_ids(p_date date)
returns uuid[] language plpgsql security definer set search_path = public as $$
declare v_epic uuid; v_ids uuid[] := '{}'; r record;
begin
  -- garantuota epic+ (sort_order >= 4), deterministiška pagal dieną
  select c.id into v_epic
    from public.cards c join public.rarities rr on rr.id = c.rarity_id
    where c.status = 'active' and rr.sort_order >= 4
    order by md5(c.id::text || p_date::text) limit 1;
  if v_epic is not null then v_ids := array_append(v_ids, v_epic); end if;

  -- likusios kortos (bet kokio retumo, ne ta pati epic)
  for r in
    select c.id from public.cards c
    where c.status = 'active' and (v_epic is null or c.id <> v_epic)
    order by md5(c.id::text || p_date::text) limit 3
  loop
    v_ids := array_append(v_ids, r.id);
  end loop;

  return v_ids;
end $$;
