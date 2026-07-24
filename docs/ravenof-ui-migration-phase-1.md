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

---

# Fazė 3 — priedas (2026-07-24)

Handoff v2 (`ravenof-ui-handoff` projekto šaknyje; `validate-handoff.mjs` → errors:0 warnings:0 PASSED) pridėjo 11 naujų raw referencų. Vienintelis paketo skirtumas nuo v1 — `screenshots/raw/mobile/*.png` + manifestas (prototipas/dokai/asset'ai nepakitę).

## Apimtis (migruota pagal raw referencus)

| Ekranas | Gyvas komponentas / route | Raw ref |
|---|---|---|
| Registracija | `DigitalAuthScreen` (register šaka) | `register-default.png` |
| Slaptažodžio atkūrimas | `DigitalForgotPassword` | `forgot-default.png` |
| Onboarding (2 žingsniai) | `StarterDeckOnboarding` (`/digital/onboarding`) | `onboarding-step1-deck.png`, `onboarding-step2-avatar.png` |
| Kova su DI | `DigitalPvE` (`/digital/pve`, full-bleed) | `pve-default.png` |
| Draugiška kova | `DigitalPvP` (`/digital/pvp`, full-bleed) | `pvp-lobby.png` |
| Kampanijų sąrašas | `CampaignList` (`/digital/campaign`, full-bleed) | `campaign-default.png` |
| Draugai | `FriendsClient` (`/digital/friends`, rail matomas, be header) | `friends-default.png` |
| Kovos rezultatas | `TutorialGame` pabaigos modalas (bot/unranked/PvP) + `RankedResult` | `result-victory.png`, `result-defeat.png` |
| Naujo lygio šventė | `TutorialGame` level-up overlay | `level-up-modal.png` |

Naujas bendrinis komponentas: `RavenofBannerButton` (raudona vėliavos CTA — `buttons/button-primary-normal.png`, 100%/100% stretch). Naujas assetas: `public/ravenof-ui/backgrounds/background-misty-fortress.webp` (register kairė pusė; konvertuota WebP). CSS: `.ravenof-rays` (rezultato spinduliai, reduced-motion off) + `.ravenof-ornament` (— ◆ — skirtukas).

## Kas išsaugota
- **Register/Forgot:** visa auth semantika — username RE + unikalumo patikra, `signUp` klaidų žemėlapis, email-confirm ekranas, `resetPasswordForEmail` (be egzistavimo atskleidimo), `next` param validacija, srautas lieka /digital.
- **Onboarding:** `rvn_claim_starter_deck` (idempotentinis; jau claimed → praleidžia), klaidų tekstai, kaladės detalės („Apžiūrėti kaladę" modalas: lore/stiprybės/silpnybės/pilnas kortų sąrašas + kortos preview — perkelta iš senojo atidarytos dėžės ekrano), avataro `rvn_equip_cosmetic` (neturimi — užrakinti), klaviatūra/drag/scroll-snap/reduced-motion.
- **PvE:** režimai random/faction/public, AI sunkumas, viešų kaladžių paieška+filtras, frakcijų picker'is, `canStart` taisyklės, TutorialGame(practice) paleidimas, testerio bypass, tik globali aktyvi kaladė (be tylaus fallback); kaladės keitimas per `ActiveDeckSelectorModal`.
- **PvP:** `findRandom`/`createPrivate`/`createRoom`/`joinByCode`/`waitForGuest`(poll 2s)/`cancelRoom`, `?host=`/`?join=` iššūkių auto-veiksmai, kambario kodo kopijavimas, draugų iššūkis (`challengeCreate`) — dabar tiesiai iš DRAUGAI sąrašo IŠŠŪKIS mygtukais.
- **Campaign:** `loadCampaigns` + navigacija į `/digital/campaign/[slug]` (žemėlapio ekranas nemigruotas — be raw ref); progresas/bosas — iš gyvų `loadFullCampaign`+`rvn_campaign_state`.
- **Friends:** friendRequest/Respond/Remove, iššūkiai (priimti/atmesti → /digital/pvp?host|join), mainai (TradeWindow), block/mute, presence pasirinkimas, paieška+filtras, unread ženkliukai; pokalbis dabar įterptas ekrane per `chatStore` (`loadHistory`/`send`/`markRead`/retry; realtime — per layout'e likusį `GlobalChatLayer` subscription). Naujo pokalbio įrašas sukuriamas store, kad `loadHistory` turėtų kur rašyti.
- **Rezultatai:** `reportMatchV2` atlygio srautas, level-up aptikimas + `levelRewards` agregacija, draugo pridėjimas po PvP, „žaisti dar"/uždaryti; RankedResult — visi 4 veiksmai, statistika, milestone/achievement pranešimai, demotion įspėjimas, garsai.

## Shell pakeitimai
- FULL_BLEED_ROUTES += `/digital/pve`, `/digital/pvp`, `/digital/campaign` (ekrano ‹ grįžta į /digital).
- NO_HEADER_ROUTES += `/digital/friends` (rail lieka; antraštė ekrane).
- MIGRATED_ROUTES += pve/pvp/campaign/friends (be Flames).

## Sąmoningi nukrypimai
1. **PvE varžovo plytelės** — panaudoti esami gyvi asset'ai (`/digital/ai/types/*.png` su įkeptu rėmu+pavadinimu); prototipo portretinio arto handoff'e nėra. Dešinės panelės preview random režimui — tas pats assetas.
2. **„Numatomas atlygis"** — gyvos `PVE_REWARD` konstantos pagal sunkumą (ne prototipo „120 sidabro · 20 XP" mock); XP eilutės nėra (kliento konstantos nėra — tikras XP ateina iš `rvn_report_match_v2` config).
3. **Campaign „UŽRAKINTA" nėra** — gyvoje sistemoje kampanijos tarpusavyje nerakinamos (rakinami mazgai žemėlapyje); 0 % progresas rodomas kaip PRADĖTI.
4. **Onboarding step 1 ATGAL paslėptas** (nėra kur grįžti — vartotojas jau autentifikuotas); step 2 ATGAL grįžta į kaladės žingsnį. Final CTA „Į MOKOMĄJĄ KOVĄ" → `/digital/tutorial` (gyvas mokymų hub'as; anksčiau — tiesiai į /digital).
5. **TutorialGame rezultato „Į PRADŽIĄ"** — semantika ta pati kaip senojo „Uždaryti" (grįžta į paleidusį ekraną), pavadinimas pagal approved dizainą.
6. **PvP IŠŠŪKIS** rodomas ir away/dnd draugams (gyvas funkcionalumas platesnis nei ref, kuriame tik online).
7. **Result/level-up screenshotai nedaryti** — ekranai pasiekiami tik sužaidus kovą; verifikuota tsc/lint/build + vizualiai peržiūrėtas kodas pagal prototipo markup (RESULT/LEVEL-UP sekcijos).

## Patikros (2026-07-24)
- `tsc --noEmit` OK · `next lint` — 0 naujų klaidų keistuose failuose (TutorialGame legacy rules-of-hooks/unused — pre-existing, nekeista; pašalinti 3 nebenaudojami importai) · i18n ERROR 0 · `next build` OK.
- Vizuali verifikacija 844×390@2x: `artifacts/ravenof-ui-phase-3/{register,forgot,onboarding-step1,onboarding-step2,pve,pvp,campaign,friends}-implementation.png` (mock aplinka; onboarding — mock profilio `digital_onboarded_at=null` per naują `/__mock/profile` valdymo endpointą).
- Smoke: visi route'ai (sen. + pve/pvp/campaign/friends) be pageerror, be horizontalaus overflow; login srautas, kolekcijos modalas, nav — OK. Konsolėje tik WebSocket (offline mock) + pavieniai 404 resursai.

## Liko nemigruota (be raw ref)
Deck builder, community decks turinys, pack open, campaign žemėlapis (`/digital/campaign/[slug]`), more/tutorial hub, queue/match-found, offline/maintenance ekranai.

---

# Fazė 4 — priedas (2026-07-24)

Likę legacy ekranai pritraukti prie patvirtintos vizualinės kalbos **be raw referencų** — pagal RavenofKit sistemą (`--ravenof-*` tokenai, Cinzel/Alegreya Sans, kampuoti paviršiai, auksiniai clip CTA, raudonas banner CTA). Visa gyva logika nekeista.

## Apimtis

| Ekranas | Komponentas | Pakeitimas |
|---|---|---|
| Bendruomenės kaladės | `DigitalCommunityDecks` | Perrašyta į ravenof kalbą: įrankių juosta (paieška/frakcija/rikiavimas/„tik kurias galiu susidėti" toggle), kaladžių grid su frakcijos viršaus juosta, TOP-3 romėniški numeriai (be emoji), balsų dėžutė, detalės modalas (kortos+komentarai) — visi balsavimo/kopijavimo/komentarų/report RPC išsaugoti; retumo spalvos per `ravenofRarityColor`. |
| Deck builder | `DigitalDeckBuilder` | Vizualinis reskinas (paneles, tipografija, patvirtinta FAC/RAR paletė, auksinis clip IŠSAUGOTI) — drag&drop, validacija, store, testerio bypass, hover preview logika nepaliesta. |
| Pakuotės atidarymas | `PackOpen` | Chrome reskinas: ravenof antraštės, ✕ iconbtn, auksiniai clip CTA („Atplėšti pakuotę"/„Į kolekciją"), ornamentas prie „Tavo kortos"; kompaktiškesnis sealed layout (telpa 390px aukštyje). Plėšimo/reveal/karuselės animacijos nekeistos. |
| Daugiau | `MoreScreen` | Ravenof panelės, sekcijų label'iai, plytelės su akcento kairiu rėmu, patvirtinimo dialogai ravenof-btn klasėmis. |
| Mokymai | `TutorialHub` | Perrašyta: ‹ + MOKYMAI antraštė, kaladės kortelė su viršelio artu + raudonas banner „Pradėti mokymų kovą"; fallback starter grid ravenof kalba. `?auto=1`, claim/launch logika ta pati. |
| Ranked eilė | `RankedQueue` | Ravenof overlay: deimanto spinner, Cinzel būsena, „Laukiama: Ns" per i18n, Atšaukti secondary. Matchmaking poll/bot fallback nekeisti. |
| Priešininkas rastas | `MatchFound` | Ravenof panelė su spinduliais (`.ravenof-rays`) + ornamentu; VS išlaikytas. |
| Kampanijos žemėlapis | `CampaignMapScreen` | Viršaus juosta ravenof kalba (‹ KAMPANIJA, Cinzel pavadinimas, progreso chip), kaladės įspėjimas; konteineris pritaikytas prie rail shell'o (left = rail plotis, bottom = 0 — nebelieka legacy bottom-nav tarpo). Hardcoded LT tekstai → i18n. |

## Shell
- MIGRATED_ROUTES += `/digital/more`, `/digital/tutorial`; Flames nerodomos ir `/digital/campaign/[slug]` (startsWith).

## Patikros (2026-07-24)
- `tsc --noEmit` OK · `eslint` keistuose failuose 0 klaidų · i18n ERROR 0 (nauji raktai: decks.community.*, onboarding.tutorial.*, collection.pack.*, ranked.queue.waitingFor, battle.campaign.*) · `next build` OK · smoke OK (visi route'ai, 0 overflow, 0 pageerror).
- Vizuali verifikacija 844×390@2x: `artifacts/ravenof-ui-phase-4/{community,builder-faction,builder,more,tutorial,pack-open,ranked-queue,campaign-map}-implementation.png`.
- Mock praplėstas: cards.faction_id, user_pack_inventory, deck_cards su card join (builder/community/pack vizualams).

## Pastabos
- Šie ekranai neturi patvirtintų raw referencų — dizainas išvestas iš RavenofKit sistemos; atsiradus oficialiems eksportams, ekranus reikės sutikrinti ir prireikus tikslinti.
- MatchFound/queue/pack reveal vizualiai patikrinti tik iš dalies (srauto ekranai); pack sealed + queue captures yra, reveal/karuselė — kodo peržiūra.
