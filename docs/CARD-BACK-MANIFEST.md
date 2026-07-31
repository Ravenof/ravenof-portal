# Ravenof kortų nugarėlių (ir kosmetinių avatarų) asset manifestas

Kanoninis paketo aprašas. **Kodai ir vartotojų nuosavybė NEKINTA keičiant
assetus** — galutinis rankų darbo artas keičia tik failus žemiau nurodytais
keliais (1:1, tie patys pavadinimai).

Matmenys ir maskė:
- Master: PNG, 1044×1416 (kanoninis kortos santykis 1044/1416; kampus apvalina
  UI, todėl artas — full-bleed, be permatomumo; safe-area ≈ 6 % nuo krašto).
- Runtime: WebP 522×708, `public/card-backs/<file>.webp`.
- Miniatiūra: WebP 156×212, `public/card-backs/thumbs/<file>.webp`.
- Avatarai: master 640×640 PNG, runtime 320×320, thumb 96×96 (apvali maskė UI).
- Statusų reikšmės: `final` = tikras patvirtintas artas; `interim_generated` =
  programiškai sugeneruotas vieningos sistemos vektorius — **laukia galutinio
  „Stylised Gothic Animation" arto** (NEskaičiuoti kaip užbaigto!).

Generatorius: `node tools/gen-card-backs.mjs` (bendra rėmo geometrija +
centrinis antspaudas + 1 akcentas dizainui). Masteriai: `tools/card-backs/masters/`.

