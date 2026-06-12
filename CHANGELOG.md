# Changelog

## [Tutorial: Išmokyk mane žaisti] - 2026-06-12

### Pridėta

- **Taisyklių puslapis:** „Išmokyk mane žaisti" blokas su demo kalade, sugeneruota iš aktyvių DB kortų (`DEMO_DECK_TUTORIAL`)
- **Mobile:** tutorial pop-up'ai mažuose ekranuose rodomi kaip bottom sheet su max-height ir scroll'u

- **Mokomoji kova:** mygtukas „🎓 Išmokyk mane žaisti" prie kaladžių (Mano kaladės + bendruomenės kaladės puslapis)
- **Žaidimo varikliukas** (`src/lib/tutorial/engine.ts`): pilnos taisyklės — ėjimo fazės, aukso progresija (100→1000), ŽMK (20 kortų, ×2/×0 permaišymas, „nepalankiai"), zonos su limitais (padarai 5, artefaktai 2, reakcijos 3, ranka 10), raktažodžiai (Sprintas, Pasišaipymas, Magiškasis skydas, Sėlinimas, Kovos šūksnis, Paskutinis noras), būsenos (Sušaldytas, Apsvaigintas, Degantis, Apnuodytas, Nutildytas), čempionai (aukojimas, fazės, evoliucija, gebėjimai), reakcijos, lauko kortos, prakeiksmai, monetos metimas, kortų tekstų atpažinimas (žala/gydymas/traukimas/auksas/būsenos)
- **AI oponentas** (`ai.ts`): žaidžia pagal taisykles — iškvietimai, burtai su taikiniais, atakų prekybos, Pasišaipymo gerbimas, kortos išmetimas dėl aukso
- **Tutorial scenarijus** (`script.ts`): 12 vedamų žingsnių (pirmi 2 ėjimai) + 21 vienkartinis mechanikos patarimas, pasirodantis pirmąkart sutikus mechaniką
- **Dark fantasy ambient** (`ambient.ts`): sintezuota Web Audio (dronas + minoriniai pad'ai + varpai + vėjas), paiso globalaus garso jungiklio
- **UI** (`TutorialGame.tsx`): pilnas kovos laukas su zonomis, HP/auksas/žetonai, ŽMK traukimo animacija, įvykių žurnalas, kortų apžiūra (dešinys pelės klavišas), pergalės/pralaimėjimo ekranas su „Žaisti dar kartą"

---

## [Pre-production QA] - 2026-05-10

### Pataisyta

- **Events:** draft renginiai dabar grąžina 404 — nebepasiekiami tiesioginiu URL
- **Events:** `isCancelled` props daugiau nėra hardcoded `false` — teisingai atspindi `ev.status`
- **Login:** po prisijungimo respektuojamas `?next=` / `?redirectTo=` parametras (anksčiau visada siuntė į `/cards`)
- **Admin:** `event_moderator` rolė dabar nukreipiama iš `/admin/cards` į `/admin/events`
- **Vartotojo profilis:** pataisyti tekstai — `ženkleliai`, `Nėra viešų kaladžių.`, `Kolekcija tuščia.`
- **Community decks:** metadata pavadinimas `'Viešos kaladės | Ravenof'`, pataisytas tuščios būsenos tekstas
- **My decks:** metadata pavadinimas `'Mano kaladės | Ravenof'`

---

## [Mobile responsiveness] - 2026-05-09

### Patobulinta

- `/cards` — navigacijos mygtukai paslėpti mobiliuose (naudoja MobileNav)
- `/leaderboards` — lentelė dabar horizontaliai slenkama mobiliuose
- `/life-tracker` — visi mygtukai pataisyti iki minimalaus 44px tap target

---

## [ETAPAS 6] - 2026-05-09

### Pridėta — Rolių sistema

- `event_moderator` rolė — gali valdyti renginius, bet ne kortas
- `/admin/users` — admin gali keisti vartotojų roles
- Admin layout leidžia `admin` ir `event_moderator`

---

## [ETAPAS 5] - 2026-05-09

### Pridėta — Community deck komentarai

- Komentarų sistema `/community-decks/[id]`
- `deck_comments` lentelė su RLS
- Realaus laiko atnaujinimas

---

## [ETAPAS 4] - 2026-05-09

### Pridėta — Kortų detalių puslapiai

- `/cards/[id]` — pilna kortos informacija, lore tekstas, statistikos
- Kortos hover preview deck builder'e

---

## [ETAPAS 3] - 2026-05-09

### Patobulinta — Deck Builder filtrai

- Papildomi filtrai kortų pool'e: tipas, retumas, aukso kaina
- Universal/Neutral kortų toggle
- Hover preview kortų pool'e

---

## [ETAPAS 2] - 2026-05-09

### Pridėta — Kolekcijos valdymas

- `/my-cards` — turimos kortos su kiekio valdymu
- Galimybė pašalinti kortas iš kolekcijos

---

## [ETAPAS 1] - 2026-05-09

### Pataisyta — Lietuviški deck pavadinimai

- Deck builder ir my-decks UI tekstai pervadinti į lietuvių kalbą

---

## [MVP 5B / User Hub] - 2026-05-09

### Pridėta

- `/me` — nukreipimas į vartotojo profilį
- `/my-events` — savo registracijų sąrašas
- `/profile/settings` — privatumo nustatymai (kas matoma viešame profilyje)
- Privacy toggle'ai: lygis, ženkleliai, renginiai, deckai, kortos, profiliai, lyderiai lentelė

---

## [MVP 4B / XP + Rangai + Ženkleliai] - 2026-05-09

### Pridėta

- XP sistema: veiksmai suteikia XP (registracija, renginiai, deck sukūrimas)
- Lygiai ir rangai: `rank_rules` lentelė su lygių slenkstiais
- Ženkleliai: `badges` + `user_badges` su automatiniais triggeriais
- `UserRankCard` — rango kortelė su spalvomis
- `XPProgressBar` — progreso juosta iki kito lygio
- `BadgeGrid` + `BadgeItem` — ženklelių tinklelis
- `/leaderboards` — top žaidėjai pagal XP ir lygį
- Vartotojo profilis atnaujintas: lygis, rangas, ženkleliai, kolekcija

---

## [MVP 4A / Events] - 2026-05-09

### Pridėta — Renginiai

- `/events` — renginių sąrašas su statusų filtrais
- `/events/[id]` — renginio detalės ir registracija
- `EventRegisterButton` — registracija/atšaukimas su real-time atnaujinimu
- `/admin/events` — renginių kūrimas, redagavimas, statusų valdymas
- `events` + `event_registrations` lentelės su RLS
- Statusai: draft / published / cancelled / completed
- Talpos valdymas ir vietų skaičiavimas

---

## [MVP 2] - 2026-05-09

### Pridėta — Community Decks

- `/community-decks` — vieši deckai su sortavimu (score/naujausi) ir frakcijos filtru
- `/community-decks/[id]` — deck detalės: kortų sąrašas, gold curve, vote widget, copy mygtukas
- `/users/[username]` — viešas vartotojo profilis su jo public deckais
- `VoteWidget` — upvote/downvote (+1/-1) su optimistic update ir toggle off
- `CopyToDeckButton` — nukopijuoja public deck į savo private deckus
- `CommunityDeckCard` — deck kortelė community sąraše
- `ReadOnlyDeckList` — read-only kortų sąrašas grupuotas pagal tipą
- Visibility selector deck builder'e: Private / Unlisted / Public
- Duplicate deck mygtukas `/my-decks` puslapyje

### Deck Builder polish (MVP 1B)

- Validity status badge (Invalid / Almost ready / Valid)
- Geresnė Gold Curve: aukštesni stulpeliai, count etiketės, total kortų
- Deck List Panel: grupavimas pagal kortų tipą, always-visible remove mygtukas
- "Clear deck" su inline confirm
- Mobile layout: kortų baseinas viršuje (55vh), deckas apačioje (45vh)

### DB pakeitimai

- `profiles` — automatiškai kuriamas registracijoje, back-fill esamiems vartotojams
- `deck_votes` — balsai (UNIQUE per user+deck, CHECK vote IN (-1,1))
- `decks.score` — sinchronizuojamas per trigger po kiekvieno vote
- RLS: public deckai matomi visiems

---

## [MVP 1B] - 2026-05-09

### Pridėta — Deck Builder

- `/deck-builder` — naujo deck kūrimo puslapis (auth required)
- `/deck-builder/[deckId]` — esamo deck redagavimo puslapis
- `/my-decks` — vartotojo deckų sąrašas su edit/delete
- `DeckFactionSelect` — frakcijos pasirinkimas
- `DeckCardPool` — kortų baseinas su paieška, tipo filtru, owned-only toggle
- `DeckListPanel` — deck kortų sąrašas su +/- valdymu ir progress bar
- `DeckStats` — statistikos panel
- `GoldCurveChart` — aukso kainos pasiskirstymo diagrama
- `DeckValidationWarnings` — validacijos klaidos
- `SaveDeckButton` — išsaugojimas į Supabase
- `deckBuilderStore` (Zustand) — pilnas deck builder state
- `deck-validation.ts` — validacijos logika
- Deck dydis: 30–40 kortų, kopijų limitai pagal retumą

---

## [MVP 1A] - 2026-05

### Pridėta — Kortų Duomenų Bazė

- `/cards` — kortų tinklelis su 180 aktyvių kortų
- Filtrai: frakcija, tipas, retumas, aukso kaina, paieška
- `CardItem` — 3D hover efektas, rarity/faction spalvos
- `OwnedToggle` — turimos kortos žymėjimas
- `collectionStore` (Zustand) — kolekcijos state
- `/login` + `/register` — Supabase auth
- Auth middleware

### DB struktūra

- `cards`, `factions`, `card_types`, `rarities`, `keywords`, `card_keywords`
- `user_collections`, `decks`, `deck_cards`
- Full-text search vector
