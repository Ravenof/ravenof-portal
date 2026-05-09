# Changelog

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
