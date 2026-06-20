-- ════════════════════════════════════════════════════════════════════════════
-- Reitingo botai: pradeda nuo 0 (50 Bronza) ir laiptus „pasistato" patys.
-- Vietoj pre-seed'into aukšto rango — botai kyla per kontroliuojamą simuliaciją
-- (rvn_simulate_bot_ladder), kurią galima paleisti iš admin arba pagal grafiką.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Reset visiems aktyviems botams į 0 (50 Bronza), nunulinam rezultatus
update public.ranked_bots
set rank_step = 0, wins = 0, losses = 0, wins_vs_real = 0, losses_vs_real = 0,
    creatures_killed = 0, creatures_lost = 0, champions_killed = 0, champions_lost = 0,
    total_kills = 0, total_deaths = 0, total_damage_dealt = 0, total_damage_taken = 0;

-- 2) Botų laiptų simuliacija: kiekvienas raundas — po vieną „virtualią" kovą
--    kiekvienam aktyviam botui. Laimėjimo tikimybė pagal sunkumą (stipresni kyla
--    aukščiau ir greičiau), su lengvu regresu link vidurio, kad nepabėgtų į 149.
create or replace function public.rvn_simulate_bot_ladder(p_rounds int default 1)
returns int language plpgsql security definer set search_path = public as $$
declare b record; i int; v_chance numeric; v_roll numeric; v_step int; v_moved int := 0;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  for i in 1..greatest(1, p_rounds) loop
    for b in select id, rank_step, difficulty from public.ranked_bots where active loop
      v_chance := case b.difficulty when 'hard' then 0.62 when 'easy' then 0.43 else 0.52 end;
      -- lengvas regresas: kuo aukščiau, tuo sunkiau kilti
      v_chance := v_chance - (b.rank_step::numeric / 149) * 0.18;
      v_roll := random();
      if v_roll < v_chance then
        v_step := least(b.rank_step + 1, 149);
        update public.ranked_bots set rank_step = v_step, wins = wins + 1 where id = b.id;
      else
        update public.ranked_bots set losses = losses + 1,
          rank_step = case when random() < 0.5 then greatest(b.rank_step - 1, 0) else b.rank_step end
          where id = b.id;
      end if;
      v_moved := v_moved + 1;
    end loop;
  end loop;
  return v_moved;
end $$;
grant execute on function public.rvn_simulate_bot_ladder(int) to authenticated;

-- 3) Pradinis „pastatymas nuo 0": ~55 raundų duoda natūralų pasiskirstymą
--    (stiprūs botai pasiekia vidurį/viršų, silpni lieka žemai), pradedant nuo 50 Bronza.
do $$
declare b record; i int; v_chance numeric;
begin
  for i in 1..55 loop
    for b in select id, rank_step, difficulty from public.ranked_bots where active loop
      v_chance := case b.difficulty when 'hard' then 0.62 when 'easy' then 0.43 else 0.52 end
                  - (b.rank_step::numeric / 149) * 0.18;
      if random() < v_chance then
        update public.ranked_bots set rank_step = least(b.rank_step + 1, 149), wins = wins + 1 where id = b.id;
      else
        update public.ranked_bots set losses = losses + 1,
          rank_step = case when random() < 0.5 then greatest(b.rank_step - 1, 0) else b.rank_step end
          where id = b.id;
      end if;
    end loop;
  end loop;
end $$;
