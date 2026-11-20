-- Avatarų overhaul: papildomi avatarai (po 7 veidus), tik už rubinus. Idempotentiška.

-- ── Kapitonė — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_kapitone', 'avatar', 'Kapitonė', 'Jūrų piratų kapitonė: įžūli, greita ir visada su pašaipa.', 500, null, '🏴‍☠️', 18,
   true, '/avatars/v2/kapitone/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/kapitone/face-angry.webp", "happy": "/avatars/v2/kapitone/face-happy.webp", "sad": "/avatars/v2/kapitone/face-sad.webp", "shock": "/avatars/v2/kapitone/face-shock.webp", "wounded": "/avatars/v2/kapitone/face-wounded.webp", "smug": "/avatars/v2/kapitone/face-smug.webp"}'::jsonb, '{"x": 50, "y": 48, "zoom": 150}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_kapitone','en','name','The Captain'),
  ('cosmetic','av_kapitone','en','description','Sea pirate captain: brash, quick and always mocking.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_kapitone';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_kapitone', 'player_avatar', 'Kapitonė', 'Jūrų piratų kapitonė: įžūli, greita ir visada su pašaipa.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_kapitone','quantity',1)), 218)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Kapitonė', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Šešėlių kišenvagis — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_seseliu_kisenvagis', 'avatar', 'Šešėlių kišenvagis', 'Gatvės vagis iš šešėlių: vikrus, įžūlus ir visada žingsniu priekyje.', 500, null, '🗝️', 19,
   true, '/avatars/v2/seseliu-kisenvagis/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/seseliu-kisenvagis/face-angry.webp", "happy": "/avatars/v2/seseliu-kisenvagis/face-happy.webp", "sad": "/avatars/v2/seseliu-kisenvagis/face-sad.webp", "shock": "/avatars/v2/seseliu-kisenvagis/face-shock.webp", "wounded": "/avatars/v2/seseliu-kisenvagis/face-wounded.webp", "smug": "/avatars/v2/seseliu-kisenvagis/face-smug.webp"}'::jsonb, '{"x": 50, "y": 44, "zoom": 175}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_seseliu_kisenvagis','en','name','Shadow Pickpocket'),
  ('cosmetic','av_seseliu_kisenvagis','en','description','Street thief from the shadows: nimble, cheeky and always one step ahead.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_seseliu_kisenvagis';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_seseliu_kisenvagis', 'player_avatar', 'Šešėlių kišenvagis', 'Gatvės vagis iš šešėlių: vikrus, įžūlus ir visada žingsniu priekyje.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_seseliu_kisenvagis','quantity',1)), 219)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Šešėlių kišenvagis', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Aušros riteris — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_ausros_riteris', 'avatar', 'Aušros riteris', 'Šventasis riteris: garbingas, tiesus ir nepalaužiamas.', 500, null, '🌅', 20,
   true, '/avatars/v2/ausros-riteris/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/ausros-riteris/face-angry.webp", "happy": "/avatars/v2/ausros-riteris/face-happy.webp", "sad": "/avatars/v2/ausros-riteris/face-sad.webp", "shock": "/avatars/v2/ausros-riteris/face-shock.webp", "wounded": "/avatars/v2/ausros-riteris/face-wounded.webp", "smug": "/avatars/v2/ausros-riteris/face-smug.webp"}'::jsonb, '{"x": 50, "y": 36, "zoom": 165}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_ausros_riteris','en','name','Dawn Knight'),
  ('cosmetic','av_ausros_riteris','en','description','Holy knight: honourable, upright and unbreakable.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_ausros_riteris';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_ausros_riteris', 'player_avatar', 'Aušros riteris', 'Šventasis riteris: garbingas, tiesus ir nepalaužiamas.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_ausros_riteris','quantity',1)), 220)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Aušros riteris', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Varpų gydytoja — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_varpu_gydytoja', 'avatar', 'Varpų gydytoja', 'Šventyklos gydytoja: rami, išmintinga ir kantri kaip varpo aidas.', 500, null, '🔔', 21,
   true, '/avatars/v2/varpu-gydytoja/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/varpu-gydytoja/face-angry.webp", "happy": "/avatars/v2/varpu-gydytoja/face-happy.webp", "sad": "/avatars/v2/varpu-gydytoja/face-sad.webp", "shock": "/avatars/v2/varpu-gydytoja/face-shock.webp", "wounded": "/avatars/v2/varpu-gydytoja/face-wounded.webp", "smug": "/avatars/v2/varpu-gydytoja/face-smug.webp"}'::jsonb, '{"x": 50, "y": 44, "zoom": 160}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_varpu_gydytoja','en','name','Bell Healer'),
  ('cosmetic','av_varpu_gydytoja','en','description','Temple healer: calm, wise and patient as the echo of a bell.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_varpu_gydytoja';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_varpu_gydytoja', 'player_avatar', 'Varpų gydytoja', 'Šventyklos gydytoja: rami, išmintinga ir kantri kaip varpo aidas.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_varpu_gydytoja','quantity',1)), 221)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Varpų gydytoja', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Gaujos vadas — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_gaujos_vadas', 'avatar', 'Gaujos vadas', 'Orkų gaujos vadas: garsus, tiesmukas ir nepakenčiantis silpnumo.', 500, null, '🪓', 22,
   true, '/avatars/v2/gaujos-vadas/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/gaujos-vadas/face-angry.webp", "happy": "/avatars/v2/gaujos-vadas/face-happy.webp", "sad": "/avatars/v2/gaujos-vadas/face-sad.webp", "shock": "/avatars/v2/gaujos-vadas/face-shock.webp", "wounded": "/avatars/v2/gaujos-vadas/face-wounded.webp", "smug": "/avatars/v2/gaujos-vadas/face-smug.webp"}'::jsonb, '{"x": 50, "y": 44, "zoom": 150}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_gaujos_vadas','en','name','Pack Boss'),
  ('cosmetic','av_gaujos_vadas','en','description','Orc warband boss: loud, blunt and intolerant of weakness.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_gaujos_vadas';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_gaujos_vadas', 'player_avatar', 'Gaujos vadas', 'Orkų gaujos vadas: garsus, tiesmukas ir nepakenčiantis silpnumo.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_gaujos_vadas','quantity',1)), 222)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Gaujos vadas', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Pelkių žiniuonė — 500 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_pelkiu_ziniuone', 'avatar', 'Pelkių žiniuonė', 'Pelkių goblinų žiniuonė: gudri, kandi ir visada su varle ant peties.', 500, null, '🐸', 23,
   true, '/avatars/v2/pelkiu-ziniuone/face-neutral.webp', 'epic', 'active', false, '{"angry": "/avatars/v2/pelkiu-ziniuone/face-angry.webp", "happy": "/avatars/v2/pelkiu-ziniuone/face-happy.webp", "sad": "/avatars/v2/pelkiu-ziniuone/face-sad.webp", "shock": "/avatars/v2/pelkiu-ziniuone/face-shock.webp", "wounded": "/avatars/v2/pelkiu-ziniuone/face-wounded.webp", "smug": "/avatars/v2/pelkiu-ziniuone/face-smug.webp"}'::jsonb, '{"x": 50, "y": 48, "zoom": 150}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_pelkiu_ziniuone','en','name','Swamp Wisewoman'),
  ('cosmetic','av_pelkiu_ziniuone','en','description','Swamp goblin wisewoman: sly, sharp-tongued and never without the frog on her shoulder.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_pelkiu_ziniuone';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_pelkiu_ziniuone', 'player_avatar', 'Pelkių žiniuonė', 'Pelkių goblinų žiniuonė: gudri, kandi ir visada su varle ant peties.', 'epic',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_pelkiu_ziniuone','quantity',1)), 223)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Pelkių žiniuonė', rarity = 'epic', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 500)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Arenos čempionas — 900 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_arenos_cempionas', 'avatar', 'Arenos čempionas', 'Nenugalėtas arenos čempionas: išdidus, charizmatiškas ir pripratęs prie minios ovacijų.', 900, null, '🏆', 24,
   true, '/avatars/v2/arenos-cempionas/face-neutral.webp', 'legendary', 'active', false, '{"angry": "/avatars/v2/arenos-cempionas/face-angry.webp", "happy": "/avatars/v2/arenos-cempionas/face-happy.webp", "sad": "/avatars/v2/arenos-cempionas/face-sad.webp", "shock": "/avatars/v2/arenos-cempionas/face-shock.webp", "wounded": "/avatars/v2/arenos-cempionas/face-wounded.webp", "smug": "/avatars/v2/arenos-cempionas/face-smug.webp"}'::jsonb, '{"x": 50, "y": 32, "zoom": 175}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_arenos_cempionas','en','name','Arena Champion'),
  ('cosmetic','av_arenos_cempionas','en','description','Undefeated arena champion: proud, charismatic and used to the roar of the crowd.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_arenos_cempionas';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_arenos_cempionas', 'player_avatar', 'Arenos čempionas', 'Nenugalėtas arenos čempionas: išdidus, charizmatiškas ir pripratęs prie minios ovacijų.', 'legendary',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_arenos_cempionas','quantity',1)), 224)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Arenos čempionas', rarity = 'legendary', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 900)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;

