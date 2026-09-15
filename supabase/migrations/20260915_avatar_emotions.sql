-- ── Avatarų emocijos: 4 papildomi portretai (angry / happy / sad / shock), neutral = image_url ──
alter table public.cosmetics add column if not exists emotions jsonb;

-- rvn_get_cosmetics: pridedam 'emotions' į kiekvieną item'ą (visa kita nekeista)
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid uuid := auth.uid();
  v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
  v_active_av text; v_active_cb text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select jsonb_agg(jsonb_build_object(
           'id', c.id, 'kind', c.kind, 'name', c.name, 'description', c.description,
           'priceGold', c.price_gold, 'css', c.css, 'emoji', c.emoji, 'imageUrl', c.image_url,
           'rarity', c.rarity, 'ownedByDefault', c.owned_by_default,
           'videos', coalesce(c.videos, '[]'::jsonb), 'portraitFit', c.portrait_fit,
           'emotions', c.emotions
         ) order by c.sort_order, c.name)
    into v_list
    from public.cosmetics c
   where (
           (c.is_active and coalesce(c.status,'active') = 'active'
            and (not coalesce(c.is_shop_exclusive,false)
                 or exists (select 1 from public.user_cosmetics u where u.user_id=v_uid and u.cosmetic_id=c.id)))
           or exists (select 1 from public.user_cosmetics u where u.user_id=v_uid and u.cosmetic_id=c.id)
           or c.owned_by_default
         );

  select coalesce(jsonb_agg(x.id), '[]'::jsonb) into v_owned from (
    select cosmetic_id as id from public.user_cosmetics where user_id = v_uid
    union
    select id from public.cosmetics where owned_by_default
  ) x;

  select equipped_card_back, equipped_board, equipped_avatar
    into v_cb, v_bd, v_av from public.profiles where id = v_uid;

  v_active_av := coalesce((
    select c.id from public.cosmetics c
     where c.id = v_av and c.kind = 'avatar'
       and (c.owned_by_default or exists (select 1 from public.user_cosmetics u where u.user_id=v_uid and u.cosmetic_id=c.id))
  ), 'av_nekronautas');
  v_active_cb := coalesce((
    select c.id from public.cosmetics c
     where c.id = v_cb and c.kind = 'card_back'
       and (c.owned_by_default or exists (select 1 from public.user_cosmetics u where u.user_id=v_uid and u.cosmetic_id=c.id))
  ), 'cb_default');

  return jsonb_build_object(
    'items', coalesce(v_list, '[]'::jsonb),
    'owned', v_owned,
    'equippedCardBack', v_cb, 'equippedBoard', v_bd, 'equippedAvatar', v_av,
    'active', jsonb_build_object('avatar', v_active_av, 'cardBack', v_active_cb),
    'defaults', jsonb_build_object('avatar', 'av_nekronautas', 'cardBack', 'cb_default')
  );
end $function$;
