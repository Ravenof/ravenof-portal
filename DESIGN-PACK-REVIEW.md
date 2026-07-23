# Ravenof UI Asset Pack v1 — peržiūra ir suderinimas su projektu

Peržiūrėta: `Ravenof_UI_Asset_Pack_v1` (71 failas) + palaidi Figma eksportai (kortų tipai,
retenybės, personažai). Lyginta su realiu `/digital` app funkcionalumu (kodas + DB).

## Bendras vertinimas

Stilius stiprus ir vieningas — „stylised gothic" kryptis tinka projektui, sigilai ir
ikonos aiškiai skaitosi mažuose dydžiuose. Naming'as (kebab-case be diakritikų) ir
`design-tokens.json` + 9-slice dokumentacija — labai geras pagrindas. Didžioji dalis
turinio tiesiogiai atitinka realų funkcionalumą. Yra keli KRITINIAI techniniai
neatitikimai, kuriuos reikia ištaisyti prieš integraciją.

---

## 1. KRITINIAI neatitikimai (blokuoja integraciją)

### 1.1 Orientacija — app yra LANDSCAPE
Visas `/digital` app (meniu ir kova) veikia **landscape režimu su orientation lock**.
Pack'e:
- `art/backgrounds/*` — 1080×1920 (portrait) ❌
- `art/modes/*` — 1080×1440 (portrait) ❌

**Reikia:** landscape versijų (1920×1080 backgrounds; modes ~1600×900 su „ramia" apatine
juosta tekstui kairėje arba apačioje). Portrait versijos gali likti web fallback'ui.

### 1.2 Kortos nugarėlės proporcija
Žaidime kortos renderinamos **3:4** (aukštis = plotis × 4/3). `card-back-classic.png`
yra 768×1152 = **2:3** — deck'uose ir rankoje bus karpoma arba tampoma.
**Reikia:** 3:4 (pvz. 768×1024), tas pats ornamentas.

### 1.3 Trūksta antros nugarėlės — PRAKEIKSMŲ/REAKCIJŲ
UI naudoja dvi nugarėles: `plain` (įprasta kaladė) ir `curse` (prakeiksmų side-deck,
reakcijų zona — violetinė tamsi). Pack'e tik viena.
**Reikia:** `card-back-curse.png` (3:4, violetinė-tamsi variacija).

### 1.4 Trūksta Kampanijos mode art
Žaidime yra 4 režimai: Ranked, vs AI, Friendly PvP ir **Kampanija** (story mode su
skyriais — live funkcionalumas). **Reikia:** `mode-campaign.png` ta pačia stilistika.

---

## 2. Kas sutampa su realiu funkcionalumu ✓ (patvirtinta)

| Sritis | Pack | Projektas | Statusas |
|---|---|---|---|
| Frakcijos | 8 + Universalus | 8 frakcijų DB + neutral | ✓ slugai sutampa su DB (`demonu-orda`…) |
| Valiutos | silver / rubies / essence | Sidabras + rubinai + esencija (economy v2) | ✓ |
| Navigacija | 5 ikonos | Pradžia/Kolekcija/Kaladės/Parduotuvė/Daugiau | ✓ |
| Rangai | bronze/silver/gold | `MEDAL_TIERS = ['bronze','silver','gold']` | ✓ |
| Retenybės (loose) | 5 PNG | paprastas→legendinis (5) | ✓ |
| Kortų tipai (loose) | 7 PNG | unit/spell/artifact/reaction/field/champion/curse | ✓ |
| Daily quest token | yra | daily quests sistema live | ✓ |

Loose Figma eksportus („Property 1=….png") prašom įtraukti į pack'ą su naming
konvencija: `identity/card-types/type-creature.png`, `identity/rarities/rarity-legendinis.png`.

---

## 3. Spalvų tokenų suderinimas (sprendimas reikalingas)

Kodas šiandien naudoja savo paletę; dizainerio tokenai skiriasi:

| Tokenas | Pack | Kode dabar |
|---|---|---|
| Auksas (akcentas) | `#C6A14F` antiqueGold | `--gold: #f0b429` (ryškesnis) |
| Fonas | `#110E16` ink / `#1B1521` surface | `#0d0a14` / `#14101e` |
| Esencija | `#8152A8` | violetinės įvairios (`#a78bfa` UI) |

Frakcijų spalvos pack'e taip pat skiriasi nuo kodo `FACTION_FX` paletės (ji naudojama
IR kovos efektams — projektilų/dalelių spalvoms).

