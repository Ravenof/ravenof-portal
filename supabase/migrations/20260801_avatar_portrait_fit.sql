-- ── Avatar portreto/video kadravimas (zoom + move) ───────────────────────────
-- portrait_fit: { "x": 0-100, "y": 0-100, "zoom": 100-300 } – taikoma img IR video.
alter table public.cosmetics add column if not exists portrait_fit jsonb;

create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'name',name,'description',description,
                                      'priceGold',price_gold,'css',css,'emoji',emoji,'imageUrl',image_url,
                                      'rarity',rarity,'ownedByDefault',owned_by_default,'videos',coalesce(videos,'[]'::jsonb),
                                      'portraitFit',portrait_fit) order by sort_order, name)
    into v_list from public.cosmetics where is_active and coalesce(status,'active')='active';
  select coalesce(jsonb_agg(cid),'[]'::jsonb) into v_owned from (
    select cosmetic_id as cid from public.user_cosmetics where user_id=v_uid
    union
    select id from public.cosmetics where owned_by_default and is_active
  ) q;
  select equipped_card_back, equipped_board, equipped_avatar into v_cb, v_bd, v_av from public.profiles where id=v_uid;
  return jsonb_build_object('items', coalesce(v_list,'[]'::jsonb), 'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av);
end $$;
grant execute on function public.rvn_get_cosmetics() to authenticated;
