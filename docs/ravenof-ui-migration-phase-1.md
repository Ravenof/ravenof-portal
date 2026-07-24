# Ravenof UI migracija — Fazė 1 (mobile landscape 844×390)

Statusas: **IMPLEMENTUOJAMA** (atnaujinta pabaigoje — žr. „Galutinis statusas“).
Handoff: `Ra00venof Digital Phase 5 continuation/ravenof-ui-handoff` (validatorius: errors 0 / warnings 0, PASSED).

## Fazės 1 apimtis

Migruojami ekranai (tik jie):

| Ekranas | Route | Raw reference |
|---|---|---|
| Login | `/digital/login` | `screenshots/raw/mobile/login-default.png` |
| Pagrindinis meniu | `/digital` | `screenshots/raw/mobile/main-menu-default.png` |
| Kolekcija | `/digital/collection` | `screenshots/raw/mobile/collection-default.png` |
| Kortos detalės (modalas) | kolekcijos būsena | `screenshots/raw/mobile/card-detail-modal.png` |

Taip pat: bendras `/digital` shell (nav rail + header) — jis jau gyvai naudoja prototipo šoninį rail (commit b0f0256), Fazėje 1 suderinamas su patvirtinta geometrija.

**Neliečiama (lieka su dabartine UI):** decks, deck builder, community decks, shop (ShopModal), pack open, ranked, pve, pvp, pvp2v2, coop, campaign, album, friends, more, tutorial, onboarding, register, forgot-password, settings/notifications/quests/season/cosmetics/level-road/monthly-login modalai, GlobalChatLayer, ContentDownloadGate, WelcomeReward, visi ne-`/digital` route'ai.

## Patikrinti gyvi route'ai ir failai (repo = galutinis autoritetas)

| Handoff'e nurodyta | Realybėje | Pastaba |
|---|---|---|
| `/digital/login` → login/ page | `src/app/digital/login/page.tsx` → `DigitalAuthScreen mode="login"` (`src/components/digital/onboarding/DigitalAuthScreen.tsx`) | vienas komponentas aptarnauja ir register |
| `/digital` → DigitalHub | `src/app/digital/page.tsx` → `DigitalHub.tsx` | ✔ |
| `/digital/collection` → DigitalCollection | `src/app/digital/collection/page.tsx` → `DigitalCollection.tsx` | ✔ |
| `layout.tsx` + HubKit | `src/app/digital/layout.tsx` + `src/components/digital/ui/HubKit.tsx` | HubKit yra `ui/` pakatalogyje |
| Card detail modal | `DigitalCollection.tsx` vidinis `CardDetail` (inspector + slide-over) | keičiama į centrinį modalą (patvirtintas dizainas) |

## Komponentų žemėlapis

