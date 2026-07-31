-- ════════════════════════════════════════════════════════════════════════════
-- KOSMETIKOS SISTEMOS ATSTATYMAS (audit: „selection system disappeared").
--
-- PRIEŽASTIS: (1) rvn_get_cosmetics buvo perrašytas 20260852 migracijoje ir
-- PRARADO rarity/ownedByDefault/videos/portraitFit laukus, status='active'
-- filtrą, owned_by_default įtraukimą į `owned` ir is_shop_exclusive užuolaidą;
-- (2) CosmeticsModal liko be jokio entry point po hub redizaino, o naujo
-- profilio „Redaguoti profilį" — stub'as; (3) nugarėlės katalogo neturėjo NĖ
-- VIENO paveikslėlio (tik CSS gradientai → „tušti violetiniai" shop tile'ai)
-- ir nebuvo numatytosios nugarėlės iš viso.
--
-- Šioje migracijoje (idempotentiška, senų duomenų NETRINA):
--   1) Katalogas: numatytoji „Ravenof nugarėlė" (cb_default, owned_by_default)
--      + 8 frakcijų nugarėlės; image_url priskiriami TIK ten, kur jų nebuvo
--      (admino įkelto arto niekada neperrašom).
--   2) rvn_get_cosmetics — PILNAI atstatytas + `active` (validuoti pasirinkimai
--      su fallback į default) + `defaults`.
--   3) rvn_set_active_avatar / rvn_set_active_card_back — kanoniniai RPC
--      (validacija serveryje; užrakintų pasirinkti negalima).
--   4) Vienkartinis remontas: equipped_* rodyklės į nebeegzistuojančią
--      kosmetiką nunulinamos (fallback į default); user_inventory likučiai
--      permigruojami į user_cosmetics (on conflict do nothing).
--   5) Naujos frakcijų nugarėlės sinchronizuojamos į shop_items (20260824 šablonas).
--   6) EN vertimai (content_translations, on conflict do nothing).
--   7) rvn_media_manifest papildytas statiniais /card-backs failais.
-- Kampanija ir Aukcionas NELIEČIAMI. user_cosmetics niekur netrinamas.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) KATALOGAS ─────────────────────────────────────────────────────────────

-- 1a. Numatytoji Ravenof nugarėlė — nemokama, visų sąskaitų bazinė.
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default)
values ('cb_default', 'card_back', 'Ravenof nugarėlė',
        'Standartinė Ravenof kortų nugarėlė su varno antspaudu — visada tavo.',
        0, 'linear-gradient(160deg,#17111c,#0a0708)', null, -10,
        true, '/card-backs/ravenof-default.webp', 'common', 'active', true)
on conflict (id) do update
  set owned_by_default = true, is_active = true, status = 'active',
      image_url = coalesce(public.cosmetics.image_url, excluded.image_url);

