# RAVENOF DIGITAL — I18N AUDITAS (Fazė 1)
Data: 2026-07-12 · Apimtis: /digital app + kovos variklis + admin įrankiai + DB turinys (web portalas — vėlesnis etapas)

## Santrauka

Metodas: skenuoti visi `.ts/.tsx/.js/.jsx` failai (be node_modules), skaičiuoti string literalai ir JSX tekstai su lietuviškomis raidėmis (ąčęėįšųūž). PASTABA: LT žodžiai be diakritikų (pvz. „Taip", „Ne", „Kortos") į skaičių nepatenka — realus kiekis ~15–25% didesnis.

| Sritis | Eilučių | Failų | Statusas |
|---|---|---|---|
| Digital UI (components/digital, app/digital) | 636 | 59 | apimtyje |
| Kovos variklis (components/tutorial, lib/tutorial, lib/game) | 729 | 26 | apimtyje |
| Social/Chat | 60 | 3 | apimtyje |
| Ranked (lib/ranked — botai, achievementai) | 94 | 6 | apimtyje |
| Gamification (levels, shop, craft, rewards) | 62 | 8 | apimtyje |
| Kampanija (seeds + validate) | 467 | 4 | apimtyje |
| lib kita (starterMeta, deck-validation, nav…) | 124 | 13 | apimtyje |
| Admin įrankiai | 746 | 65 | apimtyje |
| data/ (rules, tutorial lessons, lore) | 592 | 3 | apimtyje |
| **VISO apimtyje** | **3510** | **187** | |
| Web portalas (lore/turnyrai/market/rules UI/…) | 829 | 110 | NE apimtyje (vėliau) |

## Didžiausi failai pagal LT eilučių kiekį (apimtyje)

- **440** — `src/data/campaignSeeds/prazarasVarngradasCampaign.ts` (campaign)
- **384** — `src/data/rules.ts` (data)
- **211** — `src/components/admin/GameplayConfigEditor.tsx` (admin)
- **201** — `src/lib/tutorial/engine.ts` (battle-engine)
- **160** — `src/components/tutorial/TutorialGame.tsx` (battle-engine)
- **150** — `src/lib/game/types.ts` (battle-engine)
- **148** — `src/data/tutorialLessons/lessonSeeds.ts` (data)
- **70** — `src/app/admin/shop/AdminShopClient.tsx` (admin)
- **62** — `src/lib/digital/starterMeta.ts` (lib-misc)
- **60** — `src/data/lore.ts` (data)
- **52** — `src/lib/ranked/bots.ts` (ranked)
- **50** — `src/components/digital/DigitalPvP.tsx` (digital-ui)
- **46** — `src/lib/tutorial/script.ts` (battle-engine)
- **46** — `src/components/social/FriendsClient.tsx` (social)
- **40** — `src/components/digital/onboarding/StarterDeckOnboarding.tsx` (digital-ui)
- **38** — `src/components/digital/DigitalPvE.tsx` (digital-ui)
- **36** — `src/components/digital/DigitalDeckBuilder.tsx` (digital-ui)
- **34** — `src/components/tutorial/PracticeButton.tsx` (battle-engine)
- **34** — `src/components/digital/onboarding/DigitalAuthScreen.tsx` (digital-ui)
- **33** — `src/lib/ranked/achievements.ts` (ranked)
- **31** — `src/lib/gamification/levels.ts` (gamification)
- **31** — `src/components/admin/campaign/AdminNodeEditor.tsx` (admin)
- **30** — `src/components/digital/DigitalCommunityDecks.tsx` (digital-ui)
- **28** — `src/app/admin/events/actions.ts` (admin)
- **26** — `src/components/digital/SettingsModal.tsx` (digital-ui)
- **25** — `src/components/digital/PvPLobby.tsx` (digital-ui)
- **21** — `src/components/digital/ranked/RankedClient.tsx` (digital-ui)
- **20** — `src/components/digital/ActiveDeckSelectorModal.tsx` (digital-ui)
- **20** — `src/app/admin/lore/locations/page.tsx` (admin)
- **19** — `src/lib/game/statusVfx.ts` (battle-engine)
- **19** — `src/components/digital/DigitalMyDecks.tsx` (digital-ui)
- **19** — `src/components/admin/CinematicUpload.tsx` (admin)
- **18** — `src/lib/tutorial/ai/aiScoring.ts` (battle-engine)
- **18** — `src/components/digital/StarterOnboarding.tsx` (digital-ui)
- **18** — `src/components/digital/DigitalHub.tsx` (digital-ui)
- **18** — `src/app/admin/lore/import/page.tsx` (admin)
- **17** — `src/components/digital/Team2v2Game.tsx` (digital-ui)
- **17** — `src/components/digital/DigitalCollection.tsx` (digital-ui)
- **17** — `src/app/admin/users/actions.ts` (admin)
- **17** — `src/app/admin/page.tsx` (admin)

## DB turinys, kurį reikės lokalizuoti (Fazės 4–7)

| Šaltinis | Laukai | Pastaba |
|---|---|---|
| `cards` | name, description, effect_text, image_url | LT tekstas įkeptas ir paveikslėlyje → reikės `card_translations` + `card_assets` (locale) |
| `factions` | name (+ aprašymai `lib/digital/starterMeta.ts`) | starterMeta = kodinis registras, ne DB |
| `rarities`, `card_types` | name | maži žodynai |
| Statusai | `lib/game/statusVfx.ts` (13 statusų registras) + `lib/game/types.ts` | kodinis registras — perkelti į locale JSON `statusEffects` |
| Kombato log | generuojamas `lib/tutorial/engine.ts` LT sakiniais | perdaryti į struktūrinius eventus su `textKey`+`textParams` (Fazė 5) |
| Daily quests / season / shop / cosmetics | DB lentelės iš 202608xx migracijų (title/desc LT) | `content_translations` normalizuota lentelė |
| Achievementai | `lib/ranked/achievements.ts` + DB | mišrus |
| Tutorial pamokos | `data/tutorialLessons/lessonSeeds.ts` (DB seed) | seed'ai LT — reikės locale stulpelių arba translations lentelės |
| Kampanija | `data/campaignSeeds/prazarasVarngradasCampaign.ts` (440 eil.) | didžiausias pavienis turinio blokas |
| Avatarai + audio | `avatar_audio`, `card-audio` bucket, `gameplay.voiceLines` JSONB | audio tik LT → `localized_audio` modelis (Fazė 7) |
| Botų vardai | `lib/ranked/bots.ts` (52) | vardai gali likti LT (allowlist) |

## Tekstai, matomi tik specifinėse būsenose (netipiniai, nepamiršti)

- Klaidos/atsijungimas: `PvPLobby.tsx`, `lib/social/chatStore.ts`, supabase klaidų mapping'ai auth ekranuose
- Matchmaking/laukimas: `DigitalPvP.tsx`, `ranked/RankedQueue.tsx`, `MatchFound.tsx`
- Tuščios būsenos: kolekcija, kaladės, draugai, notifikacijos
- Deck validacija: `lib/deck-validation.ts` (14) — grąžina LT sakinius → keisti į kodus+params
- Reward claim / pack-open klaidos: `PackOpen.tsx`, `WelcomeReward.tsx`
- Server RPC klaidos: SQL funkcijos grąžina LT žinutes (`raise exception`) — ilgainiui → stabilūs kodai (Fazė 21 spec'e)

## Architektūros sprendimai (Fazė 2)

1. **Biblioteka: `i18next` + `react-i18next`.** Klientinė, be route pakeitimų, sinchroninis init su bundle'intais JSON — jokio LT „blyksnio". Next-intl atmestas: locale-prefixed routes laužytų Capacitor remote-URL shell + deep links.
2. **Locale be URL prefiksų.** Rezoliucija: (1) sesijos pasirinkimas → (2) `profiles.preferred_locale` → (3) `rvn_locale` cookie/localStorage → (4) `navigator.language` jei `en*` → (5) `lt`.
3. **Persistencija:** cookie + localStorage (svečiams, SSR) + `profiles.preferred_locale` stulpelis (migracija `20260830_preferred_locale.sql`) sinchronizacijai tarp įrenginių. Prisijungus profilis taikomas tik jei šioje sesijoje nebuvo aiškaus pasirinkimo.
4. **`<html lang>`** nustatomas kliente per I18nProvider (root layout lieka statinis — cookies() serveryje padarytų visą app dynamic).
5. **Raktai:** semantiniai, namespace JSON failai `src/locales/{lt,en}/*.json`. LT = šaltinis; EN = draft (peržiūrai).
6. **Validacija:** `npm run i18n:validate` — trūkstami/pertekliniai raktai, interpolation parametrų neatitikimai.

## Fazių planas (likusios sesijos)

- Fazė 4: DB turinys (factions/statusai/quests/rewards/starter meta) + Intl formatavimas
- Fazė 5: kombato log → struktūriniai eventai (`textKey`+`textParams`), rerender abiem kalbom
- Fazė 6: `card_translations` + `card_assets` (EN kortos vaizdas) + centralizuotas resolveris
- Fazė 7: `localized_audio` (kortos+avatarai), fallback politika, admin upload
- Fazė 8: admin kalbų tab'ai + completeness ataskaitos
- Fazė 9: Playwright testai + responsive patikros

---

## ĮGYVENDINIMO BŪSENA (sesija 2026-07-12, commit490)

### Padaryta (Fazės 1–3)

**Branduolys** (`src/lib/i18n/`): `config.ts` (locale tipai, LANGUAGE_OPTIONS), `core.ts` (t(), translate(), Intl.PluralRules daugiskaita, {{interpoliacija}}, EN→LT→raktas fallback, cookie+localStorage+profilio persistencija, Intl format helpers), `react.tsx` (useT/useLocale per useSyncExternalStore — hydration-safe, I18nBoot su html lang), `resources.ts` (statiniai JSON importai). PASTABA: i18next nepanaudotas — npm registrija sandbox aplinkoje blokavo diegimą (403); savas ~150 eil. modulis dengia tą patį API (interpolation/plural/namespaces/rerender) be priklausomybių.

**Persistencija:** migracija `supabase/migrations/20260830_preferred_locale.sql` (NEPALEISTA — paleisti per run-migrations.bat / SQL editor). Rezoliucija: sesijos pasirinkimas → profilis → cookie/LS → naršyklės kalba → lt.

**Selektorius:** `LanguageSelector.tsx` (LT|EN, be vėliavų, radiogroup a11y) — login/register, forgot-password, starter onboarding, SettingsModal (nauja „Kalba" kategorija), MoreScreen.

**Migruoti ekranai** (LT+EN, 397 raktai, 17 namespace): /digital layout (nav, header, rotate overlay), SettingsModal, MoreScreen, DigitalAuthScreen, DigitalForgotPassword, StarterDeckOnboarding, DigitalHub, DigitalCollection (su craft klaidomis), DigitalPvE, DigitalPvP, PvPLobby, LoadingOrRetry, lib: deck-validation.ts, digital/activeDeck.ts, digital/starterMeta.ts (pilnas dvikalbis frakcijų meta registras).

**Validacija:** `npm run i18n:validate` — raktų parity, interpolation parametrai, tuščios reikšmės (šiuo metu: 0 klaidų).

### Liko (kitos sesijos, pagal fazes)

- **Fazė 3 likutis:** DigitalDecks/MyDecks/DeckSelect/ActiveDeckSelectorModal, DigitalDeckBuilder, DigitalCommunityDecks, ranked/* ekranai, GlobalChatLayer + FriendsClient, Shop/Quests/Season/LevelRoad/Notifications/Cosmetics/DailyDeal/MonthlyLogin modalai, StarterOnboarding popup, WelcomeReward, PackOpen, ContentDownloadGate, HubKit vidiniai tekstai, page title/metadata.
- **Fazė 4:** DB turinys (factions, quests, rewards, seasons, shop, cosmetics) — `content_translations` lentelė; Intl formatai likusiuose failuose.
- **Fazė 5:** kombato log → struktūriniai eventai (`lib/tutorial/engine.ts` ~201 eil., `lib/game/types.ts` statusai) + TutorialGame UI (~160 eil.).
- **Fazė 6:** `card_translations` + `card_assets` (EN kortos vaizdas) + resolveris; režimų/CTA PNG su įkeptu LT tekstu (home/battle-modes, ai/types, ai/difficulty, cta2.png, heading.png) — reikalingi EN PNG variantai arba dinaminis tekstas.
- **Fazė 7:** `localized_audio` (kortų/avatarų balsai pagal kalbą), fallback politika, voiceManager integracija.
- **Fazė 8:** admin kalbų tab'ai, completeness ataskaitos, editorial statusai.
- **Fazė 9:** Playwright testai (language-selector, locale-persistence, english-*), responsive patikros, EN teksto ilgio auditas.
- **DB seed'ai LT:** tutorial lessons, kampanija, botų vardai (allowlist?), SQL RPC klaidų kodai.
