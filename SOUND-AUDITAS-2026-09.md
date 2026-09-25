# SOUND-AUDITAS — kur ir kokių garsų dar trūksta

**Data:** 2026-09-25 · būsena po commit725 (ankstesnis sąrašas: `SOUND-TODO.md`, 2026-08-10)

Sistema **file-first**: kodas pirma ieško mp3 (`public/sounds/battle|reaction|ui/`), jei nėra —
groja sintezę. Įkėlus failą nurodytu vardu kodo keisti nereikia. Variantai: `vardas.mp3` ARBA
`vardas-1.mp3 … -6.mp3` (grojamas atsitiktinis, nekartojant iš eilės).

---

## 1. Kas jau yra (patikrinta faktiškai kataloge)

| Katalogas | Raktas → failas | Variantai | Būsena |
|---|---|---|---|
| battle/ | attack | 5 | ✅ gerai |
| battle/ | spell-cast | 5 | ✅ gerai |
| battle/ | impact | 5 (`impact` + `-1..-4`) | ✅ gerai (buvo 1) |
| battle/ | summon | 4 | ✅ gerai (buvo sintezė) |
| battle/ | heal | 3 | ✅ |
| battle/ | death, draw, curse, field, freeze, champion-skill, zmk-flip, explosion, zmk-crit, zmk-fizzle | **po 1** | ⚠️ plona vieta — kartojasi |
| reaction/ | launch, impact, tighten, shatter | **0** | ❌ visos 4 reakcijų grandinės fazės groja SINTEZĘ |
| ui/ | 22 failai (hover, card-pick, card-place, card-flip, ui-click, success, error, panel-open, discovery, shuffle, card-draw, map-zoom) | **0** | ❌ visas UI (visame portale) groja sintezę |
| music/ | menu-theme, battle-1..4 | ✅ | `battle-5` neprivalomas |
| šaknis | applause, coin-1..3, damage-1..5, heal-1..5, sword-clash | — | fizinio žaidimo life-tracker / lore; kovoje nenaudojami |

**Nenaudojamas failas:** `battle/freesound_community-thump-105302-mono.mp3` — kodas jo niekada
nekrauna (vardas ne pagal schemą). Tai geras kandidatas į naują `puff` garsą (žr. 2.1).

---

## 2. Įvykiai, kurie kovoje NETURI SAVO GARSO (reikia ir kodo rakto, ir failo)

Šiuos radau eidamas per `TutorialGame.tsx` įvykių switch'ą, `SceneFxLayer`, `ZmkSpecial`,
`ReactionChainLayer` ir PvP ekranus. Kodo pusę galiu padaryti per vieną commit'ą (nauji
`BattleSoundType` raktai + sintezės fallback'ai), tada liks tik failai.

### 2.1 Prioritetas A — girdima kiekvienoje kovoje

