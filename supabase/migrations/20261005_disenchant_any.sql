-- ════════════════════════════════════════════════════════════════════════════
-- Išardymas (disenchant) – bet kuri turima korta, ne tik dublikatai virš limito
-- (commit743). Esencijos vertė ta pati (economy_config craft.disenchant).
-- Paskutinė kopija išardžius – eilutė user_collections pašalinama (kad
-- „turimų" patikros nelaikytų 0 kiekio kortos turima).
-- Kaladės, kuriose korta naudojama, NEkeičiamos – jos tampa nepilnos ir
-- esama validacija (trūkstamos kortos) jas pažymi. UI įspėja prieš ardant.
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.rvn_disenchant_card(p_card_id uuid, p_count int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_cfg jsonb; v_tier int; v_qty int; v_val int; v_gain int;
begin
  if v_uid is null then return jsonb_build_object('error','no auth'); end if;
  if coalesce(p_count,0) <= 0 then return jsonb_build_object('error','bad_count'); end if;
  select value into v_cfg from public.economy_config where key='craft';
  v_tier := public.rvn__card_rarity_tier(p_card_id);
  select quantity into v_qty from public.user_collections where user_id=v_uid and card_id=p_card_id for update;
  if coalesce(v_qty,0) <= 0 then return jsonb_build_object('error','not_owned'); end if;
  if v_qty < p_count then return jsonb_build_object('error','bad_count', 'owned', v_qty); end if;
  v_val := coalesce((v_cfg->'disenchant'->>v_tier::text)::int, 10);
  v_gain := v_val * p_count;

  if v_qty = p_count then
    delete from public.user_collections where user_id=v_uid and card_id=p_card_id;
  else
    update public.user_collections set quantity = quantity - p_count where user_id=v_uid and card_id=p_card_id;
  end if;
  update public.profiles set essence = essence + v_gain where id=v_uid;
  insert into public.reward_transactions(user_id, source_type, source_id, reward_type, currency_type, amount, item_type, item_id, quantity)
    values (v_uid, 'craft_disenchant', p_card_id::text, 'currency', 'essence', v_gain, 'card', p_card_id::text, -p_count);
  return jsonb_build_object('ok',true,'essenceGained',v_gain,
    'essence',(select essence from public.profiles where id=v_uid),
    'owned', v_qty - p_count);
end $$;

grant execute on function public.rvn_disenchant_card(uuid, int) to authenticated;