-- 1b. Frakcijų nugarėlių rinkinys (vienos Ravenof Gothic sistemos dalis).
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default)
values
  ('cb_mirties_marsas',        'card_back', 'Mirties maršo nugarėlė',        'Kaulo ir kapo pilkumos ženklas ištikimiems Mirties maršui.',            800, 'linear-gradient(160deg,#1a1d1a,#0a0b0a)', null, 21, true, '/card-backs/cb-mirties-marsas.webp',        'rare', 'active', false),
  ('cb_plesiku_naktis',        'card_back', 'Plėšikų nakties nugarėlė',      'Anglies ir aptrinto plieno ženklas nakties šešėliams.',                 800, 'linear-gradient(160deg,#191419,#0a080a)', null, 22, true, '/card-backs/cb-plesiku-naktis.webp',        'rare', 'active', false),
  ('cb_vryhioko_gauja',        'card_back', 'Vryhioko gaujos nugarėlė',      'Purvino žalvario ir pelkės ženklas Vryhioko gaujai.',                   800, 'linear-gradient(160deg,#171a14,#090a07)', null, 23, true, '/card-backs/cb-vryhioko-gauja.webp',        'rare', 'active', false),
  ('cb_demonu_orda',           'card_back', 'Demonų ordos nugarėlė',         'Apdegusio juodžio ir žarijų ženklas Demonų ordai.',                     800, 'linear-gradient(160deg,#1c1210,#0a0605)', null, 24, true, '/card-backs/cb-demonu-orda.webp',           'rare', 'active', false),
  ('cb_inkvizicijos_legionas', 'card_back', 'Inkvizicijos legiono nugarėlė', 'Seno dramblio kaulo ir vaško antspaudo ženklas Legionui.',              800, 'linear-gradient(160deg,#1c1914,#0b0906)', null, 25, true, '/card-backs/cb-inkvizicijos-legionas.webp', 'rare', 'active', false),
  ('cb_sviesos_pulkas',        'card_back', 'Šviesos pulko nugarėlė',        'Šilto dramblio kaulo ir dėvėto aukso ženklas Šviesos pulkui.',          800, 'linear-gradient(160deg,#1c1a14,#0b0a06)', null, 26, true, '/card-backs/cb-sviesos-pulkas.webp',        'rare', 'active', false),
  ('cb_mistikos_melodija',     'card_back', 'Mistikos melodijos nugarėlė',   'Gilaus violeto ir mėnesienos ženklas Mistikos melodijai.',              800, 'linear-gradient(160deg,#181425,#0a0812)', null, 27, true, '/card-backs/cb-mistikos-melodija.webp',     'rare', 'active', false),
  ('cb_rytu_vejas',            'card_back', 'Rytų vėjo nugarėlė',            'Nefrito ir oksiduotos bronzos ženklas Rytų vėjui.',                     800, 'linear-gradient(160deg,#121a18,#070b0a)', null, 28, true, '/card-backs/cb-rytu-vejas.webp',            'rare', 'active', false)
on conflict (id) do nothing;

-- 1c. Esamiems katalogo įrašams priskiriami naujo vieningo paketo assetai —
-- TIK jei image_url tuščias (admino įkelto arto neperrašom). Kodai ir
-- nuosavybė išlieka; keičiasi tik vizualas.
update public.cosmetics set image_url = v.path from (values
  ('cb_ember',              '/card-backs/cb-ember.webp'),
  ('cb_frost',              '/card-backs/cb-frost.webp'),
  ('cb_void',               '/card-backs/cb-void.webp'),
  ('cb_gold',               '/card-backs/cb-gold.webp'),
  ('basic_card_back',       '/card-backs/cb-basic.webp'),
  ('rare_card_back',        '/card-backs/cb-rare.webp'),
  ('premium_card_back',     '/card-backs/cb-premium.webp'),
  ('legendary_card_back',   '/card-backs/cb-legendary.webp'),
  ('prestige_card_back',    '/card-backs/cb-prestige.webp'),
  ('cb_ruby_inferno',       '/card-backs/cb-rubino-infernas.webp'),
  ('cb_crimson_crown',      '/card-backs/cb-karmazino-karuna.webp'),
  ('av_ruby_raven',         '/card-backs/av-rubino-varnas.webp'),
  ('av_raven',              '/card-backs/av-varnas.webp'),
  ('av_dragon',             '/card-backs/av-drakonas.webp'),
  ('av_skull',              '/card-backs/av-kaukole.webp'),
  ('av_crown',              '/card-backs/av-karuna.webp'),
  ('av_inkvizitorius',      '/card-backs/av-inkvizitorius.webp'),
  ('basic_player_avatar',   '/card-backs/av-basic.webp'),
  ('rare_player_avatar',    '/card-backs/av-rare.webp'),
  ('premium_player_avatar', '/card-backs/av-premium.webp'),
  ('legendary_player_avatar','/card-backs/av-legendary.webp')
) as v(id, path)
where public.cosmetics.id = v.id and public.cosmetics.image_url is null;

