-- Avataro rėmelių kolekcija (8 vnt.) — v813. Failai: public/ravenof-ui/combat/avatars/frames/.
-- Kainos TIK rubinais (cosmetics.price_gold kosmetikai = rubinų kaina), keičiamos /admin/shop. Idempotentiška.
insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default) values
  ('af_varnagrado_gelezis', 'avatar_frame', 'Varnagrado geležis', 'Juodinto plieno rėmelis su plunksnų segmentais ir gintaro akmeniu.', 100, null, null, 1, true, '/ravenof-ui/combat/avatars/frames/af-varnagrado-gelezis.webp', 'rare', 'active', false),
  ('af_salcio_karuna', 'avatar_frame', 'Šalčio karūna', 'Melsvo plieno rėmelis su ledo ašmenų karūna.', 220, null, null, 2, true, '/ravenof-ui/combat/avatars/frames/af-salcio-karuna.webp', 'epic', 'active', false),
  ('af_zariju_kalve', 'avatar_frame', 'Žarijų kalvė', 'Degintos geležies šarvo plokštės su žarijų siūlėmis.', 220, null, null, 3, true, '/ravenof-ui/combat/avatars/frames/af-zariju-kalve.webp', 'epic', 'active', false),
  ('af_audros_smaigalys', 'avatar_frame', 'Audros smaigalys', 'Grafitinis metalas su žaibo smaigaliu ir geltonais plyšiais.', 220, null, null, 4, true, '/ravenof-ui/combat/avatars/frames/af-audros-smaigalys.webp', 'epic', 'active', false),
  ('af_nuodu_erskeciai', 'avatar_frame', 'Nuodų erškėčiai', 'Bronzinis karkasas, apglėbtas erškėčių vijoklio su nuodingais akmenimis.', 220, null, null, 5, true, '/ravenof-ui/combat/avatars/frames/af-nuodu-erskeciai.webp', 'epic', 'active', false),
  ('af_tustumos_ragai', 'avatar_frame', 'Tuštumos ragai', 'Obsidiano rėmelis su atgal užlinkusiais ragais ir violetiniais plyšiais.', 360, null, null, 6, true, '/ravenof-ui/combat/avatars/frames/af-tustumos-ragai.webp', 'legendary', 'active', false),
  ('af_arkanos_antspaudas', 'avatar_frame', 'Arkanos antspaudas', 'Tamsaus sidabro rėmelis su trimis arkanos kristalais.', 360, null, null, 7, true, '/ravenof-ui/combat/avatars/frames/af-arkanos-antspaudas.webp', 'legendary', 'active', false),
  ('af_paauksuota_priesaika', 'avatar_frame', 'Paauksuota priesaika', 'Sendinto aukso rėmelis su karūna ir sparnais.', 360, null, null, 8, true, '/ravenof-ui/combat/avatars/frames/af-paauksuota-priesaika.webp', 'legendary', 'active', false)
on conflict (id) do nothing;

insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','af_varnagrado_gelezis','en','name','Varnagrad Iron'),
  ('cosmetic','af_varnagrado_gelezis','en','description','A blackened steel frame with feathered plates and an amber stone.'),
  ('cosmetic','af_salcio_karuna','en','name','Frost Crown'),
  ('cosmetic','af_salcio_karuna','en','description','A blue steel frame crowned with blades of ice.'),
  ('cosmetic','af_zariju_kalve','en','name','Ember Forge'),
  ('cosmetic','af_zariju_kalve','en','description','Scorched iron plates with glowing ember seams.'),
  ('cosmetic','af_audros_smaigalys','en','name','Storm Spire'),
  ('cosmetic','af_audros_smaigalys','en','description','Graphite metal with a lightning spire and yellow sparks.'),
  ('cosmetic','af_nuodu_erskeciai','en','name','Venom Thorns'),
  ('cosmetic','af_nuodu_erskeciai','en','description','A bronze frame wrapped in thorny vines with venomous gems.'),
  ('cosmetic','af_tustumos_ragai','en','name','Void Horns'),
  ('cosmetic','af_tustumos_ragai','en','description','An obsidian frame with swept-back horns and violet rifts.'),
  ('cosmetic','af_arkanos_antspaudas','en','name','Arcane Seal'),
  ('cosmetic','af_arkanos_antspaudas','en','description','A dark silver frame set with three arcane crystals.'),
  ('cosmetic','af_paauksuota_priesaika','en','name','Gilded Oath'),
  ('cosmetic','af_paauksuota_priesaika','en','description','An aged gold frame with a crown and wings.')
on conflict (owner_type, owner_id, locale, field) do nothing;

-- Parduotuvės prekės: skiltis 'avatar_frame', išdavimas per payload 'card_back' (kosmetika pagal ID).
do $$
declare c record; v_id bigint;
begin
  for c in select * from public.cosmetics
            where kind = 'avatar_frame' and is_active and not owned_by_default and coalesce(price_gold, 0) > 0
  loop
    v_id := null;
    insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
      values (c.id, 'avatar_frame', c.name, c.description, c.rarity,
        jsonb_build_array(jsonb_build_object('type','item','item_type','card_back','item_id', c.id, 'quantity', 1)),
        300 + coalesce(c.sort_order, 0))
      on conflict (slug) do nothing
      returning id into v_id;
    if v_id is not null then
      insert into public.shop_item_prices(shop_item_id, currency_type, amount)
        values (v_id, 'rubies', c.price_gold) on conflict do nothing;
    end if;
  end loop;
end $$;
