-- ════════════════════════════════════════════════════════════════════════════
-- SENI AVATARAI IŠIMAMI (v823). Lieka tik 18 naujų „pack" avatarų (veidai, efektai, balsai).
--  • Seni: kind = 'avatar_retired', is_active = false (nebematomi niekam; nuosavybės eilutės
--    lieka, grąžinama vienu update kind = 'avatar').
--  • Kas buvo užsidėjęs seną – gauna Korvą (nemokamas, visų turimas).
--  • Kaladėms priskirti seni avatarai nuimami; senų avatarų prekės parduotuvėje išjungiamos.
-- Idempotentiška.
-- ════════════════════════════════════════════════════════════════════════════

update public.cosmetics set kind = 'avatar_retired', is_active = false
 where kind = 'avatar' and id not in ('av_nekronautas', 'av_korvas', 'av_zariju_kalvis', 'av_sutarciu_ragana', 'av_vyriausiasis_teisejas', 'av_gelezine_sesuo', 'av_kapu_giedotoja', 'av_marso_bugnininkas', 'av_stygu_mage', 'av_tylos_mokinys', 'av_kapitone', 'av_seseliu_kisenvagis', 'av_ausros_riteris', 'av_varpu_gydytoja', 'av_gaujos_vadas', 'av_pelkiu_ziniuone', 'av_arenos_cempionas', 'av_varnu_pranase');

update public.profiles p set equipped_avatar = 'av_korvas'
 where p.equipped_avatar is not null
   and not exists (select 1 from public.cosmetics c where c.id = p.equipped_avatar and c.kind = 'avatar');

update public.decks d set bound_avatar = null
 where d.bound_avatar is not null
   and not exists (select 1 from public.cosmetics c where c.id = d.bound_avatar and c.kind = 'avatar');

update public.shop_items set is_active = false
 where item_type = 'player_avatar' and is_active
   and (slug is null or slug not in ('av_nekronautas', 'av_korvas', 'av_zariju_kalvis', 'av_sutarciu_ragana', 'av_vyriausiasis_teisejas', 'av_gelezine_sesuo', 'av_kapu_giedotoja', 'av_marso_bugnininkas', 'av_stygu_mage', 'av_tylos_mokinys', 'av_kapitone', 'av_seseliu_kisenvagis', 'av_ausros_riteris', 'av_varpu_gydytoja', 'av_gaujos_vadas', 'av_pelkiu_ziniuone', 'av_arenos_cempionas', 'av_varnu_pranase'))
   and not (payload::text like any (array['%"av_nekronautas"%', '%"av_korvas"%', '%"av_zariju_kalvis"%', '%"av_sutarciu_ragana"%', '%"av_vyriausiasis_teisejas"%', '%"av_gelezine_sesuo"%', '%"av_kapu_giedotoja"%', '%"av_marso_bugnininkas"%', '%"av_stygu_mage"%', '%"av_tylos_mokinys"%', '%"av_kapitone"%', '%"av_seseliu_kisenvagis"%', '%"av_ausros_riteris"%', '%"av_varpu_gydytoja"%', '%"av_gaujos_vadas"%', '%"av_pelkiu_ziniuone"%', '%"av_arenos_cempionas"%', '%"av_varnu_pranase"%']));