-- ── 2) rvn_get_cosmetics — PILNAS atstatymas (20260852 regresijos taisymas) ──
create or replace function public.rvn_get_cosmetics()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_list jsonb; v_owned jsonb; v_cb text; v_bd text; v_av text;
  v_active_av text; v_active_cb text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- katalogas: aktyvūs IR (paslėpti/išjungti, bet turimi) IR ne-shop-exclusive
  select jsonb_agg(jsonb_build_object(
           'id', c.id, 'kind', c.kind, 'name', c.name, 'description', c.description,
           'priceGold', c.price_gold, 'css', c.css, 'emoji', c.emoji, 'imageUrl', c.image_url,
           'rarity', c.rarity, 'ownedByDefault', c.owned_by_default,
           'videos', coalesce(c.videos, '[]'::jsonb), 'portraitFit', c.portrait_fit
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

  -- nuosavybė: user_cosmetics ∪ owned_by_default (numatytieji priklauso visiems)
  select coalesce(jsonb_agg(x.id), '[]'::jsonb) into v_owned from (
    select cosmetic_id as id from public.user_cosmetics where user_id = v_uid
    union
    select id from public.cosmetics where owned_by_default
  ) x;

  select equipped_card_back, equipped_board, equipped_avatar
    into v_cb, v_bd, v_av from public.profiles where id = v_uid;

  -- VALIDUOTI aktyvūs pasirinkimai su fallback į numatytuosius:
  -- neegzistuojantis / išjungtas / nebeturimas id → default.
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
end $$;
grant execute on function public.rvn_get_cosmetics() to authenticated;

-- ── 3) Kanoniniai set-active RPC (serverinė validacija; grąžina naują būseną) ─
create or replace function public.rvn__set_active_cosmetic(p_kind text, p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('avatar','card_back','board') then raise exception 'bad kind'; end if;
  if p_id is not null and not exists (
    select 1 from public.cosmetics c
     where c.id = p_id and c.kind = p_kind
       and (c.owned_by_default
            or exists (select 1 from public.user_cosmetics u where u.user_id = v_uid and u.cosmetic_id = p_id))
  ) then
    -- užrakinta / neegzistuoja / ne tas tipas — atmetama serveryje
    raise exception 'cosmetic_locked';
  end if;
  if    p_kind = 'card_back' then update public.profiles set equipped_card_back = p_id where id = v_uid;
  elsif p_kind = 'board'     then update public.profiles set equipped_board     = p_id where id = v_uid;
  else                            update public.profiles set equipped_avatar    = p_id where id = v_uid;
  end if;
  -- grąžinam pilną validuotą aktyvių rinkinį — frontend'ui nereikia pilno reload
  return (public.rvn_get_cosmetics() -> 'active') || jsonb_build_object('ok', true);
end $$;

create or replace function public.rvn_set_active_avatar(p_id text)
returns jsonb language sql security definer set search_path = public as $$
  select public.rvn__set_active_cosmetic('avatar', p_id)
$$;
create or replace function public.rvn_set_active_card_back(p_id text)
returns jsonb language sql security definer set search_path = public as $$
  select public.rvn__set_active_cosmetic('card_back', p_id)
$$;
grant execute on function public.rvn__set_active_cosmetic(text, text) to authenticated;
grant execute on function public.rvn_set_active_avatar(text) to authenticated;
grant execute on function public.rvn_set_active_card_back(text) to authenticated;

-- senasis rvn_equip_cosmetic lieka (onboarding/DeckSelect), bet per tą pačią validaciją
create or replace function public.rvn_equip_cosmetic(p_kind text, p_id text)
returns jsonb language sql security definer set search_path = public as $$
  select public.rvn__set_active_cosmetic(p_kind, p_id)
$$;
grant execute on function public.rvn_equip_cosmetic(text, text) to authenticated;

-- ── 4) Vienkartinis duomenų remontas ─────────────────────────────────────────
-- 4a. Rodyklės į nebeegzistuojančią kosmetiką → NULL (skaitymas kris į default)
update public.profiles p set equipped_avatar = null
 where p.equipped_avatar is not null
   and not exists (select 1 from public.cosmetics c where c.id = p.equipped_avatar and c.kind = 'avatar');
update public.profiles p set equipped_card_back = null
 where p.equipped_card_back is not null
   and not exists (select 1 from public.cosmetics c where c.id = p.equipped_card_back and c.kind = 'card_back');

-- 4b. user_inventory likučiai (item_id, kuris DABAR yra kataloge) → user_cosmetics.
-- Ankstesnė 20260823 permigracija paėmė tik tuometinius; kartojam idempotentiškai.
insert into public.user_cosmetics (user_id, cosmetic_id, acquired_at)
select ui.user_id, ui.item_id, coalesce(ui.acquired_at, now())
  from public.user_inventory ui
  join public.cosmetics c on c.id = ui.item_id
 where ui.item_type in ('card_back','board','player_avatar','avatar','cosmetic')
on conflict (user_id, cosmetic_id) do nothing;

-- ── 5) Naujos frakcijų nugarėlės → shop_items (20260824 šablonas) ────────────
do $$
declare c record; v_id bigint;
begin
  for c in
    select * from public.cosmetics
     where id like 'cb\_%' escape '\' and kind = 'card_back'
       and is_active and coalesce(status,'active') = 'active'
       and not owned_by_default
       and coalesce(price_gold, 0) > 0
       and not coalesce(is_shop_exclusive, false)
  loop
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values (c.id, 'card_back', c.name, c.description, c.rarity,
        jsonb_build_array(jsonb_build_object('type','item','item_type','card_back','item_id', c.id, 'quantity', 1)),
        200 + coalesce(c.sort_order, 0))
      on conflict (slug) do nothing
      returning id into v_id;
    if v_id is not null then
      insert into public.shop_item_prices(shop_item_id, currency_type, amount)
        values (v_id, 'silver', c.price_gold) on conflict do nothing;
    end if;
  end loop;
