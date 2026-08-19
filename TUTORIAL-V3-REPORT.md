# TUTORIAL V3 — įgyvendinimo ataskaita

> Šaltinis: `TUTORIAL-V3-HANDOFF.md`. Įgyvendinta 2026-08-18 (vienas commit'ų blokas).
> Bazė: Tutorial v2 (commit268–270). V3 = v2 PLĖTRA, ne perrašymas.

---

## Kas padaryta (pagal fazes F1–F5)

### F1 — Prezentacijos gebėjimai (overlay)
* `src/lib/tutorial2/lessonTypes.ts` — schema praplėsta: `Dialogue.voiceId/voiceText`,
  `LessonStep.zoomLevel/arrowStyle/arrowFrom/apply`, `StepMutation`, `CompletionTrigger`
  += `{on:'inspect'}` ir `{on:'voiceDone'}`, `LessonConfig.matchStartFlow/voiceIds`,
  `ScriptedSide.curses/reactions`.
* `TutorialOverlay.tsx` — **close-up kamera**: overlay raf cikle skaičiuoja
  `transform: translate() scale()` ATSKIRAM wrapper'iui `[data-tut-zoomwrap]` ir rašo
  jį TIESIAI į DOM (jokių React perpiešimų, jokio konflikto su framer-motion /
  `rvn-field-quake`). Matematika daroma per bazinę (netransformuotą) geometriją
  (`base = (screen − t) / s`), tad grįžtamojo ryšio virpesio nėra; kraštai
  clamp'inami, kad nesimatytų tuščio lauko. Auto mastelis 1.2–2.2× pagal taikinio
  dydį; `zoomLevel` perrašo.
* **Pulsuojanti rodyklė** (`arrowStyle:'pulse'`) — 3 koncentriniai žiedai per
  `box-shadow` (scale-ne-transform kanonas).
* **Drag-path vaiduoklis** (`arrowStyle:'drag-path'`) — SVG Bezier kreivė nuo
  `arrowFrom` iki `arrowTo`, animuotas punktyras + `animateMotion` „pirštas".
* **Titrai** — burbulo apačioje pilnas ištariamas tekstas (kai `voiceText ≠ text`).
* **„Praleisti pamoką"** — patvirtinimo popup `combat-plate` rėme su asset CTA
  (`button-primary-normal.png`), tekstai per i18n.
* Reduced-motion: zoom išjungiamas visiškai, animacijos → statinis švytėjimas.

### F2 — Balso sistema
* `src/lib/tutorial2/tutorialVoice.ts` — vieno kanalo WebAudio grotuvas
  (voiceManager kanonas): lazy load + buffer cache + in-flight dedup,
  `prefetchLessonVoices()` pamokos pradžioje, `playTutorialVoice()` Promise
  išsisprendžia balsui pasibaigus, `stopTutorialVoice()` su 150 ms fade,
  `estimateReadMs()` fallback'ui. URL: `card-audio/tutorial/tut-{voiceId}.mp3`.
* `TutorialDirector` — dialogo eiga: burbulas → balsas → auto-advance po balso
  (+520 ms); bakstelėjimas burbule/„Praleisti" nutraukia švariai. **MISSING-SAFE**:
  jei mp3 dar neįkeltas arba garsas išjungtas — auto-advance pagal teksto ilgį
  (~55 ms/ženklas, 1.8–9 s) ir titrai. Klaidingas veiksmas → atsitiktinė
  `sys-wrong-*` frazė (ne dažniau kaip kas 3,5 s).
* Migracija `20260871`: `rvn_media_manifest` v3 — `card-audio/tutorial/*` failai
  įtraukiami kaip `kind='tutorial-voice', tier=1` (naujokas gauna su core paketu).

### F3 — Kortos ir L1–L3
* `supabase/migrations/20260871_tutorial_v3.sql` — 12 naujų TUT kortų
  (skydas/sėlinimas/provokacija/sprintas, aura, nuodai/ugnis/nutildymas, antras
  laukas, priešo taunt sargas, demonų šauklys), 3 prakeiksmai (`onCurseDrawn`),
  3 fazių čempionų šeima `TUT-KORVAS` (300/600/900 aukso, gebėjimai 1/2/3).
* `TutorialGame.tsx` — `TutorialHooks` += `onInspect` (hold-to-view mokymui),
  `matchStartFlow` (moneta+mulliganas TIK L8), `onApi` → `mutate()` (deklaratyvios
  `apply` mutacijos per `gateCommit`); `TutZoomWrap` wrapper'is visiems trims
  layout'ams; `data-tut="hp-ai"` (anksčiau priešo HP neturėjo savo taikinio).
* L1–L3 seed'ai pagal §4: zonų turas su close-up, aukso formulė, kortos anatomija,
  „laikai–matai", drag-to-play, iškvietimo liga, atsakomasis smūgis, mainų
  matematika, ŽMK įjungimas VIDURY pamokos (`apply.enableZmk`), ataka į veidą,
  burtai/AOE/docked peržiūra, reakcijų spąstai.

### F4 — L4–L8 + hub'as
* L4 čempionas (tribute, fazės, skill'ai), L5 artefaktai/laukas/auros,
  L6 būsenų karuselė (šaltis be atsako → apsvaigimas → nuodai/ugnis → skydas ir
  sėlinimas → provokacija → nutildymas ant tos pačios provokacijos → sprintas),
  L7 prakeiksmai (šoninė kaladė → įmaišymas → deterministinė aktyvacija),
  L8 kovos pradžia ir ekonomika (moneta, mulliganas, +100, nuovargis, rankos limitas).
* `TutorialHub.tsx` — **PERRAŠYTAS**: „Korvo kursas" (PAGRINDAI L1–L3 → EGZAMINAS →
  GILESNĖS L4–L8 su „rekomenduojama"), progresas/užraktai iš `rvn_tutorial_state`,
  starter kaladės fallback išlaikytas, `?auto=1` dabar paleidžia pirmą neįveiktą
  pamoką. **SVARBU:** iki šio commit'o `TutorialDirector` buvo NEGYVAS kodas —
  hub'as rodė tik vieną starter kovą (commit361). V3 grąžino pamokas į UI.
* `seedRebuild` — po V3 sėjimo senos v2 pamokos automatiškai `status='hidden'`
  (eilutės netrinamos — analitika išlieka).
* Migracija `20260871`: `rvn_tutorial_state` v2 — savaime susitvarkantis progreso
  perkėlimas (senos L1–L3 užbaigtos ⇒ naujos L1–L3 užbaigtos, `reward_claimed=true`,
  kad atlygis nebūtų išduotas antrą kartą).

### F5 — Įrankiai, testai, admin
* `npm run tutorial:check` — offline patikra (kortų egzistavimas migracijose,
  žingsnių pasiekiamumas, `allow` veiksmo žingsniams, voiceId unikalumas/formatas,
  drag-path pilnumas, ekrano teksto ilgis, L8-only matchStartFlow).
* `npm run tutorial:voice` — `TUTORIAL-VOICE-SCRIPT.md` + `tutorial-voice.json`
  generavimas iš seed'ų (vienintelio tiesos šaltinio).
* `tools/tutorial-voice-generate.mjs` — ElevenLabs generavimas (`--only`, `--force`)
  ir įkėlimas į Supabase `card-audio/tutorial/` (`--upload`).
* Admin `/admin/tutorial` — kiekvienos pamokos **balso eilučių sąrašas su
  „▶ perklausyti"**; nesantis failas pažymimas raudonai.

---

## Schemos pakeitimai (realūs vs planas §5)

| Planas | Realiai |
|---|---|
| `Dialogue.voiceId/voiceText` | ✅ taip pat |
| `LessonStep.zoomLevel`, `arrowStyle`, `arrowFrom` | ✅ taip pat |
| `CompletionTrigger += inspect / voiceDone` | ✅ taip pat |
| `TutorialOverlay` zoom/pulse/drag-path/titrai | ✅ taip pat |
| naujas `tutorialVoice.ts` | ✅ taip pat |
| `lessonSeeds.ts` perrašyta (8 pamokos) | ✅ + `legacyLessonSeedKeys`, `CORE_LESSON_KEYS` |
| manifestas += tutorial-voice tier 1 | ✅ per `storage.objects` (failai statiniai, ne DB lentoje) |
| TutorialGame `onInspectOpen` | ✅ pavadintas `onInspect` |
| Admin voiceId laukas + „Perklausyti" | ⚠️ voiceId redaguojamas per esamą **config JSON** lauką; pridėtas atskiras perklausos skydelis |
| — (plane nebuvo) | ➕ `LessonStep.apply` (StepMutation) + `TutorialGameApi.mutate` — be jų L2 ŽMK įjungimas, L6 karuselė ir L7 deterministinė aktyvacija būtų neįmanomi be variklio hack'ų |

---

## Voice: kiek failų, dydis, nukrypimai nuo scripto

* **87 unikalios eilutės** (84 naudojamos pamokose, įskaitant sisteminius pagyrimus,
  + 3 klaidos užuominos `sys-wrong-*`, kurias groja direktorius).
* **BALSAS SUGENERUOTAS (2026-08-18, tavo pusėje):** 88 mp3 failai — 87 reikalingi
  + vienas nenaudojamas (`sys.mp3`). Formatas patikrintas: **mono, 44.1 kHz,
  96 kbps** → **~11 MB** viso, **15,8 min** kalbos (vid. 10,8 s eilutė).
  Tai atitinka §9 rizikos sprendimą (96 kbps mono vietoj 128 kbps ≈ 16 MB).
* **Failų vardai:** rinkinys sugeneruotas be `tut-` prefikso (`l1-s01.mp3`), o
  handoff'e (§6) buvo numatytas `tut-l1-s01.mp3`. Sprendimas (commit632): grotuvas
  bando **abu** variantus — pirma `{voiceId}.mp3`, tada `tut-{voiceId}.mp3` — tad
  jokių pervadinimų nereikia ir senas formatas lieka suderinamas. `npm run
  tutorial:voice` nuo šiol rašo vardus be prefikso.
* **ĮKĖLIMAS (liko atlikti):** Supabase Storage → bucket **`card-audio`** →
  aplankas **`tutorial/`** → sudėti visus 87 mp3 (drag & drop Studio UI).
  Alternatyva CLI (reikia `SUPABASE_SERVICE_ROLE_KEY` .env.local'e):
  `node tools/tutorial-voice-generate.mjs --upload-only --dir <aplankas su mp3>`.
  Įkėlus, `rvn_media_manifest` juos automatiškai pradeda rodyti kaip
  `kind='tutorial-voice', tier=1` (tier 1 auga tik REALIAI įkeltais failais).
* Nukrypimai nuo §7 scripto:
  * L6 eilučių **tvarka** pakeista pedagogiškai (nutildymas rodomas ant TOS PAČIOS
    provokuojančios kortos — matosi, kad nutildymas nuima raktažodį). Tekstai ir
    voiceId'ai nepakeisti.
  * Kur scripte nebuvo eilutės (patvirtinimai, tarpiniai veiksmai), naudotos
    sisteminės frazės `sys-good-*`, `sys-turn-enemy`, `sys-victory`.
  * „ŽMK" tarimo pastaba (§9) galioja: balso tekstuose visur rašoma pilnai
    („Žalos Modifikavimo Kortos"), tad fonetinio hack'o neprireikė.

---

## Kas NEpadaryta ir kodėl + pasiūlymai

1. ~~**Prakeiksmų šoninės kaladės NĖRA kovos UI**~~ → **ATŠAUKTA (commit641).**
   Autoriaus sprendimas: šoninė kaladė kovoje **neturi būti matoma** (paslėpta
   informacija), o pridėtas pile'as dar ir pastūmė bei uždengė įprastą kaladę.
   Pile'as pašalintas iš visų trijų layout'ų; L7 „šešėlio" close-up grąžintas į
   savo kaladę. Lieka galioti tik commit636 antra dalis — `curseCardsAi`
   (AI naudoja SAVO prakeiksmus). Istorinis commit636 aprašas:
   Šalia ŽMK atsirado prakeiksmų šoninės kaladės pile'as (`data-tut="curses"`,
   rodomas TIK kai kaladė netuščia; visuose trijuose layout'uose). L7 „šešėlio"
   žingsnis dabar daro close-up į TIKRĄ kaladę (`anchor: 'curses-you'`), o ne į
   pagrindinę. Papildomai: variklio `curseCardsAi` (commit627 našlaitis) užbaigtas —
   AI dabar naudoja SAVO šoninę kaladę (iš `deck_cards`/`starter_deck_cards`
   `is_side_deck` eilučių), o ne žaidėjo prakeiksmus.
2. ~~**Balso failų ĮKĖLIMAS į Supabase**~~ — **PADARYTA 2026-08-18:** 87 mp3
   (10,7 MB, 0 klaidų) įkelti į `card-audio/tutorial/` per `upload-tutorial-voice.bat`.
3. ~~**Coin toss / mulligan close-up L8**~~ — **PADARYTA (commit637).** Overlay
   kamera nebe pririšta prie lentos: konteineris parenkamas PAGAL TAIKINĮ
   (`closest('[data-tut-zoomwrap], [data-tut-zoomroot]')`), o pilno ekrano scenos
   (mulliganas, moneta, visi pick'ai) gavo `data-tut-zoomroot="scene"` (mastelis
   ribojamas iki 1,55×, taikinys centruojamas aukščiau — apačioje patvirtinimo
   mygtukas). Taikinių paieška ima PASKUTINĮ atitikmenį DOM'e, tad ta pati korta
   scenoje laimi prieš tą pačią kortą rankoje po ja. L8: moneta gavo close-up
   (`anchor: 'coin'`), mulligano žingsnis — close-up į brangiausią kortą + TIKRAS
   veiksmas (`allow: [{kind:'mulligan'}]`, `complete: {on:'mulliganDone'}`).
   **Tai buvo ir BLOKUOTOJAS:** gate neturėjo 'mulligan' veiksmo, tad L8 mulligano
   patvirtinimas būtų buvęs neįmanomas.
4. **`npm run build`** cloud sandbox'e nepraeina TIK dėl `next/font` (Google Fonts
   nepasiekiami be tinklo). `npx tsc --noEmit` — švarus; Vercel'yje šito nebūna.
5. **Analitika**: step id pasikeitė (nauji žingsniai), tad senų pamokų funnel'is
   admin'e liks atskiras — palyginimui naudok tik naujus `tut-v3-*` slug'us.

---

## Taisyklių netikslumai, ištaisyti po gyvo perėjimo (commit638)

Žaidimo autoriaus patikra rado 4 klaidingus teiginius scenarijuje (§7) — visi
patvirtinti prieš variklio kodą ir ištaisyti:

| Kur | Buvo (KLAIDA) | Yra (tiesa pagal `engine.ts`) |
|---|---|---|
| `l1-s10` | „Kardas — atakos jėga" | „**Žvaigždė** — atakos jėga" (⚔ → ★ ir taisyklių puslapyje: `CardAnatomyBlock`, `CardTypeGrid`) |
| `l2-s03` | „Priešas žuvo **nespėjęs atsakyti**" | Žala kertama VIENU metu — `defRetaliates = !frozen && defAtk > 0`; mirštantis padaras **atsako**. Vienintelis, kuris ne — sušaldytas (+ close-up į savo sužeistą padarą) |
| `l2-s04` | „Kai puoli **gyvą** padarą…" | „Kai puoli padarą — jis kerta atgal, **nesvarbu, ar išgyvena**" |
| `l4-s02` | auka = 2 kortos iš rankos | auka = **2 kortos iš rankos ARBA 1 padaras nuo lentos** (`doTribute`) |
| `l4-s05` | „Spausk ant jo ir pakelk į antrą fazę" | Fazė = **atskira korta iš rankos**: auksas + auka, ir **1 fazė privalo stovėti lentoje** (`cardPhase === existing.phase + 1`) |
| `l4-s08` | „čempioną gali **NULEISTI** į žemesnę fazę" | `swapChampionPhase` veikia **TIK rankoje** (aukštesnę kortą keičia į žemesnę iš kaladės/kapinyno, kad išvis galėtum pašaukti). Lentoje stovinčio nuleisti **negalima** — fazės eina tik aukštyn |
| `l6-s04` | nuodai = tik žala kas ėjimą | nuodai = žala **IR nepalanki ataka** (`unfav = poisoned` → traukiamos 2 ŽMK, galioja blogesnė); ugnis — tik žala |

**PERRAŠYTI ŠIUOS 7 mp3** (tekstas pasikeitė; kiti 80 galioja):
`l1-s10` `l2-s03` `l2-s04` `l4-s02` `l4-s05` `l4-s08` `l6-s04`
```
node tools/tutorial-voice-generate.mjs --only l1-s10,l2-s03,l2-s04,l4-s02,l4-s05,l4-s08,l6-s04 --force --upload
```
(`--only` nuo commit638 priima sąrašą per kablelį.)

**IŠSPRĘSTA (commit639):** kanoninis yra VARIKLIS — gebėjimai atrakinami pagal
fazę (`ch.phase >= i + 1`), kaip ir mokymuose. `ChampionRulesBlock.tsx` pataisytas:
1 fazė = pirmas gebėjimas (2–3 pilki), 2 fazė = antras, 3 fazė = trečias; pridėtos
taisyklės, kad fazė keliama ATSKIRA korta iš rankos (auksas + auka, ankstesnė fazė
privalo stovėti lauke) ir kad fazės eina TIK aukštyn (keitimas į žemesnę — tik rankoje).

Perrašomų balso eilučių tekstai su failų vardais: `PERRASYTI-7-BALSO-EILUTES.md`.
**7 nauji mp3 sugeneruoti (2026-08-19)** ir padėti į `tutorial-voice-v2/` (gitignore).
Įkelti: `node tools/tutorial-voice-generate.mjs --upload-only --dir tutorial-voice-v2`.

## Korvo portretas ir kameros virpėjimas (commit640)

* **Portretas** — emoji 🐦‍⬛ pakeistas TIKRU Senojo Korvo atvaizdu
  (`public/tutorial/korvas.webp`, 512², + `@2x` 1024²). Rodomas BE apvalaus rėmo:
  kvadratas ištirpsta radialine `mask-image` kauke, dydis `clamp(84px, 11vw, 132px)`
  (buvo 46 px), portretas kyla VIRŠ burbulo (neigiama `margin-top`), o kai burbulas
  perkeliamas į viršų (`.rvn-tut-bubble-top`) — nusileidžia žemyn. Perrašoma per
  `LessonConfig.guidePortrait`.
* **Kamera nebevirpa ir nešokinėja.** Priežastis: kadrų cikle transformas buvo
  invertuojamas TIKSLINE matrica (`cam.current`), o `getBoundingClientRect()` per
  450 ms perėjimą grąžina TARPINĘ būseną → „bazė" kas kadrą kitokia → naujas
  tikslas → begalinė vytynių kilpa (chase loop). Dabar:
  1. matrica skaitoma iš `getComputedStyle(el).transform` (**tikra nupiešta**, ne tikslinė);
  2. taikinys skaičiuojamas konteinerio **vietinėje** sistemoje (`(T − C) / s`), tad
     protėvių drebėjimas (`shakeBoard`, `rvn-field-quake`) kameros nebeveikia;
  3. histerezė — perskaičiuojam tik pajudėjus >3 px arba pasikeitus masteliui;
  4. `translate3d` + `backface-visibility` (GPU sluoksnis, be sub-pikselinio virpesio);
  5. overlay state atnaujinamas tik realiai pasikeitus rect'ams (buvo `setState` kas kadrą).

---

## Gyvo perėjimo pastabos (commit641)

| Radinys | Sprendimas |
|---|---|
| Korvo portretas „nepataikė į vietą" — išlįsdavo pro burbulo rėmą | Neigiamos paraštės pašalintos: portretas visada BURBULO VIDUJE (`align-self: center`, `clamp(64px, 7.6vw, 96px)`, burbulas `overflow: hidden`). Kvadratą švelnina radialinė kaukė — apvalaus rėmo nėra |
| Kovoje atsirado prakeiksmų (šoninė) kaladė ir uždengė įprastą | Pile'as pašalintas (paslėpta informacija). L7 close-up — vėl į savo kaladę |
| Atlygio ekrano ir mokymų mygtukai nenaudojo asset'ų | VISI CTA per asset'ą (`button-primary-normal.png`): „Toliau/Praleisti", „Praleisti pamoką", „Įstrigo? Tęsti", praleidimo patvirtinimas, atlygio „Tęsti". Atlygio langas — `combat-plate` rėmas |
| Atlygiai rodyti emoji (🪙 ✦ 📦 🃏 🏆) | Pakeista į kanoninius registro asset'us per `RewardChip`/`SafeRewardImage` (emoji atlygių slotuose uždrausti — [[ravenof-reward-visuals]]); antraštėje — `emblem-tutorial.png` |

---

## SVARBU: kodėl pakeisti tekstai NEPASIRODO žaidime

Pamokų turinys gyvena **DB** (`tutorial_lessons.config`) — kodo seed'ai yra tik
šaltinis. Admin turi DU mygtukus:

* **„Įkelti / sujungti iš kodo"** (merge) — sukuria TRŪKSTAMAS pamokas ir užpildo
  TIK tuščius laukus. Jau esantį `config` (t. y. senus tekstus) **NEPERRAŠO**.
* **„Perrašyti iš kodo (reset)"** — perrašo VISKĄ iš kodo. **Būtent šito reikia
  po kiekvieno seed'ų pakeitimo** (commit638/641 tekstai, L8 mulligano žingsnis ir t. t.).

Nuo commit642 admin'as pats tai pastebi: viršuje raudonas įspėjimas „DB tekstai
ATSILIKĘ nuo kodo (N)", o prie kiekvienos nesutampančios pamokos — žyma `≠ KODAS`
ir mygtukas **„Perrašyti šią"** (perrašo tik tą vieną, neliečiant kitų).
Palyginimas atsparus raktų tvarkai (`stableStringify`), tad be klaidingų signalų.

**Eiliškumas po deploy:** 1) Vercel deploy'as su naujausiu commit'u → 2) admin →
Mokymai → **„Perrašyti iš kodo (reset)"** → 3) pamoką atidaryti iš naujo.

---

## Balsas neatsinaujina po perkėlimo (commit643)

Perrašyti mp3 keliami **tuo pačiu vardu** (upsert), o grotuvas naudoja
`cachedFetch` → cache-first `rvn-media-v1`. Todėl senas įrašas su senu tekstu
būtų grojęs **amžinai**. Sprendimas — `VOICE_CACHE_VERSION` (`tutorialVoice.ts`):
pakėlus numerį, pirmą kartą per sesiją iš `rvn-media-v1` išvalomi VISI
`/card-audio/tutorial/` įrašai, o pirmas parsiuntimas daromas su
`fetch(url, { cache: 'reload' })` — aplenkiamas ir naršyklės HTTP cache
(Supabase storage siunčia `cache-control`, tad senas failas gyventų dar valandą).
Naujas failas iškart įrašomas atgal į talpyklą (offline paketas nenukenčia).

**KANONAS: perrašius bent vieną `tutorial/*.mp3` — PAKELK `VOICE_CACHE_VERSION`.**
Dabar `2` (7 eilutės perrašytos 2026-08-19).

Patikra, ar failai tikrai įkelti (naršyklėje):
`<SUPABASE_URL>/storage/v1/object/public/card-audio/tutorial/l1-s10.mp3`

## Senojo (v1) mokymo pop-up'ai V3 pamokose (commit643)

`TutorialGame` viduje tebegyvena v1 vedimo sistema: `GUIDED_STEPS` ir „Nauja
mechanika" patarimai (`MECHANIC_TIPS` / `tipQueue`). `GUIDED_STEPS` V3 režimu jau
buvo išjungti (`stepIdx` inicijuojamas gale), o **patarimų eilė buvo likusi gyva** —
todėl gilesnėse pamokose (čempionas, artefaktai, prakeiksmai — ten, kur mechanika
„nauja") virš Korvo dialogo iššokdavo seni pop-up'ai. `queueTip` dabar grąžina
iškart, kai `tutorial.active`.

---

## commit644 — kaladžių eilė ir „nuo pirmo karto nepasideda"

**1. Prakeiksmų pile'as vis dar buvo lentoje (i18n rakto nuotėkis).** commit641 jį
pašalino iš `BattleLayout.tsx`, BET tas failas po pataisos tapo identiškas HEAD'ui,
todėl iškrito iš `git status` ir **nepateko į tar'ą** — įrenginyje liko sena
eilutė, o i18n raktas jau buvo ištrintas → apatinėje pile'ų eilėje atsirado
ketvirtas stulpelis su etikete `BATTLE.GAME.…` (neišverstas raktas) ir eilė
nustūmė/uždengė įprastą kaladę. Dabar failas pašalintas TIKRAI (ir įtrauktas į tar'ą).
**Pamoka: kai pakeitimas ATŠAUKIAMAS, failas iškrenta iš `git status` — į tar'ą jį
reikia įdėti RANKA.**

**2. Kortos numetimas.** „Ant lentos" buvo sprendžiama tik pagal
`clientY < handTop() − 10`. Horizontaliame išdėstyme tavo padarų eilė dalinai
patenka po rankos panelės viršumi, tad numetus TIESIAI ant zonos korta grįždavo į
ranką (antras bandymas, aukščiau, pavykdavo). Naujas `overOwnZone(x, y)`: numetimas
bet kur savo padarų / artefaktų / reakcijų / lauko zonoje (su 28 px atsarga, tikrinant
ir `elementFromPoint`, ir zonos rect) = sužaidimas.

---

## commit645 — pritemdytas ekranas pašalintas

Overlay visą pamoką dengė ekraną 62 proc. tamsa (SVG kaukė su „skylėmis" ties
paryškinimais). Žingsniuose BE paryškinimo kaukė neturėjo skylių — vadinasi
vientisas šydas, todėl visa kova atrodė nuolat prigesusi. Sluoksnis pašalintas:
dėmesį veda švytintys žiedai, pulsuojantys žiedai, rodyklė / drag-path ir
close-up kamera. (Jei prireiktų fokuso pojūčio — galima grąžinti ŠVELNŲ
vinjetės variantą TIK tada, kai `highlight` netuščias.)

---

## commit646 — peržiūros metu vedimo akcentai slepiami

L1 „laikai–matai" žingsnyje atidarius detalią kortos peržiūrą (z-180) mokymų
sluoksnis (z-350) liko VIRŠ jos — ant priartintos kortos toliau švytėjo rankos
kortos kontūras ir rodyklė. Dabar peržiūra pažymėta `data-inspect-overlay="full"`
(docked variantas — `"docked"`, jis lieka nepaliestas, nes atsiranda TEMPIANT ir
drag-path užuomina tada dar reikalinga), o overlay raf cikle tai pastebi ir
peržiūros metu nerodo nei žiedų, nei pulsavimo, nei rodyklės / drag-path.
Burbulas ir tikslo juosta lieka — jie netrukdo ir sako, ką daryti toliau.

---

## commit647 — L3 spąstai nesuveikdavo (o Korvas kalbėjo, lyg suveiktų)

L3 seka: ugnies burtas nudobia „Plėšrų žvėrį", po jo AOE (2 žala visiems) nušluoja
likusius du — priešo lenta TUŠČIA. Tolesnis žingsnis liepdavo priešui pulti
„Urvų padaru", kurio nebėra: `runScripted` tyliai nieko nedarydavo, ėjimas
baigdavosi, o kitas dialogas skelbdavo „ŠTAI! Spąstai užsitrenkė!".

Du taisymai:
1. **Seed:** `trap-springs` žingsnis gavo `apply: { addBoardAi: ['Urvų padaras'] }` —
   spąstams visada yra kas puola.
2. **Runtime atsparumas** (`runScripted` 'attack'): jei scenarijaus puolėjo lentoje
   nėra — imamas bet kuris galintis pulti priešo padaras; jei lenta visai tuščia —
   padaras PASTATOMAS iš kortų pool'o; nei vienu atveju jis nesirgs iškvietimo liga.
   Nepavykus — `console.warn` (nebe tyla). Analogiška commit635 'play' logikai.
3. **`tutorial:check`** naujas įspėjimas: scripted ataka, kurios puolėjo nėra nei
   `setup.enemy.board`, nei `apply.addBoardAi`, nei anksčiau sužaisto.

---

## commit648 — L4 čempiono žingsniai aiškesni

Radinys: kalbant apie čempioną buvo paryškinta VISA ranka, tad nebuvo aišku, apie
kurią kortą kalbama.

* **Nauja žingsnio galimybė `showCard`** — kalbant apie kortą ji parodoma
  DETALIOJE peržiūroje (pilnas ekranas), o žingsniui pasibaigus užsidaro.
  Naujas `TutorialGameApi.inspectCard(name | null)` (ieško rankoje → savo lentoje →
  priešo lentoje). Peržiūros metu vedimo akcentai jau slepiami (commit646).
* **L4 `tribute-rule`** dabar rodo būtent „Korvo mokinį", o ne dažo ranką.
* **L4 `summon-champ`** — paryškinta TIK čempiono korta + `drag-path` iki padarų zonos.
* **Tribute užuomina:** tempiant čempioną (arba jau renkantis auką) savi NE čempionai
  pulsuoja `rvn-bc-await` švytėjimu — matai, kas gali tapti auka, dar prieš numetant.
* L4 antros fazės žingsnis irgi gavo `drag-path` (korta → čempionas lentoje).

---

## commit649 — L6 papildyta trimis trūkusiais raktažodžiais

Autoriaus pastaba: „Būsenos ir raktažodžiai" nepaaiškino **Palaiminto**, **Kovos
šūksnio** ir **Paskutinio noro**. Pridėti trys žingsniai (L6 dabar 99 žingsniai kurse):

| Žingsnis | Kaip parodoma |
|---|---|
| `blessed` (l6-s09) | `apply` įjungia ŽMK (be jų pranašumas nematomas!), pastato šviežią padarą ir uždeda `blessed`; žaidėjas puola → mato DVIEJŲ likimo kortų traukimą ir kad galioja geresnė |
| `battlecry` (l6-s10) | į ranką įdedamas `Kovos šūksnio karys` (TUT-110) → žaidėjas iškviečia ir pats nurodo taikinį |
| `lastwish` (l6-s11) | **nauja korta** `TUT-114 Ištikimas skydnešys` (2/2, „Paskutinis noras: patrauk kortą") pastatoma prieš `Akmeninį golemą`; žaidėjas puola, skydnešys žūsta → matomas kortos traukimas. `complete: {on:'event', eventType:'lastwish'}` |

* **Migracija `20260873_tutorial_lastwish_card.sql`** (PALEISTI) — TUT rinkinyje
  nebuvo NĖ VIENOS kortos su `onDeath`, tad Paskutinio noro nebuvo kaip parodyti.
* `tutorial:check` dabar tikrina ir 20260872 + 20260873 migracijas.
* **3 nauji balso failai:** `l6-s09`, `l6-s10`, `l6-s11` (tekstai — `NAUJI-3-BALSO-EILUTES.md`).
  Senų 87 keisti nereikia.

---

## Testai

| Suite | Rezultatas |
|---|---|
| `npx tsc --noEmit` | 0 klaidų |
| `npm run tutorial:check` (naujas) | 8 pamokos, 96 žingsniai, 91 dialogas, 84 unikalūs balsai — ✓ |
| `npm run game:test:feel` | 170 / 0 |
| `npm run game:test:qa` | 43 / 0 |
| `npm run game:test:mullfat` | 34 / 0 |
| `npm run game:test:chain` | 78 / 0 |
| `npm run test:unit` (vitest) | 63 / 0 |
| `node scripts/i18n-validate.mjs` | naujų klaidų 0 (lieka 1 senas `cosmeticsStore`) |
| ESLint (nauji/paliesti failai) | 0 klaidų (TutorialGame senos klaidos — iš anksto egzistavusios) |

**Rankinis naujoko testas — DAR NEATLIKTAS** (reikia gyvos naršyklės + DB su
paleista migracija ir įsėtomis pamokomis). Priėmimo kriterijus §8.1 (2–3 žmonės)
lieka atviras.

---

## PALEIDIMO ŽINGSNIAI (būtina!)

1. **Supabase SQL Editor:** paleisti `supabase/migrations/20260871_tutorial_v3.sql`.
2. **Admin → Mokymai → „Įkelti iš kodo" (reset)** — įsėja 8 V3 pamokas ir
   automatiškai paslepia senas 5.
3. Įkelti 87 balso mp3 į Supabase `card-audio/tutorial/` (žr. „Voice" skyrių).
   Iki tol mokymai veikia tyliai su titrais.
4. Patikrinti `/digital/tutorial`: L1 → L2 → L3 → egzaminas → L4–L8.

---

## Analitikos baseline po paleidimo (7 d.)

*(pildyti po paleidimo: funnel per pamokas — `rvn_tutorial_analytics` admin'e;
stebėti `wrong_action` piką L1 „hold-to-view" ir L4 „tribute" žingsniuose.)*
