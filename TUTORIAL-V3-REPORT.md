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

* **87 unikalios eilutės** (84 naudojamos pamokose, įskaitant sisteminius pagyrimus, + 3 klaidos užuominos `sys-wrong-*`, kurias groja direktorius). Failai: `tut-{voiceId}.mp3`.
* **mp3 dar NESUGENERUOTI** — reikia tavo ElevenLabs rakto:
  1. `npm run tutorial:voice` (jau paleista — `TUTORIAL-VOICE-SCRIPT.md` repo šaknyje),
  2. `.env.local` → `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (Senasis Korvas),
  3. `node tools/tutorial-voice-generate.mjs` → `./tutorial-voice/*.mp3` (perklausyk!),
  4. `node tools/tutorial-voice-generate.mjs --upload` → Supabase `card-audio/tutorial/`.
* Numatyti nustatymai skripte: Multilingual v2, stability 0.5, similarity 0.75,
  style 0.3, speaker boost ON, speed 0.95, `mp3_44100_128`. Rizika iš §9 (~16 MB)
  mažinama: manifestas ima TIK realiai įkeltus failus, tad iki įkėlimo tier 1 neauga.
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

1. **Prakeiksmų šoninės kaladės NĖRA kovos UI** — `PlayerState.curses` nerenderuojamas,
   tad L7 „violetinės zonos" close-up nukreiptas į savo kaladę. *Pasiūlymas:* pridėti
   mažą side-deck pile'ą prie ŽMK (data-tut="curses") — 20 eilučių `BattleLayout`.
2. **Balso failai** — žr. aukščiau (reikia tavo API rakto).
3. **Coin toss / mulligan close-up L8** — dialogai rodomi VIRŠ scenų (overlay z=350 >
   coin 150 / pick 133), bet `zoom` mulligano scenoje neveikia (scena — atskiras
   portalas, ne board wrapper'yje). Konkrečios kortos paryškinimas mulligane —
   sekantis žingsnis.
4. **`npm run build`** cloud sandbox'e nepraeina TIK dėl `next/font` (Google Fonts
   nepasiekiami be tinklo). `npx tsc --noEmit` — švarus; Vercel'yje šito nebūna.
5. **Analitika**: step id pasikeitė (nauji žingsniai), tad senų pamokų funnel'is
   admin'e liks atskiras — palyginimui naudok tik naujus `tut-v3-*` slug'us.

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
3. Sugeneruoti + įkelti balso failus (žr. „Voice" skyrių). Iki tol mokymai veikia
   tyliai su titrais.
4. Patikrinti `/digital/tutorial`: L1 → L2 → L3 → egzaminas → L4–L8.

---

## Analitikos baseline po paleidimo (7 d.)

*(pildyti po paleidimo: funnel per pamokas — `rvn_tutorial_analytics` admin'e;
stebėti `wrong_action` piką L1 „hold-to-view" ir L4 „tribute" žingsniuose.)*
