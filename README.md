# Ravenof Companion Portal

Web companion portalas Ravenof kortų žaidimui. Next.js 15 + Supabase.

---

## Greitas paleidimas

```bash
git clone <repo-url>
cd ravenof-portal
npm install
cp .env.local.example .env.local
# užpildyk .env.local (žr. žemiau)
npm run dev
# http://localhost:3000
```

---

## Env kintamieji

Sukurk `.env.local` faila projecto šakninėje direktorijoje
(kopijuok iš `.env.local.example`):

```env
# Supabase — rasi: supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here

# Programos URL (localhost dev / production URL)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **SVARBU:** `service_role` raktą laikyk tik Supabase Dashboard'e.
> Niekada nekišk į `.env.local` ar kitus failus, kurie gali patekti į git.

---

## Supabase projekto setup

1. Sukurk naują projektą supabase.com
2. Eik į **SQL Editor** ir paleisk šiuos failus iš `supabase/` katalogo eilės tvarka:
   1. `schema.sql` — pilna DB struktūra (lentelės, RLS, triggeriai)
   2. `seed_cards.sql` — kortų duomenys (180+ kortų)
   3. `mvp2_community.sql` — profiles, deck_votes, score
   4. `mvp4a_events.sql` — events, event_registrations
   5. `mvp4b_xp_ranks_badges.sql` — rank_rules, badges, user_badges, XP sistema
   6. `mvp4b_patch_collection_badges.sql` — kolekcijos badge triggeriai
   7. `mvp5b_user_hub.sql` — my-cards, my-events, privacy nustatymai
3. **Authentication → URL Configuration:**
   - Site URL: `https://your-vercel-domain.vercel.app`
   - Redirect URLs: pridėk `https://your-vercel-domain.vercel.app/**` ir `http://localhost:3000/**`
4. **Storage:** sukurk `card-images` bucket (jei naudoji nuotraukas)

---

## Puslapiai

| URL | Aprašymas | Auth |
|---|---|---|
| `/` | Pagrindinis puslapis | Ne |
| `/cards` | Kortų duomenų bazė su filtrais | Ne |
| `/cards/[id]` | Kortos detalės ir lore | Ne |
| `/community-decks` | Vieši deckai su balsavimu | Ne |
| `/community-decks/[id]` | Deck detalės, vote, copy | Ne |
| `/users/[username]` | Vartotojo viešas profilis | Ne |
| `/leaderboards` | Top žaidėjai pagal XP/lygį | Ne |
| `/events` | Renginių sąrašas | Ne |
| `/events/[id]` | Renginio detalės ir registracija | Ne |
| `/life-tracker` | Gyvybių skaičiuoklė (iki 4 žaidėjų) | Ne |
| `/login` | Prisijungimas | Ne |
| `/register` | Registracija | Ne |
| `/forgot-password` | Slaptažodžio atkūrimas | Ne |
| `/reset-password` | Naujas slaptažodis (iš el. pašto) | Ne |
| `/deck-builder` | Naujo deck kūrimas | Taip |
| `/deck-builder/[id]` | Esamo deck redagavimas | Taip |
| `/my-decks` | Savo deckų sąrašas | Taip |
| `/my-cards` | Savo kolekcijos valdymas | Taip |
| `/my-events` | Savo renginiai ir registracijos | Taip |
| `/me` | Profilio nukreipimas | Taip |
| `/profile/settings` | Privatumo nustatymai | Taip |
| `/admin/cards` | Admin: kortų valdymas | Admin |
| `/admin/cards/new` | Admin: nauja korta | Admin |
| `/admin/cards/[id]` | Admin: kortos redagavimas | Admin |
| `/admin/cards/import` | Admin: CSV importas | Admin |
| `/admin/events` | Admin: renginių valdymas | Admin/Mod |
| `/admin/users` | Admin: vartotojų rolių valdymas | Admin |

---

## DB lentelės

| Lentelė | Aprašymas |
|---|---|
| `factions` | Frakcijos (spalvos, slug) |
| `card_types` | Kortų tipai |
| `rarities` | Retumai su kopijų limitu |
| `keywords` | Raktažodžiai |
| `cards` | Pagrindinė kortų lentelė (180+ kortų) |
| `card_keywords` | M2M: kortos ↔ raktažodžiai |
| `profiles` | Vartotojų profiliai (XP, lygis, rangas, rolė) |
| `user_collections` | Vartotojo turimos kortos (RLS) |
| `decks` | Deckai su visibility ir score (RLS) |
| `deck_cards` | Deck kortų sąrašas su kiekiu (RLS) |
| `deck_votes` | Upvote/downvote sistema (RLS) |
| `events` | Renginiai (RLS) |
| `event_registrations` | Registracijos į renginius (RLS) |
| `rank_rules` | Lygių ir rangų konfigūracija |
| `badges` | Ženklelių sąrašas |
| `user_badges` | Vartotojo ženkleliai (RLS) |

