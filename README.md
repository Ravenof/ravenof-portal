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
| `factions` | Frakcijos (Demonų orda, Vrylioko gauja ir kt.) |
| `card_types` | Kortų tipai (Laukas, Burtas, Artefaktas) |
| `rarities` | Retumai (Paprastas, Magiškas, Unikalus, Epiškas, Legendinis) |
| `keywords` | Žaidimo raktažodžiai |
| `cards` | Pagrindinė kortų lentelė (180+ kortų) |
| `card_keywords` | M2M: kortos ↔ raktažodžiai |
| `user_collections` | Vartotojo turimos kortos (RLS) |
| `decks` | Vartotojo deckai (RLS) |
| `deck_cards` | Deck kortų sąrašas su kiekiu (RLS) |

## Puslapiai

| URL | Aprašymas | Auth |
|---|---|---|
| `/cards` | Kortų duomenų bazė su filtrais | Ne |
| `/login` | Prisijungimas | Ne |
| `/register` | Registracija | Ne |
| `/deck-builder` | Naujo deck kūrimas | Taip |
| `/deck-builder/[id]` | Esamo deck redagavimas | Taip |
| `/my-decks` | Vartotojo deckų sąrašas | Taip |

## Deck builder taisyklės

- Deck dydis: **30–40 kortų**
- Paprastas / Magiškas / Unikalus: max **2 kopijos**
- Epiškas / Legendinis: max **1 kopija**
- Frakcijų lock: pasirinkta frakcija + Universalus (ID=14)

## Projekto struktūra

```
src/
  app/
    cards/          - kortų bazė
    deck-builder/   - deck builder + edit route
    my-decks/       - deckų sąrašas
    login/          - auth
    register/       - auth
  components/
    cards/          - CardItem, CardGrid, CardFilters, OwnedToggle
    deck-builder/   - DeckCardPool, DeckListPanel, DeckStats, ...
    my-decks/       - MyDecksList
  lib/
    supabase/       - client.ts + server.ts
    deck-validation.ts
    utils.ts
  stores/
    collectionStore.ts
    deckBuilderStore.ts
  types/
    index.ts
```
