# Kovos UI asset specifikacija (mygtukai + aukso moneta)

Tikslas: visus kovos ekrano (TutorialGame / BattleLayout, landscape H layout) mygtukus pakeisti
piešiniais-assetais ir pakeisti dabartinę CSS „auksinę monetą" tikru monetos artu.

**Įkėlimo vieta repo:** `public/ravenof-ui/combat/` (nauja direktorija).

## Bendri techniniai reikalavimai

- Formatas: **PNG-32 su permatomu fonu** (galima papildomai WebP lossless — konvertuosim patys).
- **Be įkepto teksto** — visi užrašai (BAIGTI ĖJIMĄ, +100 ir t. t.) uždedami kodu (LT/EN i18n).
- Eksportas **@3x** (CSS dydis ×3) — telefonai naudoja dpr 2–3.
- Apvalūs mygtukai — kvadratinis canvas, mygtukas iki pat kraštų (šešėlį/glow piešiam CSS'u,
  arba jei norit įkeptą glow — pasakykit, pridėsiu padding į spec).
- Tempiami (stretch 100 %/100 %) elementai — dekoruoti kraštai + **vientisas vidurys**,
  kad tempiant neiškraipytų (kaip `buttons/button-primary-normal.png`).
- Stilius: patvirtinta paletė — auksas `#D4A33B`/`#F2C45A`, ink `#07060A`, raudona `#8D2D38`,
  žalia `#4F9E52`; Cinzel dvasia kaip meniu banner'iai.
- „Pressed" būsenos atskirai NEreikia — kodas daro scale/brightness.

## A. Kovos mygtukai

| # | Failas | Kur naudojama | CSS dydis | Eksportas @3x | Forma / būsenos |
|---|--------|----------------|-----------|---------------|------------------|
| 1 | `btn-end-turn-active.png` | Pagrindinis BAIGTI ĖJIMĄ (dešinė pusė, prie rankos) | **92×92** | **276×276** | Apvalus medalionas. Aktyvi (tavo ėjimas) — auksinė/žalia šviesa. Tekstas uždedamas kodu per vidurį. |
| 2 | `btn-end-turn-enemy.png` | Tas pats mygtukas priešo ėjimo metu (disabled) | 92×92 | 276×276 | Apvalus, tamsus/raudonas, „užgesęs". |
| 3 | `btn-discard-gold.png` | „+100 ⚜" piliulė (išmesk kortą → auksas) | **~84×26** (plotis tempiasi) | **252×78** | Horizontali piliulė/mini banner, dekoruoti galai + vientisas vidurys (stretch). Be teksto. |
| 4 | `btn-discard-gold-active.png` | Ta pati piliulė, kai režimas įjungtas (renkiesi kortą) | 84×26 | 252×78 | Ryškesnė / švytinti versija. |
| 5 | `btn-round-small.png` | Bendras mažų ikoninių mygtukų fonas: garsas, uždaryti ✕, žurnalas, emote | **30×30** (naudojam ir 28/32) | **96×96** | Kvadratas nusklembtais kampais arba apvalus — vienas fonas visiems, ikona uždedama ant viršaus. |
| 6 | `btn-chat-head.png` | Plaukiojantis pokalbio burbulas (PvP) | **50×50** | **150×150** | Apvalus medalionas, tuščias vidurys ikonai. |
| 7 | `btn-emote-slot.png` | Emote rato lizdai (6 vnt. aplink ratą) | **44×44** | **132×132** | Apvalus, tamsus su aukso rėmu; emoji uždedamas kodu. |
| 8 | `btn-send.png` | Pokalbio „siųsti" mygtukas | **42×42** | **126×126** | Auksinis kvadratas nusklembtu kampu (kaip SIŲSTI draugų ekrane), be ikonos. |

## B. Ikonos (dedamos ant `btn-round-small` / `btn-chat-head` / `btn-send`)

| # | Failas | Reikšmė | CSS dydis | Eksportas @3x |
|---|--------|---------|-----------|----------------|
| 9  | `ico-sound-on.png`  | Garsas įjungtas (natos)        | 16×16 | 48×48 |
| 10 | `ico-sound-off.png` | Garsas išjungtas (perbraukta)  | 16×16 | 48×48 |
| 11 | `ico-close.png`     | Uždaryti ✕ (kova, žurnalas, chat) | 16×16 | 48×48 |
| 12 | `ico-log.png`       | Kovos žurnalas (pergamentas/ritinys) | 18×18 | 54×54 |
| 13 | `ico-emote.png`     | Emote (kaukė/veidelis)         | 18×18 | 54×54 |
| 14 | `ico-chat.png`      | Pokalbis (burbulas)            | 22×22 | 66×66 |
| 15 | `ico-send.png`      | Siųsti (strėlė/plunksna)       | 18×18 | 54×54 |

Ikonos — vienspalvės/dvispalvės (auksas ant permatomo), kad tiktų ant tamsaus fono.

## C. Aukso moneta (masterinė)

| # | Failas | Kur naudojama | Rodymo dydžiai | Eksportas |
|---|--------|----------------|----------------|-----------|
| 16 | `coin-gold.png` | Aukso juosta prie avataro (22×22) · kortos kainos ženkliukas rankoje/lentoje (14–20×) · „+100" piliulė (14×14) · skraidantys „+N aukso" skaičiai · tribute/paid chip'ai | 14–22 px | **128×128** (vienas failas, mastelį keičiam kodu) |
| 17 | `coin-gold-64.png` *(nebūtina)* | Ta pati moneta, švaresnė mažiems dydžiams (jei 128 px versija „blunka" sumažinta) | ≤16 px | 64×64 |

Moneta **be skaičiaus ir be ⚜ simbolio** — tik moneta (skaičius rašomas šalia arba ant viršaus kodu).
Turi gerai skaitytis 14 px dydyje (aiškus kontūras, nedaug smulkių detalių).

## D. Nebūtina, bet suvienodintų (galima palikti CSS)

| # | Failas | Kur | CSS dydis | Eksportas |
|---|--------|-----|-----------|-----------|
| 18 | `chip-hint.png` | Targeting/užuominos piliulė ekrano apačioje („Pasirink taikinį…") | dinaminis plotis ×28 | 3-sluoksnis stretch, 84 px aukščio @3x |
| 19 | `frame-skill-row.png` | Čempiono skill pasirinkimo eilutės fonas | ~340×40 (tempiamas) | 1020×120 |
| 20 | `badge-timer.png` | Ėjimo laikmačio chip (PvP/ranked) | ~64×24 | 192×72 |

## Suvestinė dailininkui

**Minimalus paketas (viskas, ko reikia pilnam pakeitimui): #1–#16 — 16 failų.**
Pilnas paketas su „nice to have": 20 failų.

Prioritetų tvarka, jei darysit dalimis:
1. `coin-gold.png` (moneta matosi visur — didžiausias efektas)
2. `btn-end-turn-active/enemy.png` (didžiausias mygtukas ekrane)
3. `btn-round-small.png` + ikonos #9–#12
4. `btn-discard-gold(-active).png`
5. Likusieji (chat/emote/send) — tik PvP kovose

Kai assetai bus įmesti į `public/ravenof-ui/combat/` (arba atsiųsti handoff'e) —
sujungsiu juos į kovos UI vienu prisėdimu (visa logika lieka, keičiasi tik vaizdai).