end $$;

-- ── 6) EN vertimai (LT lieka šaltiniu lentelėje; admin redagavimai nepaliesti) ─
insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','cb_default','en','name','Ravenof card back'),
  ('cosmetic','cb_default','en','description','The standard Ravenof card back with the raven seal — always yours.'),
  ('cosmetic','cb_mirties_marsas','en','name','Death March card back'),
  ('cosmetic','cb_plesiku_naktis','en','name','Bandits'' Night card back'),
  ('cosmetic','cb_vryhioko_gauja','en','name','Vryhiok Gang card back'),
  ('cosmetic','cb_demonu_orda','en','name','Demon Horde card back'),
  ('cosmetic','cb_inkvizicijos_legionas','en','name','Inquisition Legion card back'),
  ('cosmetic','cb_sviesos_pulkas','en','name','Light Regiment card back'),
  ('cosmetic','cb_mistikos_melodija','en','name','Mystic Melody card back'),
  ('cosmetic','cb_rytu_vejas','en','name','Eastern Wind card back'),
  ('cosmetic','cb_ruby_inferno','en','name','Ruby Inferno card back'),
  ('cosmetic','cb_crimson_crown','en','name','Crimson Crown card back'),
  ('cosmetic','av_ruby_raven','en','name','Ruby Raven'),
  ('cosmetic','cb_ember','en','name','Ember card back'),
  ('cosmetic','cb_frost','en','name','Frost card back'),
  ('cosmetic','cb_void','en','name','Void card back'),
  ('cosmetic','cb_gold','en','name','Golden card back'),
  ('cosmetic','basic_card_back','en','name','Basic card back'),
  ('cosmetic','rare_card_back','en','name','Rare card back'),
  ('cosmetic','premium_card_back','en','name','Premium card back'),
  ('cosmetic','legendary_card_back','en','name','Legendary card back'),
  ('cosmetic','prestige_card_back','en','name','Prestige card back'),
  ('cosmetic','av_nekronautas','en','name','Necronaut'),
  ('cosmetic','av_inkvizitorius','en','name','Inquisitor'),
  ('cosmetic','av_raven','en','name','Raven'),
  ('cosmetic','av_dragon','en','name','Dragon'),
  ('cosmetic','av_skull','en','name','Skull'),
  ('cosmetic','av_crown','en','name','Crown')
