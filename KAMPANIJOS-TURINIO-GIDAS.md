# Ravenof — kampanijos turinio gidas
### Kaip modeliuoti kampaniją, dialogus ir asset'us (viena cutscene — iki 5 min)

Šis gidas skirtas TURINIO kūrimui jau veikiančioje sistemoje (commit650–654):
motion-comic cutscene grotuvas, in-battle trigeriai, „🕸 Srautas" flow editorius,
audio upload'as admin'e, bangos/spawn į gyvą lentą. Techninė dokumentacija —
`CAMPAIGN_MODE.md`; čia — kaip iš to padaryti gerą istoriją.

---

## 1. Kampanijos hierarchija

```
Kampanija (pvz. „Varngrado kritimas")
 └─ Skyriai / aktai (3–5)
     └─ Misijos (mazgai žemėlapyje; 6–12 per skyrių)
         ├─ PRE cutscene   (prieš kovą — kontekstas, grėsmė)
         ├─ KOVA su ⚡ trigeriais (dialogai/scenos kovos VIDURYJE)
         ├─ POST cutscene  (po pergalės — pasekmės, kabliukas kitai misijai)
         └─ FAIL cutscene  (po pralaimėjimo — trumpa, be bausmės tono)
```

Viskas modeliuojama **Admin → Kampanijos → 🕸 Srautas** skirtuke: misijos,
cutscene ir trigeriai — sujungti burbulai. Auksinės rodyklės = misijų seka,
mėlyna/žalia/raudona = pre/post/fail, violetinė = trigeris → scena.

**Ritmo taisyklė:** ilga cutscene (2–5 min) — tik skyriaus pradžioje ir pabaigoje.
Tarp misijų užtenka 30–60 s scenų arba vien in-battle dialogų. Žaidėjas atėjo
kortomis lošti; istorija — prieskonis, ne sriuba.

---

## 2. Cutscene formatai — kada kurį naudoti

| Formatas | Kur redaguoti | Kada naudoti |
|---|---|---|
| **Motion-comic** (shot-based) | Cutscene → „🎞 Motion-comic" JSON sekcija | Pagrindinės istorijos scenos: skyriaus intro/finalas, bosų pasirodymai, mirtys, atskleidimai |
| **VN žingsniai** (portretas + tekstas) | Cutscene → Žingsniai | Trumpi pokalbiai tarp misijų, FAIL scenos, in-battle inline dialogai |

Motion-comic = „Ravenof grafinės novelės puslapis, kuris tyliai pradėjo judėti":
pilno ekrano komikso kadrai, lėtas kameros stūmimas, sluoksniai, rūkas, dramatinis
apšvietimas. Jokios pilnos animacijos — iliustracija yra žvaigždė.

---

## 3. 5 minučių cutscene matematika

Vienas kadras (shot) = vienas dialogo beat'as. Beat'o trukmė ekrane:

| Elementas | Trukmė |
|---|---|
| Teksto skaitymas (1–3 sakiniai, LT ~12–20 žodžių) | 5–8 s |
| Su įgarsinimu (VO) | VO trukmė + 1–2 s |
| Kameros „kvėpavimas" (push 1.00→1.05) | vyksta lygiagrečiai, 4–8 s |
| Perėjimas tarp kadrų | 0.4–0.6 s |

**Vidutiniškai ~8–10 s kadrui.** Iš to seka biudžetas:

| Scenos trukmė | Kadrų | Dialogo žodžių (LT) | Fonų | Personažų |
|---|---|---|---|---|
| 30–60 s | 5–8 | 80–150 | 1–2 | 1–2 |
| 2 min | 12–16 | 250–350 | 2–3 | 2–3 |
| **5 min (maks.)** | **30–38** | **550–750** | **4–6** | **2–4 (+siluetai)** |

**5 minučių scenos dramaturgija (3 aktai):**

