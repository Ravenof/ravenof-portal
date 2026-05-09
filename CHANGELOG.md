# Changelog

## [MVP 1B] - 2026-05-09

### Pridėta — Deck Builder
- `/deck-builder` — naujo deck kūrimo puslapis (auth required)
- `/deck-builder/[deckId]` — esamo deck redagavimo puslapis
- `/my-decks` — vartotojo deckų sąrašas su edit/delete
- `DeckFactionSelect` — frakcijos pasirinkimas (Universalus/Neutral automatiškai įtraukiamas)
- `DeckCardPool` — kortų baseinas su paieška, tipo filtru, owned-only toggle
- `DeckListPanel` — deck kortų sąrašas su +/- kiekio valdymu ir progress bar
- `DeckStats` — statistikos panel: iš viso kortų, avg auksas, retumas, tipai
- `GoldCurveChart` — aukso kainos pasiskirstymo stulpelinė diagrama
- `DeckValidationWarnings` — validacijos klaidos ir įspėjimai
- `SaveDeckButton` — išsaugojimas į Supabase su klaidos tvarkymu
- `deckBuilderStore` (Zustand) — pilnas deck builder state management
- `deck-validation.ts` — validacijos logika: copy limits, deck dydis, frakcijų lock
- Kopijų limitai: Paprastas/Magiškas/Unikalus = max 2, Epiškas/Legendinis = max 1
- Deck dydis: 30–40 kortų
- `/cards` header — navigacijos mygtukai į Mano Decks ir Deck Builder

### Pataisyta
- `CardItem.tsx` — sutvarkytas duplicate `style` prop ir `onClick?.(card)` TSX parsing bug
- `utils.ts` — rarity spalvos pagal spec: pilkas/žalias/mėlynas/violetinis/raudonas
- `middleware.ts` + `server.ts` — pašalintos `any` tipo klaidos

---

## [MVP 1A] - 2026-05

### Pridėta — Kortų Duomenų Bazė
- `/cards` — kortų tinklelis su 180 aktyvių kortų
- Filtrai: frakcija, tipas, retumas, aukso kaina min/max, paieška
- `CardItem` — 3D hover efektas su framer-motion, rarity/faction spalvos
- `OwnedToggle` — turimos kortos žymėjimas (auth required)
- `collectionStore` (Zustand) — kolekcijos state su optimistic updates
- `/login` + `/register` — Supabase auth puslapiai
- Auth middleware — apsaugoti puslapiai peradresuoja į /login

### DB struktūra
- `cards`, `factions`, `card_types`, `rarities`, `keywords`, `card_keywords`
- `user_collections` — kolekcija su RLS
- `decks` + `deck_cards` — deck builder lentelės su RLS
- Full-text search vector (`search_vector` kolona + GIN indeksas)
