# Ravenof Companion Portal

Web companion portalas Ravenof kortų žaidimui. Next.js 15 + Supabase.

## Paleidimas

```bash
npm install
npm run dev
# http://localhost:3000
```

## Env kintamieji

Sukurk `.env.local` faila projecto šakninėje direktorijoje:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Tech stack

- **Next.js 15** (App Router, server components)
- **Supabase** (PostgreSQL, Auth, RLS)
- **Zustand** — client state (collection, deck builder)
- **Tailwind CSS** + CSS variables (dark fantasy tema)
- **Framer Motion** — kortų 3D hover animacijos
- **TypeScript** strict mode

## Supabase lentelės

| Lentelė | Aprašymas |
|---|---|
| `factions` | Frakcijos |
| `card_types` | Kortų tipai |
| `rarities` | Retumai |
| `keywords` | Raktažodžiai |
| `cards` | Pagrindinė kortų lentelė (180+ kortų) |
| `card_keywords` | M2M: kortos ↔ raktažodžiai |
| `user_collections` | Vartotojo turimos kortos (RLS) |
| `decks` | Vartotojo deckai su visibility ir score (RLS) |
| `deck_cards` | Deck kortų sąrašas su kiekiu (RLS) |
| `profiles` | Vartotojų profiliai (auto-kuriami registracijoje) |
| `deck_votes` | Upvote/downvote sistema (RLS) |

## Puslapiai

| URL | Aprašymas | Auth |
|---|---|---|
| `/cards` | Kortų duomenų bazė su filtrais | Ne |
| `/login` | Prisijungimas | Ne |
| `/register` | Registracija | Ne |
| `/community-decks` | Vieši deckai su balsavimu | Ne |
| `/community-decks/[id]` | Deck detalės, vote, copy | Ne |
| `/users/[username]` | Vartotojo viešas profilis | Ne |
| `/deck-builder` | Naujo deck kūrimas | Taip |
| `/deck-builder/[id]` | Esamo deck redagavimas | Taip |
| `/my-decks` | Savo deckų sąrašas | Taip |

## Deck builder taisyklės

- Deck dydis: **30–40 kortų**
- Paprastas / Magiškas / Unikalus: max **2 kopijos**
- Epiškas / Legendinis: max **1 kopija**
- Frakcijų lock: pasirinkta frakcija + Universalus (ID=14)
- Visibility: Private / Unlisted / Public

## Projekto struktūra

```
src/
  app/
    cards/              kortų bazė
    community-decks/    viešų deckų listing + detail
    deck-builder/       deck builder + edit route
    my-decks/           savo deckų sąrašas
    users/[username]/   vartotojo profilis
    login/ register/    auth
  components/
    cards/              CardItem, CardGrid, CardFilters, OwnedToggle
    community/          VoteWidget, CopyToDeckButton, CommunityDeckCard, ReadOnlyDeckList
    deck-builder/       DeckCardPool, DeckListPanel, DeckStats, GoldCurveChart, ...
    my-decks/           MyDecksList
  lib/
    supabase/           client.ts + server.ts
    deck-validation.ts
    utils.ts
  stores/
    collectionStore.ts
    deckBuilderStore.ts
  types/
    index.ts
supabase/
  schema.sql            pilna DB schema
  seed_cards.sql        kortų duomenys
  mvp2_community.sql    MVP 2 migracija (profiles, deck_votes, score)
```

## MVP planas

| MVP | Statusas | Aprašymas |
|---|---|---|
| 1A | Done | Kortų duomenų bazė, filtrai, kolekcija |
| 1B | Done | Deck builder, validacija, my-decks |
| 2  | Done | Community decks, balsavimas, profiliai |
| 3  | Planuojama | Events, turnyrai arba badge sistema |
