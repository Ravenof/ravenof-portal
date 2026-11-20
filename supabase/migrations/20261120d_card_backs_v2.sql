-- ════════════════════════════════════════════════════════════════════════════
-- NAUJAS KORTŲ NUGARĖLIŲ RINKINYS (numatytoji + 8) — v816; senos nugarėlės išimamos.
-- Failai: public/card-backs/v2/. Kainos tik rubinais.
--  • 5 lygių atlygių ID (basic/rare/premium/legendary/prestige_card_back) PALIEKAMI ir
--    gauna naują vaizdą bei pavadinimą – lygių atlygiai ir jų savininkai nenukenčia.
--  • Visos kitos senos nugarėlės: kind = 'card_back_retired' (nebematomos niekam,
--    nuosavybės eilutės lieka; grąžinama vienu update kind = 'card_back').
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

update public.cosmetics
   set image_url = '/card-backs/v2/cb-default.webp', is_active = true, status = 'active', owned_by_default = true
 where id = 'cb_default';

insert into public.cosmetics (id, kind, name, description, price_gold, css, emoji, sort_order,
                              is_active, image_url, rarity, status, owned_by_default) values
  ('basic_card_back', 'card_back', 'Varnagrado geležies nugarėlė', 'Juodinto plieno apvadas su plunksnų segmentais ir gintaro akmenimis.', 100, null, null, 1, true, '/card-backs/v2/cb-varnagrado-gelezis.webp', 'rare', 'active', false),
  ('rare_card_back', 'card_back', 'Šalčio karūnos nugarėlė', 'Melsvas plienas ir ledo kristalai kampuose.', 220, null, null, 2, true, '/card-backs/v2/cb-salcio-karuna.webp', 'epic', 'active', false),
  ('premium_card_back', 'card_back', 'Žarijų kalvės nugarėlė', 'Degintos geležies plokštės su žarijų siūlėmis.', 220, null, null, 3, true, '/card-backs/v2/cb-zariju-kalve.webp', 'epic', 'active', false),
  ('cb_audros_smaigalys', 'card_back', 'Audros smaigalio nugarėlė', 'Sidabriniai smaigaliai ir geltoni žaibo plyšiai.', 220, null, null, 4, true, '/card-backs/v2/cb-audros-smaigalys.webp', 'epic', 'active', false),
  ('cb_nuodu_erskeciai', 'card_back', 'Nuodų erškėčių nugarėlė', 'Bronzinis apvadas, apraizgytas erškėčių su nuodingais akmenimis.', 220, null, null, 5, true, '/card-backs/v2/cb-nuodu-erskeciai.webp', 'epic', 'active', false),
  ('legendary_card_back', 'card_back', 'Tuštumos ragų nugarėlė', 'Obsidiano ašmenys ir violetiniai tuštumos plyšiai.', 360, null, null, 6, true, '/card-backs/v2/cb-tustumos-ragai.webp', 'legendary', 'active', false),
  ('cb_arkanos_antspaudas', 'card_back', 'Arkanos antspaudo nugarėlė', 'Sidabro ir mėlyno emalio apvadas su arkanos kristalais.', 360, null, null, 7, true, '/card-backs/v2/cb-arkanos-antspaudas.webp', 'legendary', 'active', false),
  ('prestige_card_back', 'card_back', 'Paauksuotos priesaikos nugarėlė', 'Sendinto aukso apvadas su sparnų plokštėmis.', 360, null, null, 8, true, '/card-backs/v2/cb-paauksuota-priesaika.webp', 'legendary', 'active', false)
on conflict (id) do update
  set kind = 'card_back', name = excluded.name, description = excluded.description, price_gold = excluded.price_gold,
      css = null, sort_order = excluded.sort_order, is_active = true, image_url = excluded.image_url,
      rarity = excluded.rarity, status = 'active', owned_by_default = false;

-- Senos nugarėlės → išimtos
update public.cosmetics set kind = 'card_back_retired', is_active = false
 where kind = 'card_back' and id not in ('cb_default', 'basic_card_back', 'rare_card_back', 'premium_card_back', 'cb_audros_smaigalys', 'cb_nuodu_erskeciai', 'legendary_card_back', 'cb_arkanos_antspaudas', 'prestige_card_back');