**Rekomendacija:** priimti dizainerio paletę kaip kanoninę CHROME'ui (meniu, panelės,
mygtukai), bet kovos FX paletę palikti ryškesnę (efektams reikia didesnio sodrumo ant
tamsaus fono). Sprendimą užfiksuoti tokens faile dviem sluoksniais: `chrome.*` ir `fx.*`.

## 4. Techninės rekomendacijos

1. **Formatai/svoriai:** backgrounds 2.2 MB ir card back 1 MB PNG — per sunkūs
   (Supabase egress limitai, mobile tinklas). Prašom tiekti **WebP** (arba mes
   konvertuosim per `tools/optimize-media.mjs`): backgrounds ≤ 350 KB, kitkas ≤ 150 KB.
2. **9-slice:** web'e naudosime CSS `border-image` — insets tinka; mygtukams papildomai
   prašom **SVG** variantų (ateičiai — įvairūs pločiai be raster artefaktų).
3. **Ikonų dydžiai:** nav 96×96 ✓; currencies 96×96 ✓; faction 256×256 ✓ — visi ok.
4. **Avatarai:** 512×512 ✓, bet kovoje portretas rodomas KVADRATINIAME ornate rėme su
   HP skydu apačioje (`frame.png`). Jei norime vieningo stiliaus — žr. backlog 5.3.
5. **Booster'iai:** parduotuvėje yra frakciniai boosteriai (frakcijų apribojimai per
   `pack_factions`). Vieno generinio `booster-pack.png` neužteks — reikia šablono su
   frakcijos sigilo/spalvos slotu arba 8 variantų.

## 5. Trūkstamų asset'ų backlog (prioritetų tvarka)

1. **Landscape backgrounds + modes** (žr. 1.1) — blokuoja.
2. **Card back 3:4 + curse back** (1.2–1.3) — blokuoja.
3. **`mode-campaign.png`** (1.4).
4. **Kovos avataro rėmas** — kvadratinis ornate rėmas su vieta HP apačioje
   (pakeis dabartinį `frame.png`; PNG su permatomu vidiniu langu ~24.5% inset).
5. **Frakciniai booster art** (šablonas arba 8 vnt.).
6. **ZMK kortos** — 7 vnt. (+0, +1, −1, +2, −2, ×2, ×0), 2.5:3.5 ratio, DB-driven.
7. **Season pass / progresijos elementai** — tako mazgai, lygio ženkliukai
   (daily progression v2 UI live).
8. **Pergalės/pralaimėjimo ekrano ornamentai** (🏆/💀 dabar emoji — reikia rėmų).
9. **Empty-state iliustracijos** (tuščia kolekcija, tuščios kaladės, nėra draugų).

## 6. Integracijos pastabos (mūsų pusė)

- Projektas jau turi `ui3 + icons` asset sistemą su `PageHero` — pack'o backgrounds ir
  panelės bus integruojamos per ją, todėl failų struktūrą laikysim `public/ui3/pack/`.