| # | Įvykis | Kas groja dabar | Siūlomas raktas → failas | Charakteris |
|---|---|---|---|---|
| 1 | **0 žalos smūgis (ZERO puff, nauja 725)** — skydas, imunitetas, ŽMK ×0 | `impact` 0.14 (tas pats smūgis, tik tyliau) | `puff` → `battle/puff.mp3` (+`-1`) | Duslus „bumbt“ į dulkes, be metalo. Galima pervadinti nenaudojamą thump failą |
| 2 | **Ėjimo pradžia** (baneris „Tavo ėjimas“) | tik `draw` 0.28 nuo kortos traukimo | `turnStart` → `battle/turn-start.mp3`, `turnStartEnemy` → `battle/turn-start-enemy.mp3` | Trumpas gongas / būgno dūžis. PvP labai svarbu — žaidėjas girdi, kad jo eilė, net jei žiūri kitur |
| 3 | **Ėjimo pabaiga** (mygtukas) | `ui-click` | `turnEnd` → `battle/turn-end.mp3` | Švelnus „perdavimas“, ne click |
| 4 | **Buff / debuff** (`case 'buff'`) | **nieko** | `buff` → `battle/buff.mp3`, `debuff` → `battle/debuff.mp3` | Kylantis šviesus akordas / krentantis tamsus |
| 5 | **Aukso gavimas** (`case 'gold'`, efektai „gauk N aukso“) | **nieko** (tik ėjimo ritualo skaitiklis) | `gold` → `battle/gold.mp3` (+`-1`,`-2`) | Monetų žvangesys. Galima perkelti `coin-1..3.mp3` iš šaknies |
| 6 | **Statuso uždėjimas** — nuodai, degimas, apsvaiginimas, nutildymas | **nieko** (garsas yra tik tick'ui ėjimo pradžioje) | `statusPoison`, `statusBurn`, `statusStun`, `statusSilence` → `battle/status-poison.mp3` ir t. t. | Šnypštimas / užsidegimas / trenksmas į galvą / „mute“ whoosh. `freeze` jau yra |
| 7 | **Skydas** — uždėjimas ir sudužimas | uždėjimas: nieko; sudužimas: `freeze` 0.45 (ledo garsas skydui netinka) | `shieldUp` → `battle/shield-up.mp3`, `shieldBreak` → `battle/shield-break.mp3` | Magiškas „vmmm“ užsidegimas; stiklo/kristalo dūžis |
| 8 | **Reakcijos padėjimas į slotą** ir **artefakto padėjimas** (ta pati skrydžio animacija) | `impact` 0.18 (generinis bumbt) | `reactionSet` → `battle/reaction-set.mp3`, `artifactPlace` → `battle/artifact-place.mp3` | Kortos „užrakinimas“ su spragtelėjimu; artefaktui — metalo/akmens padėjimas |
| 9 | **Grąžinimas į ranką** (`returnHand`) | **nieko** | `returnHand` → `battle/return-hand.mp3` | Atbulinis whoosh |

### 2.2 Prioritetas B — scenos ir dramaturgija

| # | Įvykis | Kas groja dabar | Siūlomas raktas → failas | Charakteris |
|---|---|---|---|---|
| 10 | **Kovos šūksnio scena** (SceneFx battlecry) | `summon` 0.25 (dubliuoja iškvietimo garsą) | `battlecrySting` → `battle/battlecry-sting.mp3` | Trumpas herojiškas „šūksnis“ / varinis akcentas |
| 11 | **Paskutinio noro scena** (lastwish) | `curse` 0.25 | `lastwishSting` → `battle/lastwish-sting.mp3` | Šnabždesys + žemas dūžis, vaiduokliška |
| 12 | **Trigerio scena** (trigger) | `spellCast` 0.3 | `triggerSting` → `battle/trigger-sting.mp3` | Mechaninis „click-whoosh“ |
| 13 | **ŽMK traukimas iš kaladės → skrydis** (zmk scena) | `draw` + `zmk-flip` | `zmkDraw` → `battle/zmk-draw.mp3` | Ilgesnis swoosh su „pakibimu“ prieš flip'ą |
| 14 | **Reakcijų grandinė** (4 fazės) | sintezė | `reaction/launch, impact, tighten, shatter` (+variantai) | Žr. `reaction/README.md` — buvo B prioritetas dar 08-10, vis dar nepadaryta |
| 15 | **Monetos metimas** kovos pradžioje | `card-flip` + `impact` + `success` | `coinToss` → `battle/coin-toss.mp3` | Besisukanti moneta + nusileidimas (~1 s) |
| 16 | **Pergalė / pralaimėjimas** | `explosion` + sintezės success/error + avataro balsas | `music/victory-sting.mp3`, `music/defeat-sting.mp3` | 3–5 s fanfara / niūrus akordas, muzika tuo metu nutildoma |
| 17 | **Mažai HP** (≤25 %) | avataro `lowHp` balsas vieną kartą | `battle/low-hp-loop.mp3` (širdies plakimas, loop, tylus) | Neprivaloma, bet stipriai kelia įtampą |
| 18 | **Nuovargio žala** (tuščia kaladė) | įprastas žalos garsas | `fatigue` → `battle/fatigue.mp3` | Sausas, tuščias „pokšt“ — turi skirtis nuo smūgio |

### 2.3 Prioritetas C — meta (ne kova)

| # | Įvykis | Kas groja dabar | Siūlomas failas |
|---|---|---|---|
| 19 | **PvP: priešininkas rastas / prisijungė** (`DigitalPvP`, lobby) | **nieko** (tik klaidos) | `ui/match-found.mp3` — svarbiausias meta garsas, žaidėjas laukia žiūrėdamas kitur |
| 20 | **Pokalbio žinutė** (GlobalChatLayer) | `ui-click` | `ui/chat-ping.mp3` |
| 21 | **Level-up / atlygis / užduotis įvykdyta** | `success` sintezė | `ui/level-up.mp3`, `ui/reward.mp3`, `ui/quest-complete.mp3` |
| 22 | **Booster atplėšimas** (PackOpen) | sintezė: impact / pick / flip / discovery / success | `ui/pack-tear.mp3`, `ui/pack-reveal-rare.mp3`, `-epic`, `-legendary` |
| 23 | **Visi UI garsai** (22 failai) | sintezė | `ui/` pagal README — hover ir ui-click skamba dažniausiai, todėl jie svarbiausi |

---

## 3. Trumpas darbų sąrašas (jei darysi tik dalį)

1. `battle/puff.mp3` — naujas ZERO smūgis skamba kaip smūgis, nors vizualas jau dūmų puff'as.
2. `battle/turn-start.mp3` + `ui/match-found.mp3` — PvP „tavo eilė“ / „radau priešininką“.
3. `reaction/` 4 failai — reakcijų grandinė yra ilgiausia ir garsiausia kovos scena, o groja sintezę.
4. `battle/buff.mp3`, `debuff.mp3`, `gold.mp3`, `status-*.mp3`, `shield-*.mp3` — įvykiai, kurie šiandien tylūs.
5. `ui/hover-*.mp3`, `ui/ui-click-*.mp3`, `ui/card-*.mp3` — dažniausi garsai visame portale.
6. Antri variantai vienišiems: death, draw, curse, field, freeze, zmk-flip, explosion.

## 4. Techniniai reikalavimai (nepasikeitę)

mp3, 44.1 kHz, mono, 96–128 kbps, peak ≈ −6 dBFS, **be tylos pradžioje**, ≤ 1 s (išskyrus
sting'us/fanfaras). Failus dėti tiesiai į nurodytą katalogą ir **įtraukti į git** — netracked
failas veiks lokaliai, bet Vercel'yje/bundle'e jo nebus.

## 5. Kodo pusė (padarysiu, kai pasakysi)

Naujiems raktams reikia: `BattleSoundType` (types.ts) + `BASE`/`SYNTH_FALLBACK` (soundManager.ts)
+ iškvietimai `TutorialGame.tsx` (buff/gold/status/shield/returnHand/turnStart/turnEnd),
`SceneFxLayer.tsx` (sting'ai), `impactProfiles.ts` (ZERO → `puff`), `DigitalPvP.tsx` (match-found).
Kol failų nėra, groja sintezė — tad kodą galima daryti anksčiau už garsus.