---

## Deck builder taisyklės

- Deck dydis: **30–40 kortų**
- Paprastas / Magiškas / Unikalus: max **2 kopijos**
- Epiškas / Legendinis: max **1 kopija**
- Frakcijų lock: pasirinkta frakcija + Universalus (ID=14)
- Visibility: Private / Unlisted / Public

---

## Tech stack

- **Next.js 15** (App Router, server components, server actions)
- **Supabase** (PostgreSQL, Auth, RLS, Storage)
- **Zustand** — client state (kolekcija, deck builder)
- **Tailwind CSS** + CSS variables (dark fantasy tema)
- **Framer Motion** — kortų 3D hover animacijos
- **TypeScript** strict mode

---

## Projekto struktūra

```
src/
  app/
    cards/              kortų bazė + detail
    community-decks/    viešų deckų listing + detail
    deck-builder/       deck builder + edit route
    my-decks/           savo deckų sąrašas
    my-cards/           kolekcijos valdymas
    my-events/          savo renginiai
    users/[username]/   vartotojo profilis
    events/             renginiai + detail
    leaderboards/       topai
    life-tracker/       gyvybių tracker
    profile/settings/   privatumo nustatymai
    admin/              admin panel (cards, events, users)
    login/ register/    auth
  components/
    cards/              CardItem, CardGrid, CardFilters, OwnedToggle
    community/          VoteWidget, CopyToDeckButton, CommunityDeckCard
    deck-builder/       DeckCardPool, DeckListPanel, DeckStats, GoldCurveChart
    events/             EventCard, EventRegisterButton
    layout/             MobileNav
    leaderboards/       LeaderboardTable
    life-tracker/       PlayerCard, TurnTracker
    my-decks/           MyDecksList
    profile/            UserRankCard, XPProgressBar, BadgeGrid
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
  schema.sql
  seed_cards.sql
  mvp2_community.sql
  mvp4a_events.sql
  mvp4b_xp_ranks_badges.sql
  mvp4b_patch_collection_badges.sql
  mvp5b_user_hub.sql
```

---

## Deployment (Vercel)

### 1. GitHub repo

```bash
# Sukurk naują repo GitHub'e, tada:
git remote add origin https://github.com/YOUR_USERNAME/ravenof-portal.git
git branch -M main
git push -u origin main
```

### 2. Vercel importas

1. Eik į [vercel.com](https://vercel.com) → **Add New Project**
2. Importuok GitHub repo
3. Framework: **Next.js** (auto-detect)
4. **Environment Variables** — pridėk šiuos kintamuosius:

| Kintamasis | Reikšmė |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR_PROJECT_ID.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public raktas iš Supabase |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR_VERCEL_DOMAIN.vercel.app` |

5. Paspausk **Deploy**

### 3. Supabase Auth nustatymai (po deployment)

Eik į Supabase → **Authentication → URL Configuration:**

- **Site URL:** `https://YOUR_VERCEL_DOMAIN.vercel.app`
- **Redirect URLs:**
  ```
  https://YOUR_VERCEL_DOMAIN.vercel.app/**
  http://localhost:3000/**
  ```

> Atnaujink `NEXT_PUBLIC_APP_URL` Vercel'e į galutinį URL.
> Jei naudoji custom domain — atnaujink ir Supabase nustatymus.

### 4. Post-deploy smoke test

Po sėkmingo deploy patikrink šiuos flow'us:

- [ ] `/cards` — kortų sąrašas užsikrauna
- [ ] `/register` → sukuria vartotoją
- [ ] `/login` → prisijungia, nukreipia teisingai
- [ ] `/deck-builder` — kortų pool matomas
- [ ] Deck sukūrimas + išsaugojimas
- [ ] `/community-decks` — vieši deckai matomi
- [ ] `/events` — renginiai matomi
- [ ] `/leaderboards` — topas matomas
- [ ] Admin (su admin rolė): `/admin/cards`, `/admin/events`