| Patvirtintas komponentas | Esamas komponentas | Strategija | Išsaugoma logika |
|---|---|---|---|
| RavenofSideNavRail | `layout.tsx` nav rail (jau šoninis) | Restyle pagal prototipą (24px ikonos, Cinzel 8.5px, aktyvus = auksinė 2px right juosta + glow; be tile rėmelių) | routing, active route, `playUiClick`, Shop = ShopModal action |
| RavenofResourcePill | `HubKit.ResourcePill` | Naujas kampuotas variantas (clip-path 5px kampas, #0F0D15 + #2a2531) naudojamas header'yje | gyvi `getBalances()` likučiai, `formatNumber` |
| PlayerHeaderChip | `HubKit.ProfileChip` | Restyle: 38px avataras + vardas + rango eilutė (rank crest + medalis · numeris; fallback — lygis/xp) | profilio užkrova, LevelRoadModal atidarymas |
| RavenofTextField | login `inputStyle`, kolekcijos search | Nauja `RavenofTextField` (bg #07060A, border #36323B, focus gold) | value/onChange/validacija/autoComplete |
| RavenofPrimaryButton | įv. auksiniai mygtukai | Nauja `RavenofButton` (primary/secondary/destructive/ghost; clip-path poligonas, Cinzel) | onClick/disabled/loading elgsena |
| RavenofGothicPanel | `rvn-panel` | Papildomi tokenai; paneliai pagal prototipo tikslų CSS | — |
| RavenofCardDetailModal | `CardDetail` (inline) | Perkuriama prezentacija į pilno ekrano modalą su ‹ › navigacija; craft/disenchant logika ta pati | kortos duomenys, `getCraftConfig`, `craftCard`, `disenchantCard`, essence, copyLimit |
| RavenofCardThumb | `CardCell` | Restyle pagal prototipą (1044/1416 ratio, ×N ženkliukas, „Neturima“, grayscale) | owned kiekiai, pasirinkimas, `GameCard` game-feel wrapper |
| RavenofProgressBar | įv. inline barai | Nauja (track rgba(255,255,255,.08), 3–6px) | gyvi % |
| RavenofToast | DigitalHub toast | Restyle (kampuotas, auksinis rėmas) | auto-dismiss 2.4s |
| RavenofLoadingSpinner | `LoadingOrRetry` | Deimanto spinner tik migruotų ekranų viduje; LoadingOrRetry elgsena (timeout/retry) išsaugoma | timeout/retry |
| RavenofModeCard | DigitalHub režimų mygtukai | Restyle pagal prototipo geometriją (clip-path kampai, art + gradient scrim) | route handleriai |

## Duomenų sluoksnis (nekeičiamas)

- Auth: `supabase.auth.signInWithPassword`, klaidų žemėlapis, `getOnboardingState` route guard, `safeDigitalNext`, `afterAuth` redirect — be pakeitimų.
- Home: `getBalances`, `getSeasonPath`, `loginCheckin` (serija), `getDailyTasks`, `getMonthlyLogin`, `useActiveDeck`, `friendsList`, visų modalų atidarymas — be pakeitimų. Papildomai skaitoma (read-only) `ensureProfile`/`getActiveSeason` + `rankView` rango eilutei header'yje ir „Kas toliau" kortelei.
- Kolekcija: `cards` + `user_collections` užklausos, `ensureCardTranslations`, filtrai (faction/rarity/type/search/sort/ownedOnly), craft/disenchant RPC — be pakeitimų. Puslapiavimas — tik prezentacijos sluoksnyje (`filtered.slice`).
- Garsai: visi `playUiClick` / `playSuccess` / `playError` kvietimai išlieka.

## Rizikos

1. `DigitalAuthScreen` aptarnauja ir register — login šaka gauna naują JSX, register šaka paliekama; bendras submit/state nekeičiamas.
2. Kolekcijos inspector → modalas: dingsta wide-screen šoninis inspector; pagal patvirtintą dizainą detalės visur atsidaro modale. Craft/disenchant perkeliami į modalą (logika ta pati).
3. „Žaisti kaip svečias" prototipe: gyvame auth'e svečio prisijungimo NĖRA — mygtukas nerodomas (žr. „Sąmoningi nukrypimai").
4. Header'io nustatymų (⚙) mygtukas: prototipo header'yje jo nėra, bet gyvame jis atidaro SettingsModal — paliekamas (bell stiliaus IconBtn), kad funkcionalumas neišnyktų.
5. Šriftai: Cinzel + Alegreya Sans savarankiškai talpinami `public/ravenof-ui/fonts` (OFL leidžia; ASSET_MANIFEST leidžia self-host). `--font-cinzel` (next/font) nekeičiamas — legacy ekranai nepaveikiami.
6. Nav rail perėjo iš 40px tile į 24px glyph — vienintelis bendras shell'o pokytis, matomas ir nemigruotuose route'uose (rail visada matomas). Tai suderinta su patvirtintu dizainu ir nekeičia jokios navigacijos logikos.

## Failų apimtis (Fazė 1)

Nauji:
- `src/components/digital/ui/RavenofKit.tsx` — tokenai + baziniai komponentai (mygtukai, text field, pills, spinner, progress, toast, modal frame, panel).
- `src/components/digital/ui/ravenof-ui.css` — @font-face + CSS kintamieji + bendros klasės.
- `src/components/digital/RavenofCardDetailModal.tsx` — kortos detalių modalas.
- `public/ravenof-ui/**` — patvirtinti assetai (fonts, backgrounds, logos, modes, nav, currencies, ranks, factions, rarity, rewards).
- `docs/ravenof-ui-migration-phase-1.md` (šis failas).
- `artifacts/ravenof-ui-phase-1/*.png` — implementacijos screenshotai.

Keičiami:
- `src/app/digital/layout.tsx` — rail/header restyle + rango eilutė.
- `src/components/digital/ui/HubKit.tsx` — ProfileChip/ResourcePill/IconBtn atnaujinimai.
- `src/components/digital/DigitalHub.tsx` — pagrindinio meniu prezentacija pagal prototipą.
- `src/components/digital/DigitalCollection.tsx` — kolekcijos prezentacija (filtrų ikonos, 6 kortų puslapis, modalas).
- `src/components/digital/onboarding/DigitalAuthScreen.tsx` — login šakos prezentacija.
- `src/locales/lt/*.json` + `src/locales/en/*.json` — nauji raktai (home/collection/login etikečių).

## Sąmoningi nukrypimai nuo raw reference

1. **„Žaisti kaip svečias"** — gyvame Supabase auth sraute svečio sesijos nėra; mygtukas neįtrauktas, kad nebūtų negyvos UI. (OPEN_QUESTIONS kandidatas.)
2. **Kalbos LT chip** login ekrane paliekamas (gyvas LanguageSelector) — prototipo login jo neturi, bet funkcionalumas privalo išlikti.
3. **⚙ Settings** mygtukas header'yje paliekamas (žr. rizika 4).
4. Kolekcijos tipo filtrų ikonos — gyvos `public/icons/card-types/*` (prototipo „Property 1=*" ikonos su mask, vizualiai atitinka pilkus kvadratus reference'e).

## Galutinis statusas — FAZĖ 1 BAIGTA (2026-07-23)

### Migruota
- `/digital/login` — atitinka `login-default.png` (be svečio mygtuko, žr. nukrypimus).
- `/digital` — atitinka `main-menu-default.png` (gyvi duomenys: rangas, sezonas, serija, sezono kelias, dienos užduotys su claim tiesiai iš eilutės).
- `/digital/collection` — atitinka `collection-default.png` (6 kortų puslapiai, ikoniniai filtrai, ‹ N/M ›).
- Kortos detalės — `RavenofCardDetailModal` atitinka `card-detail-modal.png` (craft/disenchant, ‹ › naršymas, Esc/backdrop uždarymas; renderinama per portal į body).
- Shell: nav rail (24px ikonos, Cinzel 8.5px, aukso dešinė juosta) + header (rango eilutė, kampuotos valiutų piliulės, LT chip, varpelis) — matomas ir nemigruotiems route'ams (funkcionalumas nepakitęs).

### Legacy liko (be pakeitimų)
register, forgot-password, onboarding, decks, deck builder, community, shop/pack open, ranked, pve, pvp, 2v2, coop, campaign, album, friends, more, tutorial + visi modalai.

### Patikros (cloud aplinkoje, 2026-07-23)
- Handoff validatorius: errors 0 / warnings 0 / VALIDATION PASSED.
- `tsc --noEmit`: OK. `next build`: OK (Google fonts fetch mockintas — sandbox be tinklo; Windows/Vercel builda normaliai).
- `next lint` (digital katalogai): 0 naujų klaidų (liko pre-existing `DigitalPvp2v2.tsx` unused `name`).
- i18n: 21 namespace, ERROR 0 (nauji raktai LT+EN poromis).
- Vizuali verifikacija 844×390 @2x: `artifacts/ravenof-ui-phase-1/*.png` (harness: `tools/ravenof-ui-visual.mjs` + `tools/ravenof-ui-mock-supabase.mjs` — mock TIK verifikacijai, produkcinis kodas jo nenaudoja).
- Smoke (`tools/ravenof-ui-smoke.mjs`): login submit → redirect į /digital ✓, route guard ✓, visi legacy route'ai atsidaro ✓, horizontalaus overflow nėra (visur 0px) ✓, kortos modalas atsidaro/užsidaro (Esc + backdrop) ✓, nav rail navigacija ✓.
- E2E (`playwright.config.ts` prieš gyvą deploy) — nepaleista sandbox'e (nėra tinklo/kredencialų); paleisti `run-e2e.bat` Windows'e. Skriptams reikia `npm i -D @playwright/test` (package.json nekeistas).

### Likę vizualūs skirtumai
1. Header'yje papildomas ⚙ mygtukas (funkcionalumo išsaugojimas).
2. Login ekrane papildomas LT chip (kalbos perjungimas — gyva funkcija).
3. Nėra „Žaisti kaip svečias" (gyvame auth svečio srauto nėra) ir „arba tęsk su" skirtuko.
4. Bell/settings/eye ikonos — lucide glyph'ai (approved asset'ų šioms ikonoms handoff'e nėra).
5. Kortų menas, avataras, skaičiai — gyvi duomenys, todėl skiriasi nuo prototipo mock turinio.

### Fazės 2 rekomendacija
Decks (mine/community/empty) + Deck builder + Shop/PackOpen (raw ref jau yra decks-mine.png, shop-packs.png), tada Ranked + Settings (ranked-default.png, settings-default.png). Naudoti jau sukurtą RavenofKit + tokenus.

---

# Fazė 2 (2026-07-24) — Decks · Shop · Ranked · Settings

Migruoti likę keturi ekranai su patvirtintais raw reference:

| Ekranas | Kur | Reference |
|---|---|---|
| Kaladės (Mano) | `/digital/decks` (`DigitalDecks` + `DigitalMyDecks`) | `decks-mine.png` |
| Parduotuvė | `ShopModal` (pilno ekrano overlay, rail lieka) | `shop-packs.png` |
| Reitinginės kovos | `/digital/ranked` (`RankedClient` home view; full-bleed be rail/header) | `ranked-default.png` |
| Nustatymai | `SettingsModal` (pilno ekrano overlay, rail lieka) | `settings-default.png` |

**Be raw reference liko legacy (sąmoningai):** deck builder, community decks tab turinys, pack open, PvE/PvP/kampanija/friends/more/onboarding/register/forgot ir visi kiti modalai (OPEN_QUESTIONS — raw eksportai pending).

## Kas išsaugota
- Decks: deck load/covers, drawer su statistika/kortų sąrašu/Playtest (atsidaro paspaudus kaladės artą), duplicate/delete+confirm, edit/create routing, aktyvios kaladės logika per `useActiveDeck.setActive` (optimistic + RPC).
- Shop: `getShop`/`purchaseShopItem`/`getDailyDeal`/`buyDailyDealCard`/`getStarterDecks`/`claimStarterDeck`, sekcijos iš `SHOP_SECTIONS`, pack inventorius („Atidaryti pakuotes" CTA), klaidų žemėlapis; pirkimas dabar per patvirtinimo dialogą (prototipo SHOP CONFIRM).
- Ranked: visa srauto logika (queue→found→playing→result), `lockDeck`, `reportMatch`, ekonomika, sub-views (lyderiai/istorija/pasiekimai/sezonai/atlygiai — ikonų juosta antraštėje), aktyvios kaladės eligibilumo taisyklės; lyderių preview per `getLeaderboard(3)`.
- Settings: visi gyvi nustatymai (UI garsai, muzikos/SFX slideriai, iškvietimo/fono FX, kino pop-up + sub-checkbox'ai, balsų kalba+fallback, priminimai native, turinio parsisiuntimas su progresu/atšaukimu/valymu, reset), `saveDigitalSettings` sync. NAUJA pagal patvirtintą dizainą: paskyros e-pašto eilutė su „Patvirtinta ✓" ir „Atsijungti" (ta pati `signOut` semantika kaip More ekrane).

## Shell pakeitimai
- `/digital/ranked` — FULL_BLEED_ROUTES (be rail/header; ‹ grįžta į /digital).
- Shop/Settings — pilno ekrano overlay su matomu rail (left offset = rail plotis; portal į body dėl z-index stacking konteksto). Atsidarę modalai uždaromi keičiant route.
- `/digital/decks` pridėtas prie MIGRATED_ROUTES (be Flames).

## Sąmoningi nukrypimai
1. Ranked antraštėje palikta sub-view ikonų juosta (🏆📜🏅📅🎁) + „23W · 9L" eilutė po herbu — funkcionalumo išsaugojimas (approved ekrane šito nėra).
2. Settings turi daugiau valdiklių nei approved paveiksle (slideriai, kino, turinys, balsai) — visi pateikti patvirtinta vizualine kalba; „Grafikos kokybė" segmento gyvame nėra — nepridėta.
3. Shop kategorijų pavadinimai — gyvi DB/sekcijų pavadinimai („Kortų nugarėlės" vs prototipo „Nugarėlės"); dienos pasiūlymo juosta veda į „Dienos kortos" sekciją (gyvo „featured offer" koncepto nėra).
4. Deck tile fone — starter kaladės viršelis pagal frakciją (kaip gyvame), ne prototipo kortos renderis.

## Patikros (2026-07-24)
- `tsc --noEmit` OK · `next lint` (keisti failai) 0 klaidų · i18n ERROR 0 · `next build` OK (fonts mock — tik sandbox).
- Vizuali verifikacija 844×390@2x: `artifacts/ravenof-ui-phase-2/{decks,shop,ranked,settings}-implementation.png`.
- Smoke: drawer atsidaro, tab perjungimas, aktyvios kaladės selektorius iš ranked, shop confirm dialogas, settings toggles, back navigacija, jokio horizontalaus overflow. (Mock aplinkos artefaktas: `DigitalCommunityDecks` pageerror dėl mock RPC shape — legacy komponentas, gyvame nepasikartoja.)

## Fazė 3 rekomendacija
PARTIAL ekranai, kai bus raw referencai: register/forgot/onboarding, PvE/PvP setup, campaign, friends, more, result/level-up/queue/match-found, offline/maintenance/expired. Deck builder + pack open — reikia raw eksportų (OPEN_QUESTIONS).
