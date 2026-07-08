-- ════════════════════════════════════════════════════════════════════════════
--  TIKRI BOOSTERS PARDUOTUVĖJE (feedback: „nėra Tamsos aliansas / Gėrio gynėjai").
--  Problema: grant variklis pakus rinkdavo pagal raktažodžius (rare/champion→
--  paskutinis pagal sort_order, kiti→pirmas) — konkretaus card_pack parduoti
--  nebuvo įmanoma, o seed'iniai shop pakai (standard/faction/rare/champion/10x)
--  buvo fiktyvūs.
--  1) rvn__grant_reward_payload (bazė = NAUJAUSIA 20260816 versija!): pack
--     šakoje PIRMA bandomas tiesioginis card_packs.id (uuid) match — tik tada
--     senoji heuristika (reward payload'ai su 'standard_pack' veikia kaip anksčiau).
--  2) Visi aktyvūs card_packs sinchronizuojami į shop_items (slug=cardpack_<id>,
--     payload item_id = tikras pako uuid, kaina silver=price_gold + rubinai ~12%).
--  3) 5 fiktyvūs seed pakai deaktyvuojami.
--  Idempotentiška — galima kartoti; nauji admin'e pridėti pakai atsiras shope.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.rvn__grant_reward_payload(p_user uuid, p_payload jsonb, p_source_type text, p_source_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  el jsonb; v_cur text; v_amt int; v_it text; v_iid text; v_qty int; v_xpsrc text; v_pid uuid; v_cid text;
begin
  if p_user is null or p_payload is null then return '{}'::jsonb; end if;
  v_xpsrc := case when p_source_type = 'match' then 'match' else 'reward' end;
  for el in select * from jsonb_array_elements(p_payload) loop
    case el->>'type'
      when 'currency' then
        v_cur := el->>'currency'; v_amt := coalesce((el->>'amount')::int,0);
        if v_amt <> 0 then
          if    v_cur = 'silver'  then update public.profiles set gold    = gold    + v_amt where id = p_user;
          elsif v_cur = 'rubies'  then update public.profiles set rubies  = rubies  + v_amt where id = p_user;
          elsif v_cur = 'essence' then update public.profiles set essence = essence + v_amt where id = p_user;
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount)
            values (p_user, p_source_type, p_source_id, 'currency', v_cur, v_amt);
        end if;
      when 'account_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          insert into public.xp_transactions(user_id, amount, reason, source_type) values (p_user, v_amt, 'Atlygis', v_xpsrc);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'account_xp', v_amt);
        end if;
      when 'season_xp' then
        v_amt := coalesce((el->>'amount')::int,0);
        if v_amt > 0 then
          perform public.rvn__add_pass_xp(p_user, v_amt);
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, amount)
            values (p_user, p_source_type, p_source_id, 'season_xp', v_amt);
        end if;
      when 'item' then
        v_it := el->>'item_type'; v_iid := el->>'item_id'; v_qty := coalesce((el->>'quantity')::int,1);
        if v_it is not null and v_iid is not null then
          if v_it = 'pack' then
            v_pid := null;
            -- NAUJA: tiesioginis pako uuid (tikros pakuotės iš shop: Tamsos aliansas ir kt.)
            begin
              select id into v_pid from public.card_packs where id = v_iid::uuid and is_active;
            exception when others then v_pid := null;
            end;
            -- sena heuristika reward slug'ams (standard_pack, rare_pack ir pan.)
            if v_pid is null then
              if v_iid ilike '%rare%' or v_iid ilike '%champion%' or v_iid ilike '%legendary%' then
                select id into v_pid from public.card_packs where is_active order by sort_order desc limit 1;
              else
                select id into v_pid from public.card_packs where is_active order by sort_order asc limit 1;
              end if;
            end if;
            if v_pid is null then select id into v_pid from public.card_packs order by sort_order limit 1; end if;
            if v_pid is not null then
              insert into public.user_pack_inventory(user_id, pack_id, quantity) values (p_user, v_pid, v_qty)
                on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + v_qty;
            end if;
          elsif v_it in ('card_back','player_avatar') then
            select id into v_cid from public.cosmetics where id = v_iid;
            if v_cid is not null then
              insert into public.user_cosmetics(user_id, cosmetic_id) values (p_user, v_cid) on conflict do nothing;
            else
              insert into public.user_inventory(user_id, item_type, item_id, quantity) values (p_user, v_it, v_iid, v_qty)
                on conflict (user_id, item_type, item_id) do update set quantity = public.user_inventory.quantity + v_qty, updated_at = now();
            end if;
          else
            insert into public.user_inventory(user_id, item_type, item_id, quantity) values (p_user, v_it, v_iid, v_qty)
              on conflict (user_id, item_type, item_id) do update set quantity = public.user_inventory.quantity + v_qty, updated_at = now();
          end if;
          insert into public.reward_transactions(user_id, source_type, source_id, reward_type, item_type, item_id, quantity)
            values (p_user, p_source_type, p_source_id, 'item', v_it, v_iid, v_qty);
        end if;
      else null;
    end case;
  end loop;
  return (select jsonb_build_object('silver', gold, 'rubies', rubies, 'essence', essence) from public.profiles where id = p_user);
end $$;

-- 2) tikri card_packs → shop_items
do $$
declare p record; v_id bigint;
begin
  for p in select * from public.card_packs where is_active order by sort_order loop
    insert into public.shop_items(slug, item_type, name, description, payload, sort_order)
      values ('cardpack_' || p.id::text, 'pack', p.name, coalesce(p.description, '10 kortų'),
        jsonb_build_array(jsonb_build_object('type','item','item_type','pack','item_id', p.id::text, 'quantity', 1)),
        10 + coalesce(p.sort_order, 0))
      on conflict (slug) do nothing
      returning id into v_id;
    if v_id is not null and coalesce(p.price_gold, 0) > 0 then
      insert into public.shop_item_prices(shop_item_id, currency_type, amount)
        values (v_id, 'silver', p.price_gold), (v_id, 'rubies', greatest(1, round(p.price_gold * 0.12)::int))
        on conflict do nothing;
    end if;
  end loop;
end $$;

-- 3) fiktyvūs seed pakai lauk iš parduotuvės
update public.shop_items set is_active = false
where slug in ('standard_pack','faction_pack','rare_pack','champion_pack','standard_pack_10');