update public.profiles p set equipped_card_back = null
 where p.equipped_card_back is not null
   and not exists (select 1 from public.cosmetics c where c.id = p.equipped_card_back and c.kind = 'card_back');

-- EN vertimai (perrašomi – seni pavadinimai nebetinka)
insert into public.content_translations (owner_type, owner_id, locale, field, value) values
  ('cosmetic','basic_card_back','en','name','Varnagrad Iron card back'),
  ('cosmetic','basic_card_back','en','description','A blackened steel border with feathered plates and amber stones.'),
  ('cosmetic','rare_card_back','en','name','Frost Crown card back'),
  ('cosmetic','rare_card_back','en','description','Blue steel with ice crystals in the corners.'),
  ('cosmetic','premium_card_back','en','name','Ember Forge card back'),
  ('cosmetic','premium_card_back','en','description','Scorched iron plates with glowing ember seams.'),
  ('cosmetic','cb_audros_smaigalys','en','name','Storm Spire card back'),
  ('cosmetic','cb_audros_smaigalys','en','description','Silver spikes and yellow lightning cracks.'),
  ('cosmetic','cb_nuodu_erskeciai','en','name','Venom Thorns card back'),
  ('cosmetic','cb_nuodu_erskeciai','en','description','A bronze border tangled in thorns with venomous gems.'),
  ('cosmetic','legendary_card_back','en','name','Void Horns card back'),
  ('cosmetic','legendary_card_back','en','description','Obsidian blades and violet void rifts.'),
  ('cosmetic','cb_arkanos_antspaudas','en','name','Arcane Seal card back'),
  ('cosmetic','cb_arkanos_antspaudas','en','description','A silver and blue enamel border with arcane crystals.'),
  ('cosmetic','prestige_card_back','en','name','Gilded Oath card back'),
  ('cosmetic','prestige_card_back','en','description','An aged gold border with winged plates.')
on conflict (owner_type, owner_id, locale, field) do update set value = excluded.value;

-- Parduotuvė: senų nugarėlių prekės paslepiamos; 8 naujos – tik už rubinus.
update public.shop_items set is_active = false, updated_at = now()
 where item_type = 'card_back' and slug not in ('basic_card_back', 'rare_card_back', 'premium_card_back', 'cb_audros_smaigalys', 'cb_nuodu_erskeciai', 'legendary_card_back', 'cb_arkanos_antspaudas', 'prestige_card_back');

do $$
declare c record; v_id bigint;
begin
  for c in select * from public.cosmetics where id in ('basic_card_back', 'rare_card_back', 'premium_card_back', 'cb_audros_smaigalys', 'cb_nuodu_erskeciai', 'legendary_card_back', 'cb_arkanos_antspaudas', 'prestige_card_back')
  loop
    select id into v_id from public.shop_items where slug = c.id;
    if v_id is null then
      insert into public.shop_items(slug, item_type, name, description, rarity, payload, sort_order)
        values (c.id, 'card_back', c.name, c.description, c.rarity,
          jsonb_build_array(jsonb_build_object('type','item','item_type','card_back','item_id', c.id, 'quantity', 1)),
          200 + coalesce(c.sort_order, 0))
        returning id into v_id;
    else
      update public.shop_items
         set item_type = 'card_back', name = c.name, description = c.description, rarity = c.rarity,
             is_active = true, sort_order = 200 + coalesce(c.sort_order, 0), updated_at = now()
       where id = v_id;
    end if;
    update public.shop_item_prices set is_active = false
     where shop_item_id = v_id and currency_type <> 'rubies' and is_active;
    insert into public.shop_item_prices(shop_item_id, currency_type, amount)
      values (v_id, 'rubies', c.price_gold)
      on conflict (shop_item_id, currency_type) do update set amount = excluded.amount, is_active = true;
  end loop;
end $$;

-- Patikra po paleidimo: kiek žaidėjų turi išimtų nugarėlių (kompensacijos sprendimui)
select c.id, c.name, count(u.user_id) as owners
  from public.cosmetics c left join public.user_cosmetics u on u.cosmetic_id = c.id
 where c.kind = 'card_back_retired' group by c.id, c.name order by owners desc;
