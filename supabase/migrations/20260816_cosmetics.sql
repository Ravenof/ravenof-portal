-- ════════════════════════════════════════════════════════════════════════════
--  Ravenof Ekonomika Phase 7 — Cosmetics (TIK card_back + player_avatar)
--  Sujungia reward/shop slug'us su esamu cosmetics katalogu (nuosavybė=user_cosmetics,
--  equip=profiles.equipped_*). Seedina 8 placeholder cosmetics (admin užpildys art/audio).
--  grant_reward_payload dabar card_back/player_avatar deda į user_cosmetics (equippable).
--  Boards paliekami DB, bet UI juos slepia (spec: tik card_back + player_avatar).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 8 cosmetics placeholder (slug'ai sutampa su reward/shop item_id) ─────────
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, rarity, sort_order) values
('basic_card_back',     'card_back', 'Bazinė nugarėlė',     'Paprasta kortų nugarėlė',      800,  'linear-gradient(160deg,#2a2136,#0f0b18)', null, 'common',    10),
('rare_card_back',      'card_back', 'Reta nugarėlė',       'Reta kortų nugarėlė',          1800, 'linear-gradient(160deg,#14345c,#0a1626)', null, 'rare',      20),
('premium_card_back',   'card_back', 'Premium nugarėlė',    'Premium kortų nugarėlė',       3000, 'linear-gradient(160deg,#3a1d5c,#140a26)', null, 'epic',      30),
('legendary_card_back', 'card_back', 'Legendinė nugarėlė',  'Legendinė kortų nugarėlė',     5000, 'linear-gradient(160deg,#5c4a14,#261d0a)', null, 'legendary', 40)
on conflict (id) do nothing;

insert into public.cosmetics (id, kind, name, description, price_gold, emoji, rarity, sort_order) values
('basic_player_avatar',     'avatar', 'Bazinis avataras',    'Paprastas žaidėjo avataras',   1000, '🧙', 'common',    110),
('rare_player_avatar',      'avatar', 'Retas avataras',      'Retas žaidėjo avataras',       2500, '🛡️', 'rare',      120),
('premium_player_avatar',   'avatar', 'Premium avataras',    'Premium žaidėjo avataras',     4500, '👑', 'epic',      130),
('legendary_player_avatar', 'avatar', 'Legendinis avataras', 'Legendinis žaidėjo avataras',  7000, '🐉', 'legendary', 140)
on conflict (id) do nothing;

-- ── grant_reward_payload: card_back/player_avatar -> user_cosmetics (owned) ──
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
            if v_iid ilike '%rare%' or v_iid ilike '%champion%' or v_iid ilike '%legendary%' then
              select id into v_pid from public.card_packs where is_active order by sort_order desc limit 1;
            else
              select id into v_pid from public.card_packs where is_active order by sort_order asc limit 1;
            end if;
            if v_pid is null then select id into v_pid from public.card_packs order by sort_order limit 1; end if;
            if v_pid is not null then
              insert into public.user_pack_inventory(user_id, pack_id, quantity) values (p_user, v_pid, v_qty)
                on conflict (user_id, pack_id) do update set quantity = public.user_pack_inventory.quantity + v_qty;
            end if;
          elsif v_it in ('card_back','player_avatar') then
            -- nuosavybė per user_cosmetics (jei toks cosmetic yra kataloge)
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
