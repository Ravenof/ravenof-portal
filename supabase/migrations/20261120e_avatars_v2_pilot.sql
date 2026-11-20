-- ════════════════════════════════════════════════════════════════════════════
-- AVATARŲ OVERHAUL, pirmi trys (v817): Nekronautas (perdarytas), Korvas (nemokamas),
-- Žarijų kalvis (500 rubinų). Po 7 veidus: neutralus + 6 emocijos (nauji: wounded, smug).
-- Failai: public/avatars/v2/<vardas>/face-*.webp. portrait_fit: x/y = priartinimo centras (proc.), zoom proc.
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

-- Nekronautas: naujas vaizdas; seni idle video nebetinka naujam portretui → išvalomi.
update public.cosmetics
   set image_url = '/avatars/v2/nekronautas/face-neutral.webp',
       emotions = '{"angry": "/avatars/v2/nekronautas/face-angry.webp", "happy": "/avatars/v2/nekronautas/face-happy.webp", "sad": "/avatars/v2/nekronautas/face-sad.webp", "shock": "/avatars/v2/nekronautas/face-shock.webp", "wounded": "/avatars/v2/nekronautas/face-wounded.webp", "smug": "/avatars/v2/nekronautas/face-smug.webp"}'::jsonb,
       portrait_fit = '{"x":50,"y":42,"zoom":155}'::jsonb,
       videos = '[]'::jsonb,
       description = 'Ramus kaulų valdovas. Numatytasis avataras.',
       updated_at = now()
 where id = 'av_nekronautas';

insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_korvas', 'avatar', 'Korvas', 'Varnų augintojas ir mokytojas. Visada tavo.', 0, null, '🐦', 2,
   true, '/avatars/v2/korvas/face-neutral.webp', 'common', 'active', true, '{"angry": "/avatars/v2/korvas/face-angry.webp", "happy": "/avatars/v2/korvas/face-happy.webp", "sad": "/avatars/v2/korvas/face-sad.webp", "shock": "/avatars/v2/korvas/face-shock.webp", "wounded": "/avatars/v2/korvas/face-wounded.webp", "smug": "/avatars/v2/korvas/face-smug.webp"}'::jsonb, '{"x":50,"y":46,"zoom":160}'::jsonb, '[]'::jsonb),
  ('av_zariju_kalvis', 'avatar', 'Žarijų kalvis', 'Demonų ordos kalvis: šiurkštus, tiesmukas ir karštas.', 500, null, '🔥', 10,
   true, '/avatars/v2/zariju-kalvis/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/zariju-kalvis/face-angry.webp", "happy": "/avatars/v2/zariju-kalvis/face-happy.webp", "sad": "/avatars/v2/zariju-kalvis/face-sad.webp", "shock": "/avatars/v2/zariju-kalvis/face-shock.webp", "wounded": "/avatars/v2/zariju-kalvis/face-wounded.webp", "smug": "/avatars/v2/zariju-kalvis/face-smug.webp"}'::jsonb, '{"x":50,"y":36,"zoom":140}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      owned_by_default = excluded.owned_by_default, emotions = excluded.emotions,
      portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_nekronautas','en','name','Necronaut'),
  ('cosmetic','av_nekronautas','en','description','A calm lord of bones. The default avatar.'),
  ('cosmetic','av_korvas','en','name','Korvas'),
  ('cosmetic','av_korvas','en','description','Raven-keeper and mentor. Always yours.'),
  ('cosmetic','av_zariju_kalvis','en','name','Ember Smith'),
  ('cosmetic','av_zariju_kalvis','en','description','Blacksmith of the Demon Horde: gruff, blunt and hot-tempered.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

-- Žarijų kalvis → parduotuvė, tik už rubinus.
do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_zariju_kalvis';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_zariju_kalvis', 'player_avatar', 'Žarijų kalvis', 'Demonų ordos kalvis: šiurkštus, tiesmukas ir karštas.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_zariju_kalvis','quantity',1)), 210)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Žarijų kalvis', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Sutarčių ragana (Demonų orda) — 500 rubinų ──────────────────────────────
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_sutarciu_ragana', 'avatar', 'Sutarčių ragana', 'Demonų ordos sandorių meistrė: kiekviena kova jai – sutartis.', 500, null, '📜', 11,
   true, '/avatars/v2/sutarciu-ragana/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/sutarciu-ragana/face-angry.webp", "happy": "/avatars/v2/sutarciu-ragana/face-happy.webp", "sad": "/avatars/v2/sutarciu-ragana/face-sad.webp", "shock": "/avatars/v2/sutarciu-ragana/face-shock.webp", "wounded": "/avatars/v2/sutarciu-ragana/face-wounded.webp", "smug": "/avatars/v2/sutarciu-ragana/face-smug.webp"}'::jsonb, '{"x":50,"y":42,"zoom":150}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_sutarciu_ragana','en','name','Pact Witch'),
  ('cosmetic','av_sutarciu_ragana','en','description','Deal-maker of the Demon Horde: every battle is a contract.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_sutarciu_ragana';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_sutarciu_ragana', 'player_avatar', 'Sutarčių ragana', 'Demonų ordos sandorių meistrė: kiekviena kova jai – sutartis.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_sutarciu_ragana','quantity',1)), 211)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Sutarčių ragana', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Vyriausiasis teisėjas — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_vyriausiasis_teisejas', 'avatar', 'Vyriausiasis teisėjas', 'Inkvizicijos legiono teisėjas: šaltas, griežtas ir neklystantis.', 500, null, '⚖', 12,
   true, '/avatars/v2/vyriausiasis-teisejas/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/vyriausiasis-teisejas/face-angry.webp", "happy": "/avatars/v2/vyriausiasis-teisejas/face-happy.webp", "sad": "/avatars/v2/vyriausiasis-teisejas/face-sad.webp", "shock": "/avatars/v2/vyriausiasis-teisejas/face-shock.webp", "wounded": "/avatars/v2/vyriausiasis-teisejas/face-wounded.webp", "smug": "/avatars/v2/vyriausiasis-teisejas/face-smug.webp"}'::jsonb, '{"x": 50, "y": 44, "zoom": 165}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_vyriausiasis_teisejas','en','name','High Judge'),
  ('cosmetic','av_vyriausiasis_teisejas','en','description','Judge of the Inquisition Legion: cold, strict and never wrong.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_vyriausiasis_teisejas';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_vyriausiasis_teisejas', 'player_avatar', 'Vyriausiasis teisėjas', 'Inkvizicijos legiono teisėjas: šaltas, griežtas ir neklystantis.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_vyriausiasis_teisejas','quantity',1)), 212)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Vyriausiasis teisėjas', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Geležinė sesuo — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_gelezine_sesuo', 'avatar', 'Geležinė sesuo', 'Inkvizicijos legiono karė: drausmė, plienas ir malda.', 500, null, '🛡', 13,
   true, '/avatars/v2/gelezine-sesuo/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/gelezine-sesuo/face-angry.webp", "happy": "/avatars/v2/gelezine-sesuo/face-happy.webp", "sad": "/avatars/v2/gelezine-sesuo/face-sad.webp", "shock": "/avatars/v2/gelezine-sesuo/face-shock.webp", "wounded": "/avatars/v2/gelezine-sesuo/face-wounded.webp", "smug": "/avatars/v2/gelezine-sesuo/face-smug.webp"}'::jsonb, '{"x": 50, "y": 40, "zoom": 145}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_gelezine_sesuo','en','name','Iron Sister'),
  ('cosmetic','av_gelezine_sesuo','en','description','Warrior of the Inquisition Legion: discipline, steel and prayer.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_gelezine_sesuo';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_gelezine_sesuo', 'player_avatar', 'Geležinė sesuo', 'Inkvizicijos legiono karė: drausmė, plienas ir malda.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_gelezine_sesuo','quantity',1)), 213)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Geležinė sesuo', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Kapų giedotoja — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_kapu_giedotoja', 'avatar', 'Kapų giedotoja', 'Mirties maršo gedėtoja: švelniai užmigdo ir priešus, ir savus.', 500, null, '🕯', 14,
   true, '/avatars/v2/kapu-giedotoja/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/kapu-giedotoja/face-angry.webp", "happy": "/avatars/v2/kapu-giedotoja/face-happy.webp", "sad": "/avatars/v2/kapu-giedotoja/face-sad.webp", "shock": "/avatars/v2/kapu-giedotoja/face-shock.webp", "wounded": "/avatars/v2/kapu-giedotoja/face-wounded.webp", "smug": "/avatars/v2/kapu-giedotoja/face-smug.webp"}'::jsonb, '{"x": 50, "y": 40, "zoom": 160}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_kapu_giedotoja','en','name','Grave Singer'),
  ('cosmetic','av_kapu_giedotoja','en','description','Mourner of the March of Death: she gently sings friend and foe to sleep.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_kapu_giedotoja';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_kapu_giedotoja', 'player_avatar', 'Kapų giedotoja', 'Mirties maršo gedėtoja: švelniai užmigdo ir priešus, ir savus.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_kapu_giedotoja','quantity',1)), 214)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Kapų giedotoja', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Maršo būgnininkas — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_marso_bugnininkas', 'avatar', 'Maršo būgnininkas', 'Mirties maršo būgnininkas: linksmiausias numirėlis rikiuotėje.', 500, null, '🥁', 15,
   true, '/avatars/v2/marso-bugnininkas/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/marso-bugnininkas/face-angry.webp", "happy": "/avatars/v2/marso-bugnininkas/face-happy.webp", "sad": "/avatars/v2/marso-bugnininkas/face-sad.webp", "shock": "/avatars/v2/marso-bugnininkas/face-shock.webp", "wounded": "/avatars/v2/marso-bugnininkas/face-wounded.webp", "smug": "/avatars/v2/marso-bugnininkas/face-smug.webp"}'::jsonb, '{"x": 50, "y": 46, "zoom": 165}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_marso_bugnininkas','en','name','March Drummer'),
  ('cosmetic','av_marso_bugnininkas','en','description','Drummer of the March of Death: the cheeriest corpse in the ranks.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_marso_bugnininkas';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_marso_bugnininkas', 'player_avatar', 'Maršo būgnininkas', 'Mirties maršo būgnininkas: linksmiausias numirėlis rikiuotėje.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_marso_bugnininkas','quantity',1)), 215)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Maršo būgnininkas', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Stygų magė — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_stygu_mage', 'avatar', 'Stygų magė', 'Mistikos melodijos virtuozė: išdidi, tiksli ir negailestinga falšui.', 500, null, '🎻', 16,
   true, '/avatars/v2/stygu-mage/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/stygu-mage/face-angry.webp", "happy": "/avatars/v2/stygu-mage/face-happy.webp", "sad": "/avatars/v2/stygu-mage/face-sad.webp", "shock": "/avatars/v2/stygu-mage/face-shock.webp", "wounded": "/avatars/v2/stygu-mage/face-wounded.webp", "smug": "/avatars/v2/stygu-mage/face-smug.webp"}'::jsonb, '{"x": 50, "y": 40, "zoom": 150}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_stygu_mage','en','name','String Mage'),
  ('cosmetic','av_stygu_mage','en','description','Virtuoso of the Melody of Mystics: proud, precise and merciless to a false note.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_stygu_mage';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_stygu_mage', 'player_avatar', 'Stygų magė', 'Mistikos melodijos virtuozė: išdidi, tiksli ir negailestinga falšui.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_stygu_mage','quantity',1)), 216)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Stygų magė', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Tylos mokinys — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_tylos_mokinys', 'avatar', 'Tylos mokinys', 'Mistikos melodijos vienuolis: vienas judesys, nė vieno žodžio.', 500, null, '🤫', 17,
   true, '/avatars/v2/tylos-mokinys/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/tylos-mokinys/face-angry.webp", "happy": "/avatars/v2/tylos-mokinys/face-happy.webp", "sad": "/avatars/v2/tylos-mokinys/face-sad.webp", "shock": "/avatars/v2/tylos-mokinys/face-shock.webp", "wounded": "/avatars/v2/tylos-mokinys/face-wounded.webp", "smug": "/avatars/v2/tylos-mokinys/face-smug.webp"}'::jsonb, '{"x": 50, "y": 38, "zoom": 150}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_tylos_mokinys','en','name','Disciple of Silence'),
  ('cosmetic','av_tylos_mokinys','en','description','Monk of the Melody of Mystics: one motion, not a single word.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_tylos_mokinys';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_tylos_mokinys', 'player_avatar', 'Tylos mokinys', 'Mistikos melodijos vienuolis: vienas judesys, nė vieno žodžio.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_tylos_mokinys','quantity',1)), 217)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Tylos mokinys', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;
