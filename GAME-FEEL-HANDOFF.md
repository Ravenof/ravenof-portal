# GAME-FEEL-HANDOFF.md — Ravenof game feel įgyvendinimo planas

**Parengta:** 2026-08-10
**Pagrindas:** `RAVENOF-GAMEPLAY-IR-GAME-FEEL.md` techninė ataskaita (2026-08-10) + game feel analizės išvados.
**Vykdytojas:** Claude Code sesija `ravenof-portal` repozitorijoje.
**Privaloma pabaigoje:** sukurti ataskaitą `GAME-FEEL-REPORT.md` pagal §12 šabloną. Be ataskaitos darbas nelaikomas baigtu.

---

## 0. Tikslas vienu sakiniu

Ravenof turi stiprų Tier 3 spektaklį (22 summon scenos, 5 fazių reakcijų grandinė, kinematika), bet silpną Tier 0–1 (tactile, routine veiksmai). Šio darbo tikslas — pridėti **svorį, ritmą ir kontrastą**: keturių intensyvumo lygių sistema `touch → action → impact → spectacle`, kur spectacle pasiekia tik maža dalis veiksmų.

**NE tikslas:** nauji dideli summon/VFX efektai. Jų jau pakanka.

---

## 1. Nekeičiami invariantai

Šie dalykai per visą darbą **negali būti pažeisti**. Kiekviena fazė prieš commit'ą pasitikrina prieš šį sąrašą.

1. **Kanoninė kovos FX seka nekeičiama:** showcase → ŽMK → projektiliai/AoE → HP kritimas → mirtys → kapinyno srautas. Galima keisti fazių **trukmes**, ne eiliškumą.
2. **Vartai, ne setTimeout.** Gameplay būsena taikoma tik animacijos `Promise` išsisprendus (ReactionGate / SummonChainFrame principas). Joks naujas efektas negali taikyti būsenos „kosmetiniu" `setTimeout`. `cancel()` ir unmount privalo resolve'inti promise — kova niekada neužsirakina.
3. **`timing.ts` — vienintelis pacing šaltinis.** Visos naujos trukmės, hit-stop reikšmės, severity pakopos — tik ten. Jokių magic numbers komponentuose.
4. **DOM inkarai nepašalinami:** `data-unit-uid`, `data-artifact-uid`, `data-player`, `data-pile`, `data-tut`, `data-fx-root`, `data-fx-board`.
5. **`prefers-reduced-motion` ir `rvn-vfx-quality` (low/medium/high) gerbiami visur.** Kiekvienas naujas efektas privalo turėti reduced/low elgesį (dažniausiai — statinis arba praleistas). Hit-stop reduced-motion režime = 0 ms.
6. **PvP žurnalo atkūrimas.** Svečias atkuria animacijas iš to paties GameEvent žurnalo (`seq` dedupe). Nauji vizualiniai įvykiai eina per esamą magistralę (`statusEvt` pavyzdys), be naujų broadcast payload laukų, nebent neišvengiama.
7. **`TutorialGame.tsx` yra visų režimų ekranas.** Kiekviena fazė baigiasi smoke patikra: tutorial, PvE, kampanija, ranked, PvP (bent lokaliai) pasileidžia ir viena kova praeina be klaidų.
8. **LT/EN i18n:** visi nauji UI tekstai per i18n raktus, kovos logas — key+params, ne tekstas.
9. **Garsai — file-first + synth fallback.** Nauji SFX registruojami `soundManager`/`ui-sound` konvencija (iki 7 URL kandidatų, fallback sintezė), žaidimas privalo skambėti ir be failų.
10. **Emoji reward/UI slotuose draudžiami** (galioja esamas validacijos skriptas).

---

## 2. Fazių apžvalga ir eiliškumas

| Fazė | Pavadinimas | Prioritetas | Apimtis | Priklauso nuo |
|---|---|---|---|---|
| 0 | P0 mechanikos pataisymai | S+ | ~0.5 d. | — |
| 1 | Game-feel telemetrija (baseline) | S+ | ~0.5 d. | — |
| 2 | Kortų tactile sluoksnis | S+ | 1–2 d. | — |
| 3 | Reaction chain SFX + repeat compression | S | 1 d. | 1 (baseline) |
| 4 | ImpactProfile + damage severity | S | 1–2 d. | — |
| 5 | Impact frame + hit-stop | S | 1–2 d. | 4 |
| 6 | HP ghost damage bar | A+ | 0.5 d. | — |
| 7 | ŽMK prezentacija | S | 1–2 d. | 4, 5 |
| 8 | Statusų trigger feedback | A | 1 d. | 4 |
| 9 | Mirties severity (cause of death) | A+ | 1–2 d. | 4 |
| 10 | Turn-start ritualas | A | 0.5–1 d. | — |
| 11 | Frakcijų štrichai (minimalus variantas) | B+ | atidėta | 4, 9 |
| 12 | Lauko kortų ambience | B | atidėta | — |