| code | type | lt_name | en_name | source_master | runtime_asset | thumbnail_asset | acquisition_source | existing_or_new | legacy_asset_replaced | status |
|---|---|---|---|---|---|---|---|---|---|---|
| cb_default | card_back | Ravenof nugarėlė | Ravenof card back | tools/card-backs/masters/ravenof-default.png | /card-backs/ravenof-default.webp | /card-backs/thumbs/ravenof-default.webp | default (owned_by_default) | new | /card-backs/back.webp (paliktas kaip runtime fallback) | **final** (perpanaudotas patvirtintas back.png artas) |
| cb_mirties_marsas | card_back | Mirties maršo nugarėlė | Death March card back | .../cb-mirties-marsas.png | /card-backs/cb-mirties-marsas.webp | /card-backs/thumbs/cb-mirties-marsas.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_plesiku_naktis | card_back | Plėšikų nakties nugarėlė | Bandits' Night card back | .../cb-plesiku-naktis.png | /card-backs/cb-plesiku-naktis.webp | /card-backs/thumbs/cb-plesiku-naktis.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_vryhioko_gauja | card_back | Vryhioko gaujos nugarėlė | Vryhiok Gang card back | .../cb-vryhioko-gauja.png | /card-backs/cb-vryhioko-gauja.webp | /card-backs/thumbs/cb-vryhioko-gauja.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_demonu_orda | card_back | Demonų ordos nugarėlė | Demon Horde card back | .../cb-demonu-orda.png | /card-backs/cb-demonu-orda.webp | /card-backs/thumbs/cb-demonu-orda.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_inkvizicijos_legionas | card_back | Inkvizicijos legiono nugarėlė | Inquisition Legion card back | .../cb-inkvizicijos-legionas.png | /card-backs/cb-inkvizicijos-legionas.webp | /card-backs/thumbs/cb-inkvizicijos-legionas.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_sviesos_pulkas | card_back | Šviesos pulko nugarėlė | Light Regiment card back | .../cb-sviesos-pulkas.png | /card-backs/cb-sviesos-pulkas.webp | /card-backs/thumbs/cb-sviesos-pulkas.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_mistikos_melodija | card_back | Mistikos melodijos nugarėlė | Mystic Melody card back | .../cb-mistikos-melodija.png | /card-backs/cb-mistikos-melodija.webp | /card-backs/thumbs/cb-mistikos-melodija.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_rytu_vejas | card_back | Rytų vėjo nugarėlė | Eastern Wind card back | .../cb-rytu-vejas.png | /card-backs/cb-rytu-vejas.webp | /card-backs/thumbs/cb-rytu-vejas.webp | shop · 800 sidabro | new | — | interim_generated |
| cb_ruby_inferno | card_back | Rubino infernas | Ruby Inferno card back | .../cb-rubino-infernas.png | /card-backs/cb-rubino-infernas.webp | /card-backs/thumbs/cb-rubino-infernas.webp | shop · 600 rubinų (is_shop_exclusive) | existing | css gradientas (tuščia panelė) | interim_generated |
| cb_crimson_crown | card_back | Karmazino karūna | Crimson Crown card back | .../cb-karmazino-karuna.png | /card-backs/cb-karmazino-karuna.webp | /card-backs/thumbs/cb-karmazino-karuna.webp | shop · 350 rubinų (is_shop_exclusive) | existing | css gradientas (tuščia panelė) | interim_generated |
| cb_ember | card_back | Žarijų nugarėlė | Ember card back | .../cb-ember.png | /card-backs/cb-ember.webp | /card-backs/thumbs/cb-ember.webp | shop · 800 sidabro | existing | css gradientas | interim_generated |
| cb_frost | card_back | Šerkšno nugarėlė | Frost card back | .../cb-frost.png | /card-backs/cb-frost.webp | /card-backs/thumbs/cb-frost.webp | shop · 800 sidabro | existing | css gradientas | interim_generated |
| cb_void | card_back | Tuštumos nugarėlė | Void card back | .../cb-void.png | /card-backs/cb-void.webp | /card-backs/thumbs/cb-void.webp | shop · 1200 sidabro | existing | css gradientas | interim_generated |
| cb_gold | card_back | Auksinė nugarėlė | Golden card back | .../cb-gold.png | /card-backs/cb-gold.webp | /card-backs/thumbs/cb-gold.webp | shop · 2000 sidabro | existing | css gradientas | interim_generated |
| basic_card_back | card_back | Bazinė nugarėlė | Basic card back | .../cb-basic.png | /card-backs/cb-basic.webp | /card-backs/thumbs/cb-basic.webp | account level 10 | existing | css gradientas | interim_generated |
| rare_card_back | card_back | Reta nugarėlė | Rare card back | .../cb-rare.png | /card-backs/cb-rare.webp | /card-backs/thumbs/cb-rare.webp | account level 20 | existing | css gradientas | interim_generated |
| premium_card_back | card_back | Premium nugarėlė | Premium card back | .../cb-premium.png | /card-backs/cb-premium.webp | /card-backs/thumbs/cb-premium.webp | account level 30 | existing | css gradientas | interim_generated |
| legendary_card_back | card_back | Legendinė nugarėlė | Legendary card back | .../cb-legendary.png | /card-backs/cb-legendary.webp | /card-backs/thumbs/cb-legendary.webp | account level 40 | existing | css gradientas | interim_generated |
| prestige_card_back | card_back | Prestižo nugarėlė | Prestige card back | .../cb-prestige.png | /card-backs/cb-prestige.webp | /card-backs/thumbs/cb-prestige.webp | account level 50 (neperkama) | existing | css gradientas | interim_generated |
| av_ruby_raven | avatar | Rubino varnas | Ruby Raven | .../av-rubino-varnas.png | /card-backs/av-rubino-varnas.webp | /card-backs/thumbs/av-rubino-varnas.webp | shop · 800 rubinų (is_shop_exclusive) | existing | emoji 🐦‍⬛ (tuščia kortelė) | interim_generated |
| av_raven | avatar | Varnas | Raven | .../av-varnas.png | /card-backs/av-varnas.webp | /card-backs/thumbs/av-varnas.webp | shop · 500 sidabro | existing | emoji | interim_generated |
| av_dragon | avatar | Drakonas | Dragon | .../av-drakonas.png | /card-backs/av-drakonas.webp | /card-backs/thumbs/av-drakonas.webp | shop · 700 sidabro | existing | emoji | interim_generated |
| av_skull | avatar | Kaukolė | Skull | .../av-kaukole.png | /card-backs/av-kaukole.webp | /card-backs/thumbs/av-kaukole.webp | shop · 700 sidabro | existing | emoji | interim_generated |
| av_crown | avatar | Karūna | Crown | .../av-karuna.png | /card-backs/av-karuna.webp | /card-backs/thumbs/av-karuna.webp | shop · 1500 sidabro | existing | emoji | interim_generated |
| av_inkvizitorius | avatar | Inkvizitorius | Inquisitor | .../av-inkvizitorius.png | /card-backs/av-inkvizitorius.webp | /card-backs/thumbs/av-inkvizitorius.webp | shop · 800 sidabro | existing | emoji ⚔ | interim_generated |
| basic_player_avatar | avatar | Bazinis avataras | Basic avatar | .../av-basic.png | /card-backs/av-basic.webp | /card-backs/thumbs/av-basic.webp | account level 10 | existing | emoji | interim_generated |
| rare_player_avatar | avatar | Retas avataras | Rare avatar | .../av-rare.png | /card-backs/av-rare.webp | /card-backs/thumbs/av-rare.webp | account level 20 | existing | emoji | interim_generated |
| premium_player_avatar | avatar | Premium avataras | Premium avatar | .../av-premium.png | /card-backs/av-premium.webp | /card-backs/thumbs/av-premium.webp | account level 30 | existing | emoji | interim_generated |
| legendary_player_avatar | avatar | Legendinis avataras | Legendary avatar | .../av-legendary.png | /card-backs/av-legendary.webp | /card-backs/thumbs/av-legendary.webp | account level 40 | existing | emoji | interim_generated |
| av_nekronautas | avatar | Nekronautas | Necronaut | (admin įkeltas portretas Supabase storage) | cosmetics.image_url (storage) | — | default (owned_by_default) | existing | — | **final** (admino įkeltas artas; migracija jo NEliečia) |

Pastabos:
- Runtime'e liekantys statiniai: `/card-backs/back.webp` (galutinis fallback),
  `/card-backs/curse.webp`, `/card-backs/zmk.webp` — specialios sisteminės
  nugarėlės (prakeiksmai/ŽMK), jos NE kosmetika ir nekeičiamos pasirinkimu.
- `image_url` migracija 20260860 priskiria TIK kai jis `NULL` — admino įkeltas
  artas (pvz., „Nuodų nugarėlė", jei turi) niekada neperrašomas.
- Frakcijų nugarėlių centriniai sigilai — interim: galutiniame arte naudoti
  TIKRAS kanonines frakcijų emblemas (factions.icon_url / asffa šaltinius),
  neišradinėti naujų.