-- ── Varnų pranašė — 900 rubinų ──
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default, emotions, portrait_fit, videos) values
  ('av_varnu_pranase', 'avatar', 'Varnų pranašė', 'Akla Varnagrado pranašė: mato tai, ko kiti nemato, ir kalba tik tada, kai jau per vėlu.', 900, null, '🐦‍⬛', 25,
   true, '/avatars/v2/varnu-pranase/face-neutral.webp', 'legendary', 'active', false, '{"angry": "/avatars/v2/varnu-pranase/face-angry.webp", "happy": "/avatars/v2/varnu-pranase/face-happy.webp", "sad": "/avatars/v2/varnu-pranase/face-sad.webp", "shock": "/avatars/v2/varnu-pranase/face-shock.webp", "wounded": "/avatars/v2/varnu-pranase/face-wounded.webp", "smug": "/avatars/v2/varnu-pranase/face-smug.webp"}'::jsonb, '{"x": 50, "y": 34, "zoom": 165}'::jsonb, '[]'::jsonb)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      image_url = excluded.image_url, rarity = excluded.rarity, status = 'active', is_active = true,
      emotions = excluded.emotions, portrait_fit = excluded.portrait_fit, sort_order = excluded.sort_order, updated_at = now();

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','av_varnu_pranase','en','name','Raven Prophetess'),
  ('cosmetic','av_varnu_pranase','en','description','Blind prophetess of Ravenof: sees what others cannot and speaks only when it is already too late.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

do $$
declare v_id bigint;
begin
  select id into v_id from public.shop_items where slug = 'av_varnu_pranase';
  if v_id is null then
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values ('av_varnu_pranase', 'player_avatar', 'Varnų pranašė', 'Akla Varnagrado pranašė: mato tai, ko kiti nemato, ir kalba tik tada, kai jau per vėlu.', 'legendary',
        jsonb_build_array(jsonb_build_object('type','item','item_type','player_avatar','item_id','av_varnu_pranase','quantity',1)), 225)
      returning id into v_id;
  else
    update public.shop_items set is_active = true, name = 'Varnų pranašė', rarity = 'legendary', updated_at = now() where id = v_id;
  end if;
  insert into public.shop_item_prices(shop_item_id, currency_type, amount)
    values (v_id, 'rubies', 900)
    on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
end $$;