**Griežta taisyklė:** fazės 0 ir 1 daromos pirmos ir kartu (vienas commit'as arba du iš eilės). Fazės 2–10 — po vieną, kiekviena su savo commit'u ir smoke patikra. Fazės 11–12 šiame sprinte **nedaromos** — tik jei liks laiko ir visos kitos uždarytos.

Kiekviena fazė = atskiras numeruotas commit'as pagal repo konvenciją (commit568+), su handoff įrašu ataskaitoje.

---

## 3. Fazė 0 — P0 mechanikos pataisymai

**Kodėl pirmiausia:** mechanika, kuri tyliai neveikia, yra blogiausias įmanomas game feel. Joks hit-stop to neatperka.

### 3.1 Darbai (kodas)

1. **`debuffAttack` / `debuffHealth` neperduoda `buffDuration`** (`effectEngine.ts` ~423–428). Perduoti `buffDuration` taip pat, kaip `buffAttack`/`buffHealth`. Atrakina laikinus debuff'us.
2. **`condition` netenkinama — tylus praleidimas** (`applyMappingInner`). Pridėti battle log įrašą `battleLog.conditionSkipped` (key+params: kortos vardas, metrika, op, reikšmės) — bent dev režime, geriau visada su nuosaikiu log lygiu.
3. **`buffSpellDamage` nėra `EFFECT_TYPES` masyve** (`types.ts`). Pridėti vieną eilutę — realizacija variklyje jau yra.
4. **(Jei telpa)** `curseEngine._depth` rekursijos apsauga realiai nenaudojama (`curseEngine.ts:34`) — įjungti.

### 3.2 Darbai (admin / kortų duomenys)

5. **3 negyvos prakeiksmų kortos** — perkabinti ant `onCurseDrawn`:
   - *Gazzaros žymė* (dabar `onAnyStatus` — niekada nesuveikia)
   - *Belzatoro akis* (dabar `onPlay`; papildomai `revealOwnDeck` turi rodyti aukos, ne kerėtojo kaladę — jei reikia, naudoti tinkamą target scope)
   - *Pikti liežuviai* (mapping'o iš viso nėra)
6. *Juodieji pirštai* — užpildyti tuščią `chooseOne` arba pašalinti `chooseEffect`.

### 3.3 Priėmimo kriterijai

- Laikinas debuff'as (`endOfTurn`) realiai nusiima ėjimo pabaigoje (unit testas).
- Netenkinama `condition` palieka žurnalo įrašą; esami testai žalią.
- Visos 3 prakeiksmų kortos suveikia įtraukus jas per `activateCurses` testinę kovą.
- `npm test` (arba esamas testų runner'is) žalias; jokių naujų TS klaidų.

---

## 4. Fazė 1 — Game-feel telemetrija (baseline PRIEŠ pakeitimus)

**Kodėl:** be jos visos diskusijos „ar 3.9 s per ilga" — spėlionės. Baseline turi būti užfiksuotas **prieš** fazes 2–10.

### 4.1 Darbai

`matchStats.ts` (esama infrastruktūra, 19 metrikų → pridėti 4):

1. `animationLockMsTotal` — suminis laikas per kovą, kai `actionsLocked === true` savo ėjimo metu.
2. `animationLockMsPerTurn` — vidurkis (arba siųsti total + turns, skaičiuoti serveryje/analizėje).
3. `inputToFirstFeedbackMs` — mediana nuo pointer-down ant kortos iki pirmo vizualinio atsako (fazei 2 matuoti; iki jos — nuo sužaidimo iki showcase pradžios).
4. `cinematicsSkipped` — kiek kartų žaidėjas turėjo kiną/showcase išjungtą arba praleido (jei skip mechanizmo nėra — fiksuoti settings būseną kovos pradžioje).

Siuntimas per esamą `rvn_report_match_stats(p_stats jsonb)` — **naujų lentelių nereikia**, serveris jau perduoda jsonb.

### 4.2 Priėmimo kriterijai

- Po testinės kovos payload'e matomos naujos metrikos su realiomis reikšmėmis.
- Reduced-motion režime metrikos taip pat renkamos (lock laikas ten natūraliai mažesnis — tai ir norime matyti).
- **Ataskaitoje užfiksuoti baseline skaičius** iš bent 3 testinių kovų (prieš fazes 2–10).

---

## 5. Fazė 2 — Kortų tactile sluoksnis (didžiausias ROI)

**Kodėl:** matoma šimtus kartų per sesiją; Ravenof šio sluoksnio beveik neturi.

### 5.1 Specifikacija

Visos konstantos — į `timing.ts` (`CARD_TACTILE` objektas).

| Momentas | Elgesys | Parametrai |
|---|---|---|
| Hover (rankoje) | Korta pakyla, atsiskiria šešėliu, subtilus tilt pagal cursor poziciją, kaimynės prasiskiria | lift ~10–14 px, tilt ±3°, transition 120–150 ms ease-out |
| Pointer-down | Trumpa kompresija | scale 1 → 0.97 → 1, 50–80 ms |
| Drag | Lengva inercija/lag paskui cursor | 10–20 px lag, spring arba lerp |
| Virš validaus sloto | Slotas „traukia" kortą (magnetinis snap zone), sloto highlight | snap radius ~40–60 px |
| Virš invalidaus | Raudonas pulse ant kortos/sloto + trumpas low click (ui-sound) | pulse 60–100 ms |
| Drop (validus) | Snap į vietą + mažas board impulse + esamas place SFX | snap 100–140 ms ease-out-back |
| Drop (invalidus) | Korta grįžta į ranką su spring | 200–250 ms |

### 5.2 Techninės pastabos

- Tik CSS transform/opacity + esamas React state; **jokio canvas**, jokio layout thrash (transform, ne top/left).
- Hover garsui galioja esamas 90 ms throttle.
- `prefers-reduced-motion`: tilt ir inercija išjungiami, lieka tik paprastas lift/highlight.
- Mobile (`pointer: coarse`): hover sluoksnio nėra — tik press/drag/snap.
- Nepaliesti `data-*` inkarų ir esamos drag logikos semantikos (kas yra validus taikinys sprendžia esamas kodas — čia tik vizualas).

### 5.3 Priėmimo kriterijai

- Visi 7 momentai veikia rankoje ir tempiant į lentą; invalid feedback nesuveikia klaidingai ant validžių slotų.
- 60 fps drag metu vidutiniame įrenginyje (patikrinti Performance tab, be forced reflow).
- Reduced-motion ir coarse pointer elgesys aprašytas ir veikia.
- `inputToFirstFeedbackMs` telemetrija dabar matuoja nuo pointer-down iki lift pradžios.

---

## 6. Fazė 3 — Reaction chain SFX + repeat compression

### 6.1 SFX (žinoma skola — pigiausias juice projekte)

Ataskaita tiesiai įvardija: trūksta **launch swoosh, metal impact, wrap tighten, shatter**. Garso architektūra paruošta.

1. `soundManager` registruoti 4 naujus `BattleSoundType`: `reactionLaunch`, `reactionImpact`, `reactionTighten`, `reactionShatter` (file-first `public/sounds/reaction/*.mp3` + synth fallback: swoosh = noise sweep, impact = metalinis transient, tighten = kylantis creak, shatter = triukšmo burst su decay).
2. `ReactionChainLayer` fazėse: detect→launch (`reactionLaunch`), chain pabaiga (`reactionImpact`), wrap (`reactionTighten`), effect (`reactionShatter`).
3. Mix dramaturgija (minimalus variantas): prieš `effect` fazę muzika -3 dB ~80 ms, po — atstatoma (per `musicManager` gain, ne per atskirą sistemą).

### 6.2 Repeat compression

**Paprastas modelis, be eskalacijos sistemų:** per-client, per-match flag'as `reactionSeenThisMatch` (module-level, ne game state — kaip ReactionGate).

- Pirmas suveikimas kovoje: pilna trukmė (3900 ms, gate 3200 ms).
- Vėlesni: sutrumpintos **transition** fazės — siūloma `detect 250 / chain 550 / wrap 400 / showcase 700 / effect 500` ≈ 2400 ms, gate ~1900 ms. Tikslius skaičius deklaruoti `timing.ts` kaip `REACTION_CHAIN_PHASES_COMPACT` + `REACTION_CHAIN_GATE_COMPACT_MS`.
- Kanoninis fazių **eiliškumas nekinta**; keičiasi tik trukmės.
- `prefers-reduced-motion` kelias (900 ms) lieka kaip yra.
- PvP: kiekvienas klientas kompresuoja savarankiškai — tai saugu, nes gameplay laukia savo lokalaus promise. Patikrinti, kad niekas nesikliauja bendra trukme tarp klientų.

### 6.3 Priėmimo kriterijai

- 4 nauji garsai girdimi teisingose fazėse; be mp3 failų — synth fallback veikia.
- Antra ir vėlesnės reakcijos kovoje ~2.4 s, pirma — pilna; būsena taikoma tik ties gate.
- `animationLockMsTotal` telemetrijoje matomas sumažėjimas prieš/po (užfiksuoti ataskaitoje).

---

## 7. Fazė 4 — ImpactProfile + damage severity

**Architektūrinis pagrindas fazėms 5, 7, 8, 9.** Dera su data-driven principu: dramaturgija ateina automatiškai, ne hardcode'u.

### 7.1 Duomenų modelis

`src/lib/game/impactProfiles.ts` (naujas, ~100–150 eil.):

```ts
export type ImpactSeverity = 'CHIP' | 'HIT' | 'HEAVY' | 'DEVASTATING' | 'LETHAL'

export interface ImpactProfile {
  severity: ImpactSeverity
  hitStopMs: number            // fazė 5
  targetReaction: 'none' | 'soft' | 'normal' | 'hard'   // esami unit shake lygiai
  screenShake: 'none' | 'soft' | 'hard'                  // esami board shake lygiai
  impactSound: BattleSoundType
  audioDuckDb: number          // 0 = be duck
  flash: boolean               // fazė 5
  damageNumberStyle: 'small' | 'normal' | 'big' | 'critical'
  deathStyle?: string          // fazė 9
}

export const IMPACT_PROFILES: Record<ImpactSeverity, ImpactProfile>
export function resolveSeverity(dmg: number, targetMaxHp: number, lethal: boolean): ImpactSeverity
```

### 7.2 Severity taisyklės

Skaičiuojama **po ŽMK** (galutinė žala), pagal absoliučią žalą IR santykį:

| Severity | Taisyklė (pirmas tinkantis) |
|---|---|
| LETHAL | žala nužudo taikinį |
| DEVASTATING | dmg ≥ 10 ARBA dmg/maxHp ≥ 0.8 |
| HEAVY | dmg 6–9 ARBA dmg/maxHp ≥ 0.5 |
| HIT | dmg 3–5 |
| CHIP | dmg 1–2 |

Ribas laikyti `timing.ts`/`impactProfiles.ts` konstantose — jas reikės tiuninti.

### 7.3 Integracija

- `dealToUnit`/`dealToPlayer` pabaigoje į FX magistralę siunčiamas įvykis su severity (per esamą event/battle-log kelią su `seq`, kad PvP svečias atkurtų identiškai).
- `BattleFxLayer` ir floating numbers skaito profilį: CHIP — mažas skaičius, be board shake, mažas recoil; HIT — esamas normalus; HEAVY — stipresnis shake + didesnis skaičius; DEVASTATING — hard board shake + bass transient + audio duck; LETHAL — perduodama mirties sekai.
- `effectAnimationMap` papildomas galimybe mapping'e nurodyti profilio override (pvz. `impact: 'HEAVY'`) — bet **default'as visada iš `resolveSeverity`**, kad severity veiktų ir be admin darbo.
- Audio duck: `musicManager` gain -3 dB 80 ms prieš HEAVY+/DEVASTATING impact (bendras helper'is su faze 3).

### 7.4 Priėmimo kriterijai

- 1 dmg ir 12 dmg vizualiai/garsiškai aiškiai skiriasi (video/gif ataskaitai).
- 5 dmg padarui su 6 HP duoda HEAVY (santykio taisyklė veikia).
- PvP svečias mato tą patį severity (dedupe pagal `seq`).
- Reduced-motion: shake pakopos suplokštėja iki esamo reduced elgesio.

---

## 8. Fazė 5 — Impact frame + hit-stop

**Sunkiausia techninė fazė.** Reikia „impact dirigento" — vieno taško, kuris tame pačiame kadre suveda visus sluoksnius.

### 8.1 Specifikacija

Smūgio kadre (projektilio hit momentu) vienu metu:

1. Vizualinis hit-stop pagal severity: CHIP 0–20 ms · HIT 30–40 ms · HEAVY 50–70 ms · DEVASTATING/LETHAL 70–90 ms (konstantos `timing.ts`).
2. Target scale punch: 1 → 0.94 → 1.03 → 1 (~200 ms po hold).
3. 1–2 kadrų brightness flash ant taikinio (CSS filter arba overlay).
4. Impact SFX + particles + shake (iš ImpactProfile).
5. Tik tada — HP kritimas ir damage number.

### 8.2 Techninės pastabos

- **Gameplay variklio stabdyti negalima.** Hit-stop = vizualinio sluoksnio hold: `BattleFxLayer` rAF cikle „freeze" langas (dalelės ir projektiliai nepaišo žingsnio, laiko delta kaupiamas), CSS animacijoms — `animation-play-state: paused` arba tiesiog vėlinamas jų startas, floating number ir HP update atidedami iki hold pabaigos.
- Paprasčiausias kelias: impact momentu `BattleFxLayer` emituoja `impactFrame(severity)` → visi FX žingsniai to kadro metu gauna `dt = 0` per hold trukmę; HP/number callback'ai šaukiami po hold.
- Hit-stop'ai **nesikaupia**: jei per hold atsiranda antras impact, jis prasideda po pirmojo (eilė), o ne prailgina bendrą stop.
- Reduced-motion: hit-stop = 0. Low quality tier: max 40 ms.
- Gate invariantas galioja: būsena ir toliau taikoma per esamą kelią; hit-stop tik atideda **vizualinį** HP atvaizdavimą, ne `hp` lauką.

### 8.3 Priėmimo kriterijai

- DEVASTATING smūgis aiškiai „sustoja" kadrui; CHIP — ne.
- Jokio bendro FPS kritimo (hold ≠ dropped frames; rAF toliau sukasi).
- PvP nesinchronizuoja blogai: hold per-client, žurnalo seka nepakitusi.
- Su `rvn-vfx-quality: low` ir reduced-motion elgesys pagal spec.

---

## 9. Fazė 6 — HP ghost damage bar

### 9.1 Specifikacija

- HP nukrenta iškart (po hit-stop hold), bet prarasta dalis ~300 ms lieka kaip raudonas „ghost" segmentas, tada susitraukia (~200 ms ease-in).
- Heal: analogiškas žalias/auksinis delayed fill iš apačios.
- HEAVY+ smūgis: trumpas HP konteinerio shake (±2 px, 150 ms).
- Konstantos — `timing.ts` (`HP_GHOST_HOLD_MS`, `HP_GHOST_COLLAPSE_MS`).
- Taikoma: padarų HP juostos + žaidėjo/čempiono avataro HP.

### 9.2 Priėmimo kriterijai

- Kelių smūgių serija (multi-hit) ghost'ą prailgina/sujungia, o ne mirksi.
- Reduced-motion: ghost be animacijos, tiesiog dviejų spalvų juosta 300 ms.
- Jokio layout shift — tik width/transform ant vidinių elementų.

---

## 10. Fazė 7 — ŽMK prezentacija (combat signature)

**Tikslas:** ŽMK traukimas turi tapti atpažįstamu „Ravenof momentu" — critical hit sistema.

### 10.1 Specifikacija pagal ištrauktą kortą

| Korta | Prezentacija |
|---|---|
| `+0` Ramybė | Greitas flip, be papildomo dėmesio (~250 ms) |
| `+1` / `-1` | Flip + spalvinis pulse (raudonas/mėlynas) |
| `+2` Galios protrūkis | Auksinis snap + stipresnis garsas + damage number upgrade |
| `-2` Apsauga | Mėlynas snap + „slopinimo" garsas |
| `x2` Kritinis | ~150 ms anticipation **tyla** (audio duck iki -12 dB) → card slam į centrą → bass hit → `x2` glyph ekrane → impact su DEVASTATING profiliu |
| `x0` Nesėkmė | Projektilis vizualiai „užgęsta" prieš taikinį / smūgis neįvyksta, damage number subyra, tylus „fizzle" garsas |
| Advantage / Disadvantage | **Dvi kortos** (mechanika realiai traukia 2 per `rollDamage` bias) išskrenda į šalis, pralaimėjusi išblunka, laimėjusi slam į centrą |

Po `x2`/`x0` — vizualiai parodyti **specialų reshuffle** (`zmkSpecialReshuffle`): trumpas kaladės permaišymo švysnis prie ŽMK zonos su esamu shuffle garsu. Tai mechanikos komunikacija, ne dekoracija.

### 10.2 Techninės pastabos

- ŽMK kortos flip vieta kanoninėje sekoje **nekinta** (2 žingsnis) — keičiasi tik jo išraiška.
- `x2` atveju ŽMK prezentacija ir impact severity susiriša: `resolveSeverity` gauna galutinę (jau padvigubintą) žalą, tad DEVASTATING dažniausiai įsijungs natūraliai.
- Trukmės: `+0` kelias turi likti **greitas** — routine traukimas negali pailgėti (spectacle budget!). Tik `x2`/`x0`/advantage gauna papildomus ~400–700 ms.
- Nauji garsai per `soundManager` konvenciją (`zmkCrit`, `zmkFizzle`, kandidatų failai + synth fallback).
- PvP: prezentacija driven iš žurnalo įvykio apie ištrauktą ŽMK kortą — abu klientai mato tą patį.

### 10.3 Priėmimo kriterijai

- `+0` traukimas ne ilgesnis nei dabartinis; `x2` visa seka ≤ ~1.2 s.
- Advantage rodo dvi realiai ištrauktas kortas (ne fake).
- Reshuffle po `x2`/`x0` vizualiai matomas.
- Reduced-motion: viskas suplokštėja iki paprasto flip + spalvos.

---

## 11. Fazės 8–10 (jei sprintas leidžia) ir backlog

### Fazė 8 — Statusų trigger feedback

Esamas `STATUS_VFX_REGISTRY` + `statusEvt` magistralė jau turi `apply|trigger|remove|destroy`. Darbai: paryškinti **trigger** momentus — poison tick (burbulas → -2), burn tick (kibirkštis + fire snap), **shield block** (CLANG + skilimo efektas + damage number „BLOKUOTA" vietoj 0; ŽMK net netraukiamas — tai jau taip veikia, tik parodyti), frozen atsikirtimo blokas (ice lock blyksnis), taunt bandymas rinktis kitą taikinį (metalinis pulse ant taunt padaro). Principas: **mechanika paaiškina save animacija** — žaidėjui nereikia skaityti logo.

### Fazė 9 — Mirties severity

`deathStyle` iš ImpactProfile + žalos šaltinio tipo (fire/ice/necro/holy/slash/poison — `PROJECTILE_COLOR` tipai jau žinomi): fire = užsidegimas → pelenai; ice = freeze → skeveldros; necro = sielos ištraukimas; holy = baltas išnykimas; physical = horizontalus kortos lūžis; poison = žalsvas puvimas; `x2` lethal = heavy death. **Svarbu:** dalis mirčių — tylios (shhhk → pelenai), ne viskas sprogsta. Esamas `disintegrate` lieka default fallback.

### Fazė 10 — Turn-start ritualas

Seka ≤ 600–900 ms: „TAVO ĖJIMAS" 300–400 ms → burn/poison tick'ai (jau vyksta mechaniškai — tik sinchronizuoti vizualą) → draw su whoosh → aukso skaitiklis fill su coin garsu → board ready pulse. Nepailginti realaus ėjimo starto: įvestis atrakinama kuo anksčiau, ritualas gali baigtis fone.

### Backlog (šiame sprinte NEdaryti)

- **Frakcijų motion language** — pilna versija per brangi. Jei kada nors: po 1–2 štrichus frakcijai per ImpactProfile/death style, ne atskiros animacijų sistemos.
- **Lauko kortų ambience** (ambient loop, color grading, particle environment, UI border) — gera idėja, atskiras sprintas.
- Nauji summon FX — **ne**. Jų pakanka.

---

## 12. PRIVALOMA ATASKAITA — `GAME-FEEL-REPORT.md`

Baigus darbą (arba sustojus — net jei padaryta tik dalis), repo šaknyje sukurti `GAME-FEEL-REPORT.md` **tiksliai pagal šį šabloną**. Ataskaita skirta kitai Claude sesijai ir projekto savininkui — rašyti faktus, ne marketingą.

```markdown
# GAME-FEEL-REPORT.md — įgyvendinimo ataskaita

**Data:** YYYY-MM-DD
**Commit intervalas:** commitNNN–commitNNN (išvardinti su vienos eilutės aprašais)
**Plano versija:** GAME-FEEL-HANDOFF.md (2026-08-10)

## 1. Fazių būsena

| Fazė | Būsena (DONE / PARTIAL / SKIPPED) | Commit | Pastaba |
|---|---|---|---|
| 0 P0 pataisymai | | | |
| 1 Telemetrija | | | |
| 2 Tactile | | | |
| 3 Reaction SFX+compression | | | |
| 4 ImpactProfile | | | |
| 5 Hit-stop | | | |
| 6 HP ghost | | | |
| 7 ŽMK | | | |
| 8–10 | | | |

## 2. Nukrypimai nuo plano
Kiekvienam nukrypimui: kas planuota → kas padaryta → KODĖL (techninė priežastis).
Jei nukrypimų nėra — parašyti „nėra".

## 3. Pakeisti / nauji failai
Sąrašas su vienos eilutės paskirtimi. Atskirai pažymėti naujas timing.ts konstantas
ir naujus BattleSoundType / i18n raktus.

## 4. Telemetrijos baseline ir rezultatai
| Metrika | Prieš (fazė 1 baseline) | Po (visų fazių) |
|---|---|---|
| animationLockMsTotal (vid. iš 3 kovų) | | |
| animationLockMsPerTurn | | |
| inputToFirstFeedbackMs | | |
Trumpa išvada: ar lock laikas sumažėjo, ar input feedback < 100 ms.

## 5. Testai
- Kokie unit testai pridėti/pakeisti, jų rezultatas.
- Smoke patikra: tutorial / PvE / kampanija / ranked / PvP — po vieną kovą, rezultatas.
- Reduced-motion ir rvn-vfx-quality=low patikra — kas tikrinta, kas rasta.

## 6. Žinomos problemos ir skolos
Kas liko neišspręsta, kokie edge case'ai pastebėti, kas gali regresuoti.

## 7. Rekomendacijos kitai sesijai
Konkretūs kiti žingsniai prioriteto tvarka (įskaitant fazes 8–12, jei nepadarytos,
ir severity ribų tiuningo pastabas).

## 8. Admin veiksmai (jei liko)
Ką dar reikia suvesti per admin UI rankomis (kortų mapping'ai, garsų failai į
public/sounds/reaction/ ir pan.).
```

**Papildomos ataskaitos taisyklės:**

- Jei kuri nors fazė PARTIAL/SKIPPED — §2 privalo paaiškinti kodėl ir §7 pasakyti, kaip pratęsti.
- Skaičiai (trukmės, baseline) — realūs, išmatuoti, ne nukopijuoti iš plano.
- Jei buvo sukurti migration/SQL failai — išvardinti su PENDING/APPLIED būsena.
- Atnaujinti `CHANGELOG.md` bent šio sprinto commit'ais (žinoma skola: paskutinis įrašas 2026-06-13).

---

## 13. Darbo eigos priminimai vykdytojui

1. **Prieš pradedant:** perskaityti `RAVENOF-GAMEPLAY-IR-GAME-FEEL.md` (repo šaknyje / uploads), `src/lib/game/timing.ts`, `effectAnimations.ts`, `statusVfx.ts`, `BattleFxLayer.tsx` — plano skaičiai remiasi jais.
2. **Repo vieta:** `ravenof-portal/` poaplankis — git repo yra TEN, ne prijungto aplanko šaknyje.
3. Po kiekvienos fazės — commit su numeriu (568+) ir trumpu LT aprašu; nekaupti visko į vieną milžinišką commit'ą.
4. Jei fazė užstringa > ~2 val. ant vieno techninio kliuvinio — fiksuoti PARTIAL, aprašyti kliuvinį ataskaitoje, eiti prie kitos fazės (fazės 2, 3, 6 nepriklauso nuo 4/5).
5. Severity ribos ir visos ms konstantos — pirmos versijos, skirtos tiuningui. Nedaryti jų „gražių", daryti jas **vienoje vietoje**.
