# GAME-FEEL-REPORT.md — įgyvendinimo ataskaita

**Data:** 2026-08-10
**Commit intervalas:** commit568–commit576
**Plano versija:** GAME-FEEL-HANDOFF.md (2026-08-10)
**Vykdyta:** Claude sesija, redagavimas per bash (žr. `ravenof-fs-write-sync`), commit'ai per Windows .bat

| Commit | Turinys (viena eilutė) |
|---|---|
| commit568 | Fazė 0 — P0 mechanikos pataisymai (`buffDuration` debuff'ams, `conditionSkipped` logas, `buffSpellDamage` į `EFFECT_TYPES`, prakeiksmų gylio apsauga) + test runner |
| commit569 | Fazė 1 — game-feel telemetrija (`feelTelemetry.ts` → `MatchStatsPayload`) |
| commit570 | Fazė 2 — kortų tactile sluoksnis (`CARD_TACTILE`, `CardTactile.tsx`, tempimo inercija, snap zona) |
| commit571 | Fazė 3 — reakcijų grandinės SFX (4 nauji garsai) + pakartojimų kompresija |
| commit572 | Fazės 4–5 — `ImpactProfile` + severity varikliuke, hit-stop `BattleFxLayer.impactFrame()` |
| commit573–575 | **NEBENAUDOJAMI** — .bat failai neutralizuoti, turinys perkeltas į commit576 (žr. §2) |
| commit576 | Fazės 6–10 (+ build fix): HP ghost juosta, ŽMK ×2/×0 prezentacija, statusų trigger feedback, mirties stilius, ėjimo pradžios ritualas |

---

## 1. Fazių būsena

| Fazė | Būsena | Commit | Pastaba |
|---|---|---|---|
| 0 P0 pataisymai | **DONE (kodas) / PARTIAL (duomenys)** | 568 | Visi 4 kodo pataisymai padaryti. Kortų duomenų taisymai (3 prakeiksmai, *Juodieji pirštai*) **neatlikti** — jie gyvena DB per admin UI, ne repo (žr. §8) |
| 1 Telemetrija | **DONE (kodas) / PARTIAL (matavimai)** | 569 | 6 metrikos renkamos ir siunčiamos. Realių kovų baseline **neišmatuotas** — vykdymo aplinkoje nėra naršyklės (žr. §2, §4) |
| 2 Tactile | **DONE** | 570 | Visi 7 momentai; hover jau egzistavo per `GameCard`, konstantos suvestos į `timing.ts` |
| 3 Reaction SFX + compression | **DONE** | 571 | 4 garsai + synth fallback; compact ~2.4 s vs 3.9 s |
| 4 ImpactProfile | **DONE** | 572 | 5 pakopos, severity skaičiuojama varikliuke ir keliauja žurnalu |
| 5 Hit-stop | **DONE** | 572 | Vizualinis hold per `timeShift`; variklis nestabdomas |
| 6 HP ghost | **DONE** | 576 | Padarų juosta + herojaus flakonas |
| 7 ŽMK | **DONE** | 576 | ×2 / ×0 / advantage / specialus permaišymas |
| 8 Statusų trigger feedback | **PARTIAL** | 576 | Padaryta: skydo blokas („BLOKUOTA"), degimo/nuodų tikas. **Nepadaryta:** frozen atsikirtimo blokas ir taunt „metalinis pulsas" — varikliukas šių momentų į žurnalą neįrašo (žr. §6) |
| 9 Mirties severity | **DONE** | 576 | 8 stiliai, iš jų 3 tylūs |
| 10 Turn-start ritualas | **DONE** | 576 | Aukso fill + ready pulsas; įvestis neužrakinama |
| 11–12 (backlog) | **SKIPPED** | — | Pagal planą šiame sprinte nedaromos |

---

## 2. Nukrypimai nuo plano

### 2.1 Severity santykio riba: 0.8 → 0.9

**Planuota:** §7.2 lentelė — `DEVASTATING` jei `dmg ≥ 10` **arba** `dmg/maxHp ≥ 0.8`.
**Padaryta:** riba 0.9.
**Kodėl:** planas §7.4 kaip priėmimo kriterijų nurodo „5 dmg padarui su 6 HP duoda **HEAVY** (santykio taisyklė veikia)". 5/6 = 0.833, tad su 0.8 riba tai duotų `DEVASTATING` — lentelė ir priėmimo kriterijus prieštarauja vienas kitam. Pasirinktas konkretesnis (priėmimo kriterijus). Praktiškai 0.9+ santykis beveik visada reiškia mirtį (→ `LETHAL`), tad ši riba veikia kaip „išgyveno per plauką" atvejis. Riba stovi viename kintamajame `SEVERITY_THRESHOLDS.devastatingRatio` ir yra skirta tiuningui.

### 2.2 Commit'ų struktūra: 573–575 sulieti į 576

**Planuota:** §13.3 — vienas commit'as fazei.
**Padaryta:** fazės 6–10 sudėtos į vieną commit576.
**Kodėl (techninė priežastis):** .bat failai buvo paruošti fazės pabaigoje, o paleisti **vėliau** (vienu paketu). `git add src/components/tutorial/TutorialGame.tsx` paima failo būseną **paleidimo**, ne rašymo metu — tad commit568–572 pagavo jau atnaujintą `TutorialGame.tsx` su importais failų (`HpGhostBar`, `ZmkSpecial`), kurie tuose commit'uose dar nebuvo pridėti. Vercel build'as krito: `Module not found: Can't resolve '@/components/tutorial/HpGhostBar'`.
Vietoj trijų iš eilės einančių raudonų commit'ų (573 pridėtų `HpGhostBar`, bet `ZmkSpecial` vis tiek trūktų iki 574) pasirinktas vienas commit576, po kurio HEAD iškart žalias.
**Pamoka kitai sesijai:** .bat paleisti **iškart** po fazės, arba .bat'e naudoti `git add` su tiksliu failų sąrašu, kuris apima ir dar nesukurtus failus tos fazės ribose.

### 2.3 Fazė 8 nepilna

Žr. §6 — trūksta variklio įvykių dviem momentams.

### 2.4 Testų runner'is: `tsx` pakeistas node type-stripping'u

**Planuota:** naudoti esamą testų runner'į (`npx tsx`, `vitest`).
**Padaryta:** `scripts/alias-loader.mjs` + `alias-hooks.mjs` ir `npm run game:test:feel`.
**Kodėl:** vykdymo aplinkos bash sandbox **neturi tinklo** ir `node_modules` neturi nei `tsx`, nei `vitest` (jie ateidavo per `npx` su tinklu). Node 22 `--experimental-strip-types` + minimalūs `@/` alias ir JSON hook'ai leidžia paleisti tas pačias TS simuliacijas be tinklo. Šalutinė nauda: visos esamos `scripts/simulate-*.ts` dabar paleidžiamos taip pat (dviem prireikė `import type` pataisymo).

---

## 3. Pakeisti / nauji failai

### Nauji

| Failas | Paskirtis |
|---|---|
| `src/lib/game/feelTelemetry.ts` | Game-feel telemetrija (užrakto laikas, input→feedback, kinų praleidimai). Modulinė būsena, **ne** `GameState`. |
| `src/lib/game/tactile.ts` | Gryna tactile logika (inercija, snap zona) be DOM/JSX — testuojama. |
| `src/lib/game/impactProfiles.ts` | 5 severity pakopos + profiliai + `resolveSeverity`. |
| `src/lib/game/reactionPacing.ts` | Per-kovos reakcijų skaitiklis (pirma pilna, vėlesnės kompaktiškos). |
| `src/lib/game/deathStyles.ts` | Mirties stilius pagal žalos šaltinį (8 stiliai, 3 tylūs). |
| `src/components/tutorial/CardTactile.tsx` | Tactile CSS + imperatyvūs helper'iai (`pressPulse`, `invalidPulse`, `snapSettle`, `returnSpring`). |
| `src/components/tutorial/HpGhostBar.tsx` | HP ghost juosta + `useHpGhost` hook'as. |
| `src/components/tutorial/ZmkSpecial.tsx` | ŽMK ×2/×0 prezentacija + specialaus permaišymo švysnis. |
| `scripts/simulate-game-feel.ts` | 85 game-feel regresijos patikros. |
| `scripts/alias-loader.mjs`, `scripts/alias-hooks.mjs` | `@/` alias + JSON hook'ai node type-stripping'ui. |
| `tsconfig.check.gamefeel.json` | Greitas targeted typecheck (pilnas `tsc --noEmit` FUSE mount'e trunka >15 min). |
| `public/sounds/reaction/README.md` | Ko laukiama iš garso failų (formatai, trukmės, charakteris). |

### Pakeisti

`src/lib/game/timing.ts` · `src/lib/game/types.ts` · `src/lib/game/effectEngine.ts` · `src/lib/game/curseEngine.ts` · `src/lib/game/soundManager.ts` · `src/lib/game/musicManager.ts` · `src/lib/game/matchStats.ts` · `src/lib/ui-sound.ts` · `src/lib/tutorial/engine.ts` · `src/lib/tutorial/ai/aiEngine.ts` · `src/lib/progression/client.ts` · `src/components/ui/GameCard.tsx` · `src/components/tutorial/TutorialGame.tsx` · `src/components/tutorial/BattleFxLayer.tsx` · `src/components/tutorial/ReactionChainLayer.tsx` · `src/locales/{lt,en}/battleLog.json` · `src/locales/{lt,en}/battle.json` · `package.json` · `scripts/simulate-virtual-game.ts`

### Naujos `timing.ts` konstantos

| Blokas | Reikšmės |
|---|---|
| `CARD_TACTILE` | `hoverLiftPx 12`, `hoverTiltDeg 10`, `hoverMs 140`, `pressScale 0.97`, `pressMs 70`, `dragLerp 0.3`, `dragMaxLagPx 22`, `snapRadiusPx 52`, `snapMs 130`, `invalidPulseMs 90`, `returnMs 220` |
| `REACTION_CHAIN_PHASES_COMPACT` | `detect 250`, `chain 550`, `wrap 400`, `showcase 700`, `effect 500` → `GATE_COMPACT 1900`, `TOTAL_COMPACT 2400` |
| `AUDIO_DUCK` | `defaultDb -3`, `holdMs 80`, `rampMs 60` |
| `HIT_STOP` | `lowQualityMaxMs 40`, `punchMs 220`, `flashMs 120` |
| `HP_GHOST` | `holdMs 300`, `collapseMs 200`, `healFillMs 260`, `shakeMs 150`, `shakePx 2` |
| `ZMK_PRESENT` | `routineMs 250`, `critAnticipationMs 150`, `critSlamMs 420`, `critHoldMs 520`, `critDuckDb -12`, `fizzleMs 620`, `reshuffleMs 700` |
| `TURN_RITUAL` | `bannerMs 1600`, `goldFillMs 480`, `readyPulseMs 520`, `goldDelayMs 260` |

Hit-stop trukmės pagal severity gyvena `impactProfiles.ts`: CHIP `0`, HIT `35`, HEAVY `60`, DEVASTATING `80`, LETHAL `85` ms.

### Nauji `BattleSoundType`

`reactionLaunch`, `reactionImpact`, `reactionTighten`, `reactionShatter` (failai iš `public/sounds/reaction/`), `zmkCrit`, `zmkFizzle` (failai iš `public/sounds/battle/`). Visiems yra sintezuoti fallback'ai `ui-sound.ts` — žaidimas skamba be nė vieno failo.

### Nauji i18n raktai (LT + EN)

`battleLog.conditionSkipped` · `battleLog.metric.*` (20 raktų) · `battleLog.op.*` (6) · `battle.game.zmkCritTitle` · `battle.game.zmkFizzleTitle` · `battle.game.zmkReshuffled` · `battle.game.blocked`
LT ir EN parity išlaikyta (2291 raktas abiejose).

---

## 4. Telemetrijos baseline ir rezultatai

| Metrika | Prieš (fazė 1 baseline) | Po (visų fazių) |
|---|---|---|
| `animationLockMsTotal` (vid. iš 3 kovų) | **NEIŠMATUOTA** | **NEIŠMATUOTA** |
| `animationLockMsPerTurn` | **NEIŠMATUOTA** | **NEIŠMATUOTA** |
| `inputToFirstFeedbackMs` | **NEIŠMATUOTA** | **NEIŠMATUOTA** |

**Kodėl neišmatuota (sąžiningai):** telemetrija matuojama TIK realioje kovoje naršyklėje (`performance.now()` + DOM įvykiai). Šios sesijos vykdymo aplinka yra bash sandbox be naršyklės ir be tinklo — paleisti `next dev` ir sužaisti 3 kovų nebuvo įmanoma. Metrikos surinkimo kelias **veikia ir yra padengtas 9 vienetiniais testais** (`F1` blokas), bet realių skaičių nėra.

**Kaip išmatuoti (kitas žingsnis, ~15 min):**

1. `npm run dev` → `/digital/pve`, sužaisti 3 kovas iki galo.
2. Kiekvienos kovos pabaigoje `reportMatchStats` siunčia payload'ą — jį galima pamatyti Network tab'e (`rvn_report_match_stats`) arba laikinai `console.log(st)` prieš siuntimą `TutorialGame.tsx`.
3. Įrašyti `animationLockMsTotal`, `animationLockMsPerTurn`, `inputToFirstFeedbackMs`, `inputFeedbackSamples`.
4. Palyginimui „prieš" reikėtų `git checkout d7cc9b8` (commit567) — bet ten telemetrijos dar nėra, tad realus „prieš" yra **commit569** (telemetrija yra, fazės 2–10 dar ne).

**Ko tikėtis pagal konstantas (skaičiavimas, ne matavimas):**

- `animationLockMsTotal` turėtų kristi kovose su ≥2 reakcijomis: kiekviena antra ir vėlesnė reakcija atlaisvina `3900 − 2400 = 1500 ms` užrakto.
- `inputToFirstFeedbackMs` turėtų nukristi iki **~0–16 ms** (vieno kadro): fazė 2 kviečia `noteFirstFeedback()` iškart po `pressPulse()` ant pointer-down. Iki fazės 2 pirmas atsakas būdavo showcase, t. y. `SETTLE` + FX eilė (šimtai ms).
- Hit-stop įvestį **nedidina**: hold vyksta FX sluoksnyje po veiksmo, `actionsLocked` jo neapima.

---

## 5. Testai

### Nauji / pakeisti

| Suite | Rezultatas |
|---|---|
| `npm run game:test:feel` (naujas, `scripts/simulate-game-feel.ts`) | **85 ✓ / 0 ✗** |
| `scripts/simulate-battlecry-chain.ts` | 62 ✓ / 0 ✗ |
| `scripts/simulate-target-validation.ts` | 32 ✓ / 0 ✗ |
| `scripts/simulate-new-triggers.ts` | 8 ✓ / 0 ✗ |
| `scripts/simulate-extra-attacks.ts` | 7 ✓ / 0 ✗ |
| `scripts/simulate-cast-from-grave.ts` | 17 ✓ / 0 ✗ |
| `scripts/simulate-champ-swap.ts` | 12 ✓ / 0 ✗ |
| `scripts/simulate-then-sametarget.ts` | 19 ✓ / 0 ✗ |
| `scripts/simulate-virtual-game.ts` | 26 ✓ / **3 ✗ (PRIEŠ ŠĮ SPRINTĄ EGZISTAVUSIOS)** |
| `node scripts/i18n-validate.mjs` | 22 namespace, 2291 LT raktas, ERROR: 1 (**pre-existing**, `cosmeticsStore.ts:172`), parity OK |
| `npx tsc -p tsconfig.check.gamefeel.json` | 0 klaidų (25 failai + visi `scripts/*.ts`) |

`game:test:feel` dengia: F0 laikini/nuolatiniai debuff'ai + `conditionSkipped` · F1 telemetrijos matematika · F2 inercija/snap · F3 kompresijos ribos ir pacing · F4 severity ribos + kelias per žurnalą · F6 HP ghost biudžetas · F7 ŽMK biudžetas · F9 mirties stiliai · F10 ritualo biudžetas.

### `simulate-virtual-game.ts` — 3 kritę patikros NĖRA regresija

```
✗ onDraw aktyvavo curse iš side deck   (curses 1 -> 1)
✗ priešininko curse deck sumažėjo
✗ curse efektas pritaikytas priešininkui
```

**Patikrinta eksperimentu:** laikinai pakėlus `MAX_CURSE_DEPTH` iki 99999 (t. y. visiškai išjungus fazėje 0 pridėtą apsaugą) tos pačios 3 patikros vis tiek krenta. Priežastis — senesnis prakeiksmų modelio pakeitimas (**įmaišymas** ir **aktyvacija** atskirtos į dvi fazes, žr. `ravenof-curse-activation` atmintį), o testo scenarijus tikisi seno „iškart aktyvuojasi" elgesio. Testą reikia atnaujinti prie dabartinio modelio (žr. §7).

### Smoke patikra: tutorial / PvE / kampanija / ranked / PvP

**NEATLIKTA.** Ta pati priežastis kaip §4 — nėra naršyklės. Vietoj jos atlikta:

- pilnas targeted typecheck visų paliestų failų + `scripts/*.ts` (0 klaidų),
- 8 variklio regresijos suite'ai (177 patikros, 0 naujų kritimų),
- i18n parity validacija.

`TutorialGame.tsx` yra visų penkių režimų ekranas, tad **smoke patikra prieš deploy būtina** (žr. §7 punktą 1).

### `prefers-reduced-motion` ir `rvn-vfx-quality=low`

Patikrinta **kodo lygmeniu** (ne vizualiai):

| Vieta | Reduced-motion | low quality |
|---|---|---|
| Tactile (`CardTactile.tsx`) | visos animacijos `none`, snap zona lieka statiniu kontūru | — |
| Tempimo inercija (`dragFollowAt`) | inercijos nėra (ghost = žymeklis) | — |
| Hit-stop (`effectiveHitStop`) | **0 ms** | max **40 ms** |
| Impact punch/flash | `animation: none` | — |
| HP ghost | be `transition` | — |
| ŽMK ×2/×0 | be vinjetės, statinis glifas, trumpesnė trukmė | — |
| Turn ritualas | `animation: none` | — |
| Reakcijų grandinė | 900 ms gate (nepakitęs elgesys) | — |

**Rasta ir ištaisyta darbo metu:** pirminė tactile/impact CSS versija animavo `transform`, o rankos kortos ir padarų plytelės yra `framer-motion` valdomos — CSS animacija būtų perrašiusi jų inline transformą (kortos „šoktelėtų"). Visos naujos animacijos perrašytos naudoti **nepriklausomas `scale` / `translate` savybes**, kurios su `transform` komponuojasi.

---

## 6. Žinomos problemos ir skolos

1. **Fazė 8 nepilna.** „Frozen atsikirtimo blokas" ir „taunt bandymas rinktis kitą taikinį" neįgyvendinti, nes varikliukas šių momentų **į žurnalą neįrašo**: `attack()` sušaldytam gynėjui tiesiog nustato `defRetaliates = false` be `log()`, o `legalTargets` taunt filtrą pritaiko be įvykio. Įgyvendinti reikėtų dviejų naujų `GameEvent` (pvz. `battleLog.frozenNoRetaliate`, `battleLog.tauntBlocked`) — tai variklio, ne UI darbas, ir jis paliečia PvP žurnalo atkūrimą.
2. **Telemetrijos baseline neišmatuotas** (§4).
3. **Smoke patikra neatlikta** (§5).
4. **`simulate-virtual-game.ts` 3 patikros pasenusios** — testas, ne produkcija.
5. **Garso failų nėra.** Visi 6 nauji garsai groja sintezę. `public/sounds/reaction/README.md` aprašo, ko reikia.
6. **Reakcijų kompresija per-klientinė.** PvP abu klientai kompresuoja savarankiškai, tad grandinės gali baigtis skirtingu momentu. Tai **saugu** (kiekvienas gameplay laukia savo lokalaus `Promise`), bet stebėjimų realioje PvP kovoje nėra.
7. **`impactFrame` eilė gali kaupti vėlavimą.** Hit-stop'ai nesikaupia (antras laukia pirmo), bet ilgoje AoE serijoje su daug `LETHAL` smūgių bendras vėlavimas = suma hold'ų (pvz. 5 × 85 ms = 425 ms). Realiai AoE smūgiai jau ir taip išdėstyti per `fxSeq`, tad persidengimas retas — bet jei pasirodys per lėta, riba turėtų būti „ne daugiau N hold'ų per batch".
8. **`EffectMapping.impact` override nepadarytas.** Planas §7.3 minėjo galimybę admin'e nurodyti profilį. Default'as iš `resolveSeverity` veikia visur, tad tai grynas „nice to have"; pridėti reikėtų vieno lauko `types.ts` + dropdown'o.
9. **`shakePx` / `HP_GHOST.shakeMs` deklaruoti, bet nenaudojami.** HEAVY+ HP konteinerio purtymas neįgyvendintas — padaro plytelė jau purtoma per `shakeUnit`, tad atskiras HP konteinerio purtymas atrodė perteklinis. Konstantos paliktos, jei bus norima.
10. **Pilnas `tsc --noEmit` FUSE mount'e trunka >15 min** ir šioje sesijoje nebuvo užbaigtas. Vietoj jo naudotas `tsconfig.check.gamefeel.json`. Prieš deploy verta paleisti pilną typecheck Windows pusėje (`npm run typecheck`).

---

## 7. Rekomendacijos kitai sesijai (prioriteto tvarka)

1. **Smoke patikra + telemetrijos baseline vienu prisėdimu** (~30 min). `npm run dev`, po vieną kovą tutorial / PvE / kampanija / ranked / PvP, užrašyti §4 lentelės skaičius. Tai uždaro dvi didžiausias šio sprinto skolas iškart.
2. **Severity ribų tiuningas.** `SEVERITY_THRESHOLDS` (`impactProfiles.ts`) — pirmoji versija. Konkrečiai stebėti: ar `heavyAbs: 6` nėra per aukštas kovoms, kur tipinis padaras turi 3–5 HP (tada dauguma smūgių bus `CHIP`/`HIT` ir svorio pojūtis dings). Jei taip — sumažinti `heavyAbs` iki 4 ir `hitAbs` iki 2.
3. **Hit-stop tiuningas.** 35–85 ms yra atsargus diapazonas. Jei DEVASTATING neatrodo „sustojęs", kelti iki 100–110 ms; jei kova jaučiasi trūkčiojanti — mažinti HIT iki 20 ms.
4. **Užbaigti fazę 8** — pridėti du variklio įvykius (§6.1). Nedidelis darbas, bet paliečia žurnalą, tad reikia `+testų` ir PvP patikros.
5. **Fazė 11 (frakcijų štrichai)** — dabar tam yra tinkama vieta: `deathStyles.ts` jau turi frakcijos fallback'ą, o `ImpactProfile` galėtų gauti frakcijos akcentą. Pagal planą — 1–2 štrichai frakcijai, ne atskira animacijų sistema.
6. **Fazė 12 (lauko kortų ambience)** — atskiras sprintas, kaip planas ir sako.
7. **Įrašyti 6 garso failus** (§8).
8. **Atnaujinti `simulate-virtual-game.ts` prakeiksmų scenarijų** prie dviejų fazių modelio.
9. **Apsvarstyti `EffectMapping.impact` override** (§6.8) — tik jei atsiras kortų, kurioms reikia dramaturgijos, nesutampančios su žala (pvz. „silpnas smūgis, bet siužetiškai lemtingas").

---

## 8. Admin veiksmai (kas dar liko rankomis)

### Kortų duomenys (admin UI → `cards.gameplay`)

Šie fazės 0 punktai **NEATLIKTI**, nes duomenys gyvena Supabase, ne repozitorijoje. Kodas jiems paruoštas — reikia tik perjungti trigerius admin'e:

| Korta | Veiksmas |
|---|---|
| **Gazzaros žymė** (Prakeiksmas) | Trigerį `onAnyStatus` → **„Kai auka ištraukia šį prakeiksmą" (`onCurseDrawn`)** |
| **Belzatoro akis** (Prakeiksmas) | Trigerį `onPlay` → `onCurseDrawn`; papildomai `revealOwnDeck` → **`revealEnemyDeck`** (dabar rodo kerėtojo, ne aukos kaladę) |
| **Pikti liežuviai** (Prakeiksmas) | Pridėti `onCurseDrawn` mapping'ą (dabar mapping'o iš viso nėra) |
| **Juodieji pirštai** (Burtas) | Užpildyti tuščią `chooseOne` **arba** pašalinti `chooseEffect` (dabar iškart vykdo `then`) |

> Patikrinti galima taip: sužaidus prakeiksmą įmaišantį efektą, aukos žurnale turi atsirasti `battleLog.cursePlant`, o ištraukus — realus efektas, ne `battleLog.curseNoActivation`.

### Garso failai

Į `public/sounds/reaction/`: `launch.mp3`, `impact.mp3`, `tighten.mp3`, `shatter.mp3` (galimi `-1`, `-2` variantai).
Į `public/sounds/battle/`: `zmk-crit.mp3`, `zmk-fizzle.mp3`.
Specifikacija — `public/sounds/reaction/README.md`. Kodo keisti nereikia: `soundManager` yra file-first, failui atsiradus sintezė nustoja groti automatiškai.

### Migracijos

**Nė vienos.** Visos naujos telemetrijos metrikos siunčiamos esamu `rvn_report_match_stats(p_stats jsonb)` keliu — serveris ima tik jam reikalingus raktus. Naujų lentelių ar stulpelių nereikia.

### Commit'ų paleidimas

`run-gamefeel-A.bat` (commit568–572) — **jau paleistas ir supushintas**.
`run-gamefeel-B.bat` (commit576, build fix) — **reikia paleisti**. Iki tol `main` neužsibuildina Vercel'yje.
`git-commit573.bat` … `575.bat` neutralizuoti (nieko nedaro) — jų turinys yra 576.