on conflict (owner_type, owner_id, locale, field) do nothing;

-- ── 7) Offline/PWA manifestas: statiniai /card-backs baziniai failai ─────────
create or replace function public.rvn_media_manifest()
returns table(url text, kind text, tier int, bytes bigint)
language sql security definer set search_path = public, storage as $$
  with urls as (
    select c.image_url as url, 'card-art' as kind, 2 as tier
      from public.cards c where c.status = 'active' and c.image_url is not null
    union all
    select jsonb_array_elements_text(c.gameplay->'voiceLines'), 'voice', 2
      from public.cards c where c.status = 'active' and jsonb_typeof(c.gameplay->'voiceLines') = 'array'
    union all
    select c.gameplay->'summonCinematic'->>'webm', 'cinematic', 3 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'webm' is not null
    union all
    select c.gameplay->'summonCinematic'->>'mp4', 'cinematic', 3 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'mp4' is not null
    union all
    select c.gameplay->'summonCinematic'->>'poster', 'cinematic-poster', 2 from public.cards c
      where c.status='active' and c.gameplay->'summonCinematic'->>'poster' is not null
    union all
    select s.value->'cinematic'->>'webm', 'cinematic', 3
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'webm' is not null
    union all
    select s.value->'cinematic'->>'mp4', 'cinematic', 3
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'mp4' is not null
    union all
    select s.value->'cinematic'->>'poster', 'cinematic-poster', 2
      from public.cards c, jsonb_array_elements(c.gameplay->'championSkillConfig'->'skills') s
      where c.status='active' and s.value->'cinematic'->>'poster' is not null
    union all
    select co.image_url, 'cosmetic', 1 from public.cosmetics co where co.image_url is not null
    union all
    select jsonb_array_elements_text(co.videos), 'avatar-video', 3
      from public.cosmetics co where jsonb_typeof(co.videos) = 'array'
    union all
    select aa.file_url, 'avatar-voice', 2 from public.avatar_audio aa where aa.enabled
    union all
    select p.image_url, 'pack', 1 from public.card_packs p where p.image_url is not null
    union all
    select f.icon_url, 'ui', 1 from public.factions f where f.icon_url is not null
    union all
    -- statinės kovos nugarėlės (hardcoded TutorialGame CARD_BACK_SRC + default)
    select v.url, 'card-back-static', 1 from (values
      ('/card-backs/back.webp?v=2'), ('/card-backs/curse.webp'), ('/card-backs/zmk.webp'),
      ('/card-backs/ravenof-default.webp')
    ) as v(url)
  ),
  storage_urls as (
    select distinct on (u.url) u.url, u.kind, u.tier,
      split_part(split_part(u.url, '/storage/v1/object/public/', 2), '/', 1) as bucket,
      substr(
        split_part(u.url, '/storage/v1/object/public/', 2),
        length(split_part(split_part(u.url, '/storage/v1/object/public/', 2), '/', 1)) + 2
      ) as path
    from urls u
    where u.url like '%/storage/v1/object/public/%'
    order by u.url, u.tier
  ),
  relative_urls as (
    select distinct on (u.url) u.url, u.kind, u.tier
    from urls u
    where u.url like '/%' and u.url not like '//%'
    order by u.url, u.tier
  )
  select s.url, s.kind, s.tier, coalesce((o.metadata->>'size')::bigint, 0) as bytes
  from storage_urls s
  left join storage.objects o on o.bucket_id = s.bucket and o.name = s.path
  union all
  select r.url, r.kind, r.tier, 0::bigint from relative_urls r;
$$;
grant execute on function public.rvn_media_manifest() to authenticated;