1. **Įvedimas (~1 min, 6–8 kadrai)** — establishing shot be veikėjų, atmosfera,
   pasakotojo tekstas, lėčiausia kamera. Muzika tyli/ambient dominuoja.
2. **Konfliktas (~2.5 min, 15–20 kadrų)** — veikėjai, pokalbis, pozų kaitos,
   punch-in ties atskleidimais, 1–2 lokacijos kaitos (wipe perėjimas). Muzika kyla.
3. **Kulminacija + kabliukas (~1.5 min, 8–10 kadrų)** — ink perėjimas į šoką,
   shake ties smūgiu, finalinis platus kadras su „kas toliau" užuomina. Stinger.

**Geležinės rašymo taisyklės:**
- 1 beat'as = **1–3 sakiniai**. Ilgesnę kalbą SKALDYK į kelis kadrus su pozos
  ar kameros pokyčiu — tai ne apribojimas, o kino montažas.
- Kas 4–6 kadrus keisk KAŽKĄ stambaus: lokaciją, kompoziciją, planą (wide↔close).
- Kalbėtojų kaita = kadro kaita. Nekalbantis veikėjas lieka matomas, bet pritemsta.
- `holdMs: 600–1200` po sunkių sakinių — tyla irgi kalba.
- LT tekstas ~15–20 % ilgesnis už EN — panelė prasiplečia pati, bet testuok LT.

---

## 4. Asset'ų specifikacijos

### 4.1 Vaizdai (Ravenof Stylised Gothic kryptis)

Paletė: prislopinta slyva, skalūnas, anglis, sendintas pergamentas, geležis +
frakcijos akcentas. Rim light (žvakės/mėnulis/ugnis/antgamtinė šviesa). Grafiška,
ne fotorealu, ne anime, be neono.

| Asset'as | Formatas | Dydis | Pastabos |
|---|---|---|---|
| **Fonas** (background) | WebP nepermatomas | 1920×1080, ≤400 KB | Cover-crop! Svarbu — žr. saugią zoną žemiau |
| **Vidurinis planas** (midground) | WebP/PNG permatomas | 1920×1080 | Kolonos, griuvėsiai — parallax gyliui |
| **Priekinis planas** (foreground) | WebP/PNG permatomas | 1920×1080 | Rėminantys siluetai, arkos kraštai |
| **Personažo iškarpa** (viena pozė) | PNG/WebP permatomas | ~700×1200 px (aukštis svarbiausias) | Nuo šlaunų/juosmens aukštyn, švarus kontūras |
| **Žemėlapio/misijos ikonos** | esamos sistemos | — | nekeičiam |

**Saugi kompozicijos zona (KRITIŠKAI SVARBU):** žaidimas landscape 844×390 –
1920×1080. Fonas kerpamas `cover` principu — telefone matomas tik **centrinis
~78 % pločio ir ~92 % aukščio**. Veidus, duris, langus su siluetais ir viską,
apie ką kalbama, dėk į centrinę zoną; kraštai — tik atmosferai. Teksto į fonus
NERAŠOM niekada (dialogai, vardai — tik per sistemą).

**Personažo pozų komplektas** (vienam istorijos veikėjui):

- privaloma: `neutral`
- pokalbiams: `speaking`
- pagal siužetą: `angry`, `suspicious`, `shocked`, `wounded`, `casting`, `defeated`
- specialios: `silhouette` (pasirodymui iš tolo), `closeup` (galva+pečiai stambiam planui)

Praktinis minimumas pagrindiniam veikėjui — **4 pozos** (neutral, speaking,
shocked/angry, closeup). Antraplaniui — 2 (neutral, speaking). Tas pats failas
naudojamas flip'inamas, skalinamas ir gylinamas be naujų piešinių.

**Failų vardai:** tik mažosios, be lietuviškų raidžių, brūkšneliai:
`regnaras-neutral.webp`, `regnaras-closeup.webp`, `koplycia-wide.webp`,
`koplycia-langai.webp`, `fg-arka.png`.