- Pressed būsenos: naudosim `translateY(2px)` kaip dokumentuota ✓.
- Visi pavadinimai su diakritikais („Property 1=Šviesos Pulkas.png") turi būti
  pervadinti į kebab be diakritikų (kaip pack'o viduje jau daroma teisingai).

---

*Parengta pagal kodą: `/digital` landscape lock, `MiniCard` 3:4, `PileBack plain|curse`,
`MEDAL_TIERS`, economy v2 valiutos, `pack_factions`, kampanijos režimas, `FACTION_FX`.*

---

# PRIEDAS: pilna registracijos ir įvedimo į žaidimą logika

Kad dizainas matytų visą naujo žaidėjo kelią ir kur reikės vizualų. Visi keliai —
`/digital/*`, app veikia landscape, LT/EN kalbos (i18n).

## A. Autentifikacija

1. **Registracija** — `/digital/register`: el. paštas + slaptažodis (Supabase Auth).
2. **Prisijungimas** — `/digital/login`; **slaptažodžio atstatymas** — `/digital/forgot-password`.
3. Po sėkmingos registracijos/prisijungimo žaidėjas patenka į Hub (`/digital`), bet jį
   pasitinka **onboarding vartai** (žr. B) — kol nepraeita, meniu neprieinamas pilnai.

## B. Onboarding vartai (pirmas paleidimas)

Būsena saugoma `profiles.digital_onboarded_at`:
- `anon` → rodomas login/register
- `pending` → nukreipiama į `/digital/onboarding`
- `done` → įleidžiama į Hub
- `unknown` (tinklo/DB klaida) → įleidžiama be blokavimo (fail-open, kad nebūtų softlock)

## C. Starter onboarding — 2 žingsniai (`/digital/onboarding`)

**1 žingsnis — kaladės pasirinkimas.** Rodomos kelios starter kaladės (DB
`starter_decks` + `rvn_get_starter_deck_cards` RPC). Kiekvienai matosi frakcija, kortų
sąrašas su artais/statais. Pasirinkus — `claimStarterDeck`: kortos įrašomos į žaidėjo
kolekciją ir automatiškai sukuriama pirmoji kaladė.

**2 žingsnis — žaidėjo avataro pasirinkimas.** Iš kosmetikos (`kind=avatar`): rodomi
turimi + default avatarai (užrakinti — vėliau per shop/progresiją). Avataras kovoje yra
HP taikinys (portretas ornate rėme) ir turi balsus (fightStart/hit/defeat/victory…).

**Po abiejų žingsnių** žaidėjas iškart metamas į **pirmą mokomąją kovą**, kurioje AI
priešininkas žaidžia TIKRA kita starter kalade (`opponentStarterId`) — ne dirbtiniu
scenarijumi.

## D. Tutorial sistema (5 pamokos)

Data-driven (DB lessons + „director" + overlay): Tutorial Hub ekranas su 5 pamokų
progresu. Pirmoji kova — guided žingsniai (highlight'ai + reikalaujami veiksmai:
sužaisk kortą, atakuok, baik ėjimą…). Analitika sekama per įvykius. Dizainui aktualu:
pamokų kortelės Hub'e, žingsnių popup/highlight stilius, pabaigos apdovanojimo ekranas.

## E. Pirmųjų sesijų kilpa (retention)

1. **Welcome reward** popup pirmą kartą įėjus į Hub.
2. Po kiekvienos kovos — **match XP** (`rvn_report_match`) ir, jei pakilo lygis —
   **level-up šventės ekranas** pergalės modale (atlygiai: sidabras/esencija/rubinai/pakai).
3. **Next-action CTA** Hub'e (kas toliau: pamoka → practice → ranked).
4. **Empty states** (tuščia kolekcija/kaladės) su nukreipimu.
5. **Return notifications** (Android per Capacitor LocalNotifications).
6. **Daily kilpa:** login streak, dienos užduotys (7 d. juosta), season pass takas,
   dienos kortų pasiūla (daily deal) parduotuvėje.

## F. Aktyvi kaladė ir deck select

- Žaidėjas visada turi **vieną globalią aktyvią kaladę** (`profiles.active_deck_id`).
- Kaladė gali turėti **prisegtą avatarą** (`decks.bound_avatar`) — kovoje naudojamas
  jis, kitaip default žaidėjo avataras.
- Visi kaladžių/avatarų selektoriai UI naudoja **HorizontalFocusCarousel** komponentą
  (horizontali karuselė su fokusu per vidurį) — nauji ekranai privalo naudoti jį patį.
- Prieš kovą atskiro „deck select" ekrano NĖRA — naudojama aktyvi kaladė; ją keisti
  galima Hub'e arba `/digital/decks`. Jei kaladė netinkama — CTA į deck builder.

## G. Kovos režimai (iš Hub)

| Režimas | Kelias | Logika |
|---|---|---|
| Mokomoji / practice | `/digital/tutorial`, `/digital/pve` | Lokalus AI, tutorial hooks |
| Kampanija | `/digital/campaign` | Skyriai iš DB, kovos per tą patį variklį, progresas saugomas |
| Ranked | `/digital/ranked` | 150 žingsnių rank modelis (bronze/silver/gold medaliai), 20 žaidėją imituojančių botų, server-authoritative RPC |
| Draugiška PvP | `/digital/pvp` | Realtime (Supabase broadcast), host-authoritative, svečias mato apverstą perspektyvą |

Visos kovos naudoja tą patį variklį ir tą patį kovos UI (landscape, Hearthstone tipo
ranka su drag-to-play).

## H. Kur šiame flow reikės dizaino (susiejimas su backlog'u)

- Onboarding 2 žingsnių ekranai: kaladžių kortelės + avatarų karuselė (fonai, rėmai).
- Tutorial Hub pamokų kortelės ir progreso indikatorius.
- Welcome/level-up/pergalės modalai (dabar minimalistiniai — reikia ornamentikos).
- Login/registracijos ekranų fonai (landscape!).
- Daily quest juosta, streak ir season pass takas.
- Next-action CTA kortelės Hub'e.

---

# PRIEDAS 2: kovos ekrano (tutorial + main game) specifikacija dizainui

Tutorial ir visi kovos režimai naudoja TĄ PATĮ ekraną ir komponentus. Landscape,
telefonui „į plotį". Žemiau — kas kur yra, kas PRIVALO išlikti ir ką galima keisti.

## 1. Dabartinis layout (landscape)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Emoji/  ]  [Priešo ranka – vėduoklė nugarėlėmis]  [PRIEŠO AVATARAS + HP] │
│ [Log      ]                                        [Priešo: kaladė | kapi-│
│ [juosta – ]  ┌── PRIEŠO PADARŲ EILĖ (5–10 slotų) ─┐ [nynas | ŽMK skaitl.] │
│ [pask.    ]  │  kortos su statais/statusais       │                       │
│ [įvykiai  ]  └────────────────────────────────────┘ [LAUKO korta (slotas)]│
│ [su       ]  ── skirianti linija / TAVO ĖJIMAS ──   [BAIGTI ĖJIMĄ (didelis│
│ [thumb-   ]  ┌── TAVO PADARŲ EILĖ (5–10 slotų) ───┐  mygtukas)]           │
│ [nail'ais]│  │                                    │ [Auksas + „+100"      │
│ [Prakeiks-]  └────────────────────────────────────┘  (discard už auksą)]  │
│ [mų/reakc.]                                         [TAVO AVATARAS + HP]  │
│ [nugarėlės]  [TAVO RANKA – Hearthstone vėduoklė]    [Tavo: kaladė|kapiny- │
│              [veidu, persidengianti]                 nas|ŽMK skaitliukai] │
└───────────────────────────────────────────────────────────────────────────┘
```

Padarų eilės slotai fiksuoti (žuvus kortai slotas lieka tuščias — kiti nešoka į šoną).
Lauko korta pakeičia arenos foną (FieldEffectConfig.backgroundUrl + „quake" efektas).

## 2. INVARIANTAI — funkcionalumas, kuris NEGALI dingti

### Rankos interakcijos
- **Drag-to-play**: korta tempiama iš rankos ant lentos → sužaidžiama. Gestų logika:
  horizontalus judesys rankoje = rankos scroll (pan-x), vertikalus = drag pradžia.
  Tempiant taikinio reikalaujančią kortą — pašvinta teisėti taikiniai.
- **Tap-expand**: bakstelėjus ranką — ji išsiskleidžia (padidėja kortos peržiūrai).
- **Long-press / right-click** ant bet kurios kortos → pilna kortos peržiūra (inspect).
- **Discard už auksą**: mygtukas „+100" → pasirenki kortą iš rankos → ji išmetama, gauni
  100 aukso (1×/ėjimą).
- Kortos kaina rodoma DINAMINĖ (`effectiveCost` — nuolaidos/laukai), neįperkamos pritemsta.

### Taikymosi (targeting) režimai — visi su vizualiu highlight + kursoriaus etikete
1. **Ataka**: bakstelk savo padarą → pašvinta teisėti taikiniai (taunt priverstinis) →
   bakstelk taikinį. ARBA drag nuo padaro iki taikinio (rodyklė).
2. **Burtas single**: pasirink taikinį → „✓ Gerai / ✕" patvirtinimo juosta apačioje.
3. **Burtas multi (N taikinių)**: žymi kelis (rodo X/N), patvirtinimo juosta.
4. **Battlecry pending**: special-summon kovos šūksnis laukia taikinio — korta švyti,
   spaudi ją, tada taikinį.
5. **Lastwish pending**: Paskutinis noras su rankiniu taikiniu — juosta „🕯 …X/N" +
   pasirinkimas ant lentos (veikia ir per priešo ėjimą; AI tuo metu pauzuojamas).
6. Avataras — taikinys, kai leidžiama (pažymimas raudonu rėmu).

### Pop-up'ai (visi blokuoja AI, kol žaidėjas pasirenka)
`pendingSummon` (pasirink kortą iškvietimui), `pendingPeek` (peržiūrėk N → išmesk K),
`pendingChoice` („pasirink 1 iš kelių" efektas / tutor), `pendingCopy` (kapinyno efekto
kopijavimas / Paskutinio noro aktyvavimas — kortų tinklelis), `pendingReveal` (kaladės
viršus), `pendingReturn` (grąžink padarą į ranką), čempiono fazės keitimo pasiūlymas,
čempiono skill popup, tribute/sacrifice pasirinkimas.

### Kiti privalomi elementai
- ŽMK sistema: traukimo animacijos (roll'as su 2 kortom / chip'ai prie taikinių),
  skaitliukai prie kaladžių.
- Prakeiksmų side-deck ir reakcijų zona (nugarėlės; savo reakcijas gali peržiūrėti).
- PvP: ėjimo laikmatis (120 s), „chat head" burbulas, varžovo present/AFK indikacija.
- Kovos log'as: paskutinio įvykio juosta + pilno log'o panelė (atsidaro), su kortų
  thumbnail'ais. SVARBU: log'as atskleidžiamas SINCHRONIŠKAI su FX (spoiler guard).
- Avataro long-press → avataro inspect; tap → „selected" balso frazė.

## 3. FX / animacijų sistema (visa turi likti veikianti)

Sekos tvarka (nekeičiama): **kortos showcase** (burtas/prakeiksmas/reakcija atskrenda į
centrą ~40% ekrano, ~1.9 s skaitymui) → **ŽMK traukimas** → **projektilai** (po vieną
KIEKVIENAM žalos taikiniui; elementiniai: ugnis/ledas/žaibas/strėlė/nuodai/nekro/curse/
gydymas) ARBA **zoninis AoE** (tik tikram AoE — ribojamas paveiktai pusei, be projektilų;
elementinės bangos) → **žala/HP kritimas** (hpHold — HP nekrenta anksčiau) → mirtys
(kortos sprogimas → šukės į kapinyną).

Kiti sluoksniai: summon burst (22 pilno ekrano iškvietimo efektai), premium kino
pop-up (WebM cinematics 16/9 ~70% ekrano), statusų VFX ant kortų (apply/loop/end —
canvas particle: skydas/degimas/šaldymas/nuodai/tyla/stun), kortų traukimo skrydis
kaladė→ranka (priešui nugarėlė), grąžinimo/shatter skrydžiai, level-up šventė,
finalinė seka (final blow → +1 s avataro sprogimas šukėmis + defeat frazė → +2 s
pergalės ekranas + victory frazė).

## 4. Techniniai inkarai, kurių dizainas NEGALI pašalinti

FX pozicionavimas remiasi DOM atributais — perdarant markup'ą jie privalo išlikti ant
atitinkamų elementų:
`data-unit-uid` (kiekviena lentos korta), `data-artifact-uid`, `data-player="you|ai"`
(avatarai), `data-pile="deck-you|deck-ai|hand-ai|reactions-you|reactions-ai"`,
`data-tut="hand|hp|gold|reactions|units-you|units-ai|discard-gold"` (tutorial
highlight'ai + AoE zonos), `data-fx-root` (board šaknis — shake), `data-fx-board`
(lentos centras FX'ams).

## 5. Ką galima LAISVAI keisti

- Šoninių panelių išdėstymas (log, pile'ai, mygtukai) ir jų stilius.
- Lauko/avataro/pile vizualiniai rėmai, fonai, ornamentai (pagal pack stilistiką).
- „Baigti ėjimą", aukso, skaitliukų formos.
- Slotų placeholder'ių, skirtuko „TAVO ĖJIMAS", toast'ų stilius.
- Popup'ų apipavidalinimas (išlaikant turinį ir pasirinkimo mechaniką).
- Spalvinė sistema pagal tokens (žr. sk. 3 pagrindiniame dokumente).

Rekomendacija dizainui: pradėti nuo statinių būsenų (board + ranka + paneliai),
tada popup'ai, o FX sluoksnių NELIESTI — jie prisitaikys prie naujų pozicijų
automatiškai per data-atributus.