**Kur dėti:** `public/campaign/<kampanijos-slug>/` repo viduje (kaip
`public/cutscene-demo/`) ARBA Supabase storage — abu keliai veikia, URL tiesiog
įrašomas į JSON.

### 4.2 Audio

| Sluoksnis | Formatas | Rekomendacija | Limitas |
|---|---|---|---|
| **Muzika** (loop) | MP3 128 kbps stereo | 60–120 s loop'as, be ryškios pradžios | 10 MB |
| **Ambient** (loop) | MP3 96–128 kbps | vėjas, varnos, tolimi varpai, ugnis | 10 MB |
| **VO** (balsas, po 1 failą beat'ui) | MP3 96 kbps mono | failas per beat'ą, ne per sceną! | 10 MB |
| **SFX / stinger** | MP3, ≤3 s | šarvai, vartai, smūgis, magijos rezonansas | 10 MB |

- Keliama per **admin cutscene redaktorių** („⬆ Įkelti" prie laukų; motion-comic
  sekcijoje — biblioteka su „Kopijuoti URL"). Bucket'as ir kešavimas žaidėjo
  telefone — automatiniai, nieko papildomai daryti nereikia.
- Muzika ir ambient tarp kadrų **crossfade'ina** — nurodyk `musicUrl` tik tame
  kadre, kur takelis KEIČIASI (pvz., kulminacijoje), ne kiekviename.
- VO po failą beat'ui + `autoAdvanceAfterVoice: true` = pilnai įgarsinta scena,
  kuri pati eina pirmyn. 5 min scenai tai ~30–35 trumpi failai (po 5–9 s).
- Garsas dirba tą darbą, kurio nedaro animacija: žingsniai, varnos, vėjas
  languose — pigiausias „gyvumo" šaltinis.

---

## 5. Motion-comic JSON griaučiai (su komentarais)

Cutscene → „🎞 Motion-comic formatas" → Įterpti šabloną → pildyk:

```jsonc
{
  "version": 1,
  "musicUrl": "<intro takelis>",        // startinis; keisis kulminacijos kadre
  "ambientUrl": "<vejas-varnos.mp3>",
  "typewriter": true,
  "autoAdvanceAfterVoice": false,       // true — kai visa scena įgarsinta
  "characters": [
    {
      "id": "regnaras",
      "name": { "lt": "Vadas Regnaras", "en": "Commander Regnar" },
      "accentColor": "rgb(200,150,60)", // vardo kortelės/rėmo spalva (frakcijos)
      "poses": {
        "neutral":  "/campaign/varngradas/regnaras-neutral.webp",
        "speaking": "/campaign/varngradas/regnaras-speaking.webp",
        "closeup":  "/campaign/varngradas/regnaras-closeup.webp"
      }
    }
  ],
  "shots": [
    { // ── 1 AKTO PAVYZDYS: establishing ──
      "id": "s01",
      "background": "/campaign/varngradas/koplycia-wide.webp",
      "foreground": "/campaign/varngradas/fg-arka.png",
      "effects": [ { "kind": "fog", "intensity": 0.6 }, { "kind": "dust", "intensity": 0.4 } ],
      "camera": { "startScale": 1, "endScale": 1.06, "endY": -1.5, "duration": 7 },
      "transition": { "type": "cut" },
      "text": { "lt": "Varngrado pakraštys...", "en": "The outskirts of Varngrad..." },
      "voiceUrl": null,                 // narrator VO
      "holdMs": 500
    },
    { // ── pokalbio kadras ──
      "id": "s02",
      "background": "/campaign/varngradas/koplycia-wide.webp",
      "characters": [
        { "characterId": "hero",     "pose": "neutral",  "x": 27, "height": 82, "depth": 8 },
        { "characterId": "regnaras", "pose": "speaking", "x": 76, "height": 90, "depth": 14,
          "flip": true, "entrance": "slide-right" }
      ],
      "camera": { "startScale": 1.02, "endScale": 1.05, "startX": 1, "endX": -1, "duration": 6 },
      "transition": { "type": "fade", "duration": 420 },
      "speakerId": "regnaras",          // kiti veikėjai pritemsta automatiškai
      "text": { "lt": "…", "en": "…" },
      "voiceUrl": "<vo/s02.mp3>",
      "sfxUrl": "<sfx/sarvai.mp3>"
    },
    { // ── kulminacijos close-up ──
      "id": "s21",
      "background": "/campaign/varngradas/koplycia-close.webp",
      "characters": [ { "characterId": "regnaras", "pose": "closeup", "x": 50, "height": 100, "bottom": -6 } ],
      "tint": "rgba(120,60,20,0.08)",   // žvakių gradas
      "camera": { "startScale": 1.02, "endScale": 1.07, "duration": 5, "punchIn": true },
      "transition": { "type": "wipe-diagonal", "duration": 480 },
      "musicUrl": "<kulminacijos takelis>",  // crossfade čia
      "speakerId": "regnaras",
      "text": { "lt": "…", "en": "…" }, "holdMs": 800
    }
  ]
}
```

**Kameros ir perėjimų žodynas:**

| Priemonė | Reikšmė | Kada |
|---|---|---|
| push 1.00→1.04–1.07 / 4–8 s | dėmesio telkimas | beveik kiekvienas kadras (numatyta) |
| `punchIn: true` | staigus priartėjimas | atskleidimai, grasinimai, emocinis smūgis |
| `shake: "light"/"heavy"` | drebėjimas | TIK smūgiai, sprogimai, antgamtiniai įvykiai |
| `transition: cut` | kietas kirpimas | tos pačios lokacijos beat'ai, tempas |
| `fade` (numatytas) | švelnus | ramybė, laiko tėkmė |
| `wipe-left/right/diagonal` | komikso brūkšnis | lokacijos ar laiko kaita |
| `ink` | rašalo dėmė | šokas, siaubo atskleidimas — **1–2 kartus per sceną, ne daugiau** |

Reduced-motion režimu visa tai automatiškai virsta statiniais kadrais — nieko
papildomai daryti nereikia, bet nekurk kadro, kurio prasmė TIK judesyje.

---

## 6. In-battle dialogai (⚡ trigeriai)

Kovos vidurio istorija kuriama Srauto editoriuje: pažymi misiją → „+ ⚡ Trigeris"
→ forma (be JSON). Du veiksmo tipai:

- **Inline dialogas** (tekstas + kalbėtojas) — 1 beat'as virš kovos, žaidimas
  pauzėje. Naudok dažnai: bosų replikos, sąjungininkų šūksniai. „Pigus" turinys —
  jokių asset'ų nereikia (galima pridėti portretą).
- **Pilna cutscene** — kovą pertraukianti scena. Naudok RETAI ir trumpą (≤30 s,
  3–5 kadrai): boso fazės lūžis, sąjungininko atvykimas. Ilga scena kovos
  viduryje žudo tempą.

**Standartinis misijos trigerių rinkinys (geroji praktika):**

| Momentas | Trigeris | Veiksmas |
|---|---|---|
| 2 ėjimo pradžia | Ėjimo N pradžioje (2) | boso pasisveikinimas — inline |
| Sulošta rakto korta | Sulošus kortą (vardas) | reakcija — inline arba mini scena |
| Tavo HP ≤ 10 | HP slenkstis | sąjungininko padrąsinimas — inline |
| Priešo HP ≤ 10 | HP slenkstis (enemy) | boso desperacija — inline |
| Banga | wave `warningText` | automatinis ⚠ baneris (ne trigeris) |

Visi trigeriai `once` pagal nutylėjimą — nešaudo antrą kartą.

---

## 7. Misijos scenarijaus asset'ai (bangos, lentos, objektai)

- **Bangos** (`scenario.waves`): `exactUnits`/`unitPool` — kortų **UUID iš DB**
  (Admin → Kortos). `warningText` — baneris, `voiceLineUrl` — įgarsinimas.
  `mustClear: true` bangos — visas išnaikinus laimima.
- **Startinės lentos** (`startingBoard` / `startingEnemyBoard`) — kortų UUID +
  pusė (+ `buffs`). Padedami kovos pradžioje, gali veikti iškart.
- **Objektai** (`objectives`: gate/wall/relic/commander/convoy) — HP juostos
  HUD'e virš kovos. Vartų spaudimą kurk taisyklėmis (`damageObjective` kas
  ėjimą) — AI vartų netaiko tiesiogiai.
- `survivalTurns: N` — išgyvenai N ėjimų → pergalė.

Bangų priešams NEREIKIA atskirų asset'ų — naudojamos esamos kortos su savo
paveikslais, balsais ir efektais.

---

## 8. Gamybos konvejeris (viena misija nuo idėjos iki žaidimo)

1. **Scenarijus tekstu** (Word/paperis): logline, beat'ų sąrašas PRE scenai,
   3–5 in-battle replikos, POST beat'ai, FAIL 1–2 beat'ai.
2. **Asset'ų sąrašas iš beat'ų**: kiekvienam kadrui — fonas? pozos? SFX?
   Sugrupuok — pamatysi, kad 30 kadrų reikia tik 4–6 fonų ir ~10 pozų failų.
3. **Piešimas/generavimas** pagal §4 specifikacijas (pirmiausia fonai, tada pozos).
4. **Audio**: muzika/ambient parenkama, VO rašomas paskutinis (kai tekstas užšaldytas).
5. **Suvedimas**: Srautas → cutscene burbulai → motion-comic JSON; audio per
   upload'ą; trigeriai per formą; bangos per misijos Advanced JSON.
6. **Peržiūra**: cutscene galima žiūrėti iškart kampanijoje (draft misija) —
   placeholder'iai leidžia suvesti sceną DAR NETURINT galutinio arto: sudėk
   pilkus fonus, tekstą ir ritmą, artą pakeisi vėliau vien URL'ais.

**QA kontrolinis sąrašas prieš „active":**

- [ ] Peržiūrėta 844×390 (telefonas!) — veidai nepakliūva po dialogo panele, fonų kraštai nekritiniai
- [ ] LT ir EN tekstai telpa, EN ne tuščias
- [ ] Skip veikia ir nepalieka grojančios muzikos
- [ ] Reduced-motion režimu scena skaitosi
- [ ] VO ir tekstas sutampa žodis žodin (arba VO nėra)
- [ ] Trigeriai `once`, nešaudo dubliais
- [ ] Bangų kortų UUID teisingi (Validacijos tab'as!)
- [ ] FAIL cutscene trumpa ir be „bausmės" tono

---

## 9. Dažniausios klaidos

1. **Per ilgi beat'ai.** 5 sakinių paragrafas viename kadre = žaidėjas spaudžia
   skip. Skaldyk.
2. **Tekstas įkeptas į paveikslą.** Niekada — lokalizacija ir panelė to neatleis.
3. **Visi efektai viename kadre.** Rūkas + žarijos + magija + shake + punch-in =
   mugė, ne gotika. 1–2 efektai kadre.
4. **Ilga cutscene kovos viduryje.** Kovoje — inline dialogai; ilgos scenos
   prieš/po.
5. **Fonas 4:3 arba su svarbiu turiniu kraštuose.** Cover-crop nukirps.
6. **Vienas VO failas visai scenai.** Tada tap-to-advance išsiderina — po failą
   beat'ui.
7. **5 min scena be lokacijos kaitos.** Bent 2–3 vizualiniai „perkėlimai", kitaip
   ir geriausias artas pabosta.
