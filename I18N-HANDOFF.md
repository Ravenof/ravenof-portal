# RAVENOF i18n — PERDAVIMO DOKUMENTAS (handoff)

Data: 2026-07-12. **FAZĖS 1–9 + EN AUDITAS (v502) BAIGTI** (commit490–502). Liko faktinis EN turinio suvedimas (kortos, balsai, EN PNG). Šis failas — tęsimo instrukcija.

## EN AUDITAS (commit502) — kas rasta ir pataisyta
- **RAKTŲ NUTEKĖJIMO ŠAKNIS:** `DailyTasksModal` rodė `DIFF_LABEL[t.difficulty].toUpperCase()` — `DIFF_LABEL` po Fazės 9 grąžina i18n RAKTĄ, o `.toUpperCase()` jį paverčia į matomą `QUESTS.DAILY.EASY`. Fix: `tt(DIFF_LABEL[...]).toUpperCase()`. Validatorius dabar gaudo tokį šabloną (`WARNING: galimas rakto nutekėjimas`).
- **REGRESIJA:** commit498 metu `common.notif` (pranešimų raktai) buvo perrašytas priminimų raktais → NotificationsModal rodė raktus. Atstatyta; priminimai perkelti į `common.reminders.*`.
- **BAKED-TEXT PNG:** naujas registras `src/lib/i18n/assets.ts` (`lt`/`en`/`bakedText`/`labelKey`) + `components/digital/ui/LocalizedArt.tsx`. EN režime LT paveikslėlis su įkeptu tekstu **nerodomas** — vietoje jo HTML/CSS tekstas (jokio teksto ant teksto). Trūkstami EN asset'ai matomi `npm run i18n:validate` → `CONTENT MISSING`.
- **FRAKCIJOS / RETUMAI / KORTŲ TIPAI:** vienas šaltinis `src/lib/i18n/gameContent.ts` (`useGameContent()` → `gc.faction/rarity/cardType`). Komponentai turi tik LT vardą — modulis susieja LT vardą → **ID** → `content_translations`. Prijungta: Home, Aktyvi kaladė, DeckSelect, Kaladės, Bendruomenės kaladės, PvE, Kolekcija (filtrai + detalės).
- **KOSMETIKA + PARDUOTUVĖ:** vienas įrašų šaltinis — parduotuvės prekei, kuri yra kosmetika, pirmiausia imamas `cosmetic` vertimas, tik tada `shop_item`.
- **ATLYGIAI:** `lib/rewards/rewardVisuals.ts` ir `rewardLabel.ts` nebeturi LT — pavadinimai/aprašai/etiketės per `rewards.*` raktus (pluralai: `{{count}} pack(s)`).
- **SEZONAS:** sezono pavadinimas iš DB → `content_translations` (owner_type `season`); UI raktai `quests.season.*`.
- **MEDALIAI/RANGAI:** `MEDAL_LABEL_LT` → `medalLabel()` per `ranked.medal.*`.
- **SERVER METADATA:** `generateMetadata()` + `getServerT()` (`src/lib/i18n/server.ts`) — puslapių titulai verčiami.
- **EN→LT FALLBACK REGISTRAS:** `core.ts` fiksuoja kiekvieną EN→LT kritimą → `window.__rvnI18nFallbacks` (e2e) + dev `console.warn`.
- **VALIDATORIUS:** `npm run i18n:validate` dabar rikiuoja pagal `ERROR / WARNING / CONTENT MISSING / INTENTIONAL EXCLUSION`; tikrina raktų parity, interpolaciją, **nežinomus raktus kode**, **rakto nutekėjimą**, **LT tekstą kode (įsk. žodžius be diakritikų)**, LT skaičių priesagas, nenaudojamus raktus ir **EN asset'ų pilnumą**.
- **E2E:** `e2e/english-localization.spec.ts` (`npm run e2e:en`, 20 testų): Home, modalai, maršrutų crawl, viewport matrica (844×390 … 1920×1080), `expectNoVisibleTranslationKeys`, `expectNoLithuanianUi`, fallback skaitiklis, baked-asset patikra.
- **DB:** migracija `20260834_content_translations_v2.sql` — EN kosmetikai (Įprasta/Nuodų/Žaibo/Žarijų/Šerkšno/Elektrinė nugarėlė, Nuotykių ieškotoja/-as), pakuotėms (Gėrio gynėjai, Tamsos aljansas), sezonams (PIRMASIS SEZONAS), starteriams + `content_translation_status` view.

**Būsena po v502:** 21 namespace, **1586 raktai**; `i18n:validate` → ERROR 0, WARNING 2 (ikonų/spalvų map'ai), CONTENT MISSING 5 (EN PNG). `i18n:scan` → 8 sąmoningos eilutės.
Pilnas originalus spec'as ir auditas: `I18N-AUDIT.md` (repo šaknyje). Atmintis: memory `ravenof-i18n`.

## KAS PADARYTA

### Architektūra (Fazė 2)
- **SAVAS i18n modulis** `src/lib/i18n/` — NE i18next (sandbox npm registrija blokuoja paketus, 403; nekeisti į biblioteką):
  - `config.ts` — `SupportedLocale = 'lt' | 'en'`, `LANGUAGE_OPTIONS`, cookie/LS raktas `rvn_locale`
  - `core.ts` — `t()` / `translate()` (interpoliacija `{{param}}`, daugiskaita per `Intl.PluralRules`: raktai `_one/_few/_many/_other`), `getLocale/setLocale/subscribe`, persistencija (cookie+LS+profilis), `formatNumber/formatDate/formatRelativeTime/formatList`
  - `react.tsx` — `useT()`, `useLocale()` (useSyncExternalStore, server snapshot='lt' → hydration-safe), `I18nBoot` (html lang + profilio kalbos užkrovimas; sumontuotas `app/digital/layout.tsx`)
  - `resources.ts` — statiniai JSON importai; NAUJAS NAMESPACE registruojamas ČIA
- **Vertimai:** `src/locales/{lt,en}/*.json` — 17 namespace, **841 raktai**. LT = šaltinis, EN = draft.
- **Rezoliucija:** sesijos pasirinkimas → `profiles.preferred_locale` → cookie/LS → `navigator.language` → `lt`. Be URL prefiksų (Capacitor remote shell suderinamumas).
- **Migracija:** `supabase/migrations/20260830_preferred_locale.sql` (gali būti dar NEPALEISTA — patikrinti!).
- **Selektorius:** `components/digital/ui/LanguageSelector.tsx` (LT|EN) — login, register, forgot, starter onboarding, SettingsModal („Kalba" kategorija), MoreScreen.
- **Validacija:** `npm run i18n:validate` (`scripts/i18n-validate.mjs`) — parity, interpolation, tuščios reikšmės. LEISTI PRIEŠ KIEKVIENĄ COMMIT + `npx tsc --noEmit`.

### Migruoti ekranai (Fazė 3 — VISKAS /digital UI)
Shell/nav (layout.tsx), SettingsModal, MoreScreen, DigitalAuthScreen, DigitalForgotPassword, StarterDeckOnboarding, StarterOnboarding, DigitalHub, DigitalCollection (+craft), DigitalPvE, DigitalPvP, PvPLobby, LoadingOrRetry, DigitalDecks, DigitalMyDecks, ActiveDeckSelectorModal+Summary, DeckSelect, DigitalDeckBuilder, ranked/* (visi 8), FriendsClient, GlobalChatLayer, TradeWindow, ShopModal, QuestsModal, SeasonPassModal, SeasonPathModal, LevelRoadModal, NotificationsModal, CosmeticsModal, DailyDealModal, DailyTasksModal, MonthlyLoginModal, PackOpen, WelcomeReward, ContentDownloadGate, HubKit, RewardBits, DigitalPicker, DigitalCommunityDecks.
Lib: deck-validation.ts, digital/activeDeck.ts, digital/starterMeta.ts (dvikalbis registras), social/chatStore.ts (PRESENCE_META getteriai), gamification/shop.ts (labelKey + PURCHASE_ERR_KEY).

### Konvencijos (laikytis!)
- React komponente: `const t = useT()` iš `@/lib/i18n/react`; ne-React kode: `t` iš `@/lib/i18n/core` (arba `t as tGlobal` jei komponente jau yra t).
- SAUGOTIS shadow'ų: `t` dažnai užimtas (map var, setTimeout, trade state) — tada alias `tt`/`fl` arba pervadinti vidinį kintamąjį.
- Raktai semantiniai: `ns.sritis.raktas`. Pildyti ABU lt+en JSON. Daugiskaita: lt reikia `_one/_few/_other` (kartais `_many`), en — `_one/_other`.
- Modulinio lygio const su tekstais → konvertuoti į `labelKey` + `t()` render'e ARBA per-locale objektus (žr. starterMeta.ts).
- Datos/skaičiai: `formatDate/formatNumber` iš core (ne `toLocaleDateString('lt-LT')`).

### Darbo aplinkos ypatumai (KRITIŠKA)
- Failus rašyti TIK per bash (`cat > file <<'EOF'` / python) — Write/Edit tool'ai desinchronizuoja mount'ą (žr. memory `ravenof-fs-write-sync`).
- Commit — TIK per Windows .bat (šablonas: GIT_LITERAL_PATHSPECS=1, taskkill git, del index.lock, add+commit+push → commitNN.log; žr. memory `ravenof-git-workflow`). NIEKADA `git stash` bash'e.
- npm install sandbox'e NEVEIKIA (403) — jokių naujų dependencies.
- Švieži Windows-pusės binariniai failai bash'e gali matytis truncated (pvz. nauji PNG) — apdorojimą daryti .bat viduje Windows pusėje (pvz. tools/resize-nav-icons.mjs commit491).

## LAUKIA VARTOTOJO VEIKSMŲ (patikrinti prieš tęsiant)
1. `git-commit493.bat` (f5), `494` (f4), `495` (f6), `496` (f7), `497` (f8), `498` (f9) — paleisti eilės tvarka, patikrinti `commitNN.log`.
2. Supabase migracijos: `20260830_preferred_locale.sql`, `20260831_content_translations.sql`, `20260832_card_translations.sql`, `20260833_localized_audio.sql`.
3. Po migracijos: `select owner_type, count(*) from content_translations where locale='en' group by 1;` — patikrinti, ar frakcijos/retumai/kortų tipai gavo EN (jei 0 → DB LT pavadinimai skiriasi nuo migracijoje išvardytų; pataisyti `join` reikšmes).
4. Smoke test EN kalba: kova (log + UI), dienos užduotys/darbai, parduotuvė, kosmetika, reitingo pasiekimai, kolekcijos frakcijų filtras.

## KĄ DARYTI TOLIAU (fazių eilė)

### Fazė 5 — Combat log + kovos UI ✅ BAIGTA (commit493)
- **Struktūrinis log'as:** `GameEvent` dabar turi `key` + `params` (msg = deprecated, paliktas tik atgaliniam suderinamumui). Tekstas gimsta TIK render'e → pakeitus kalbą persirenderuoja ir istoriniai įrašai.
  - Rezolveris: `src/lib/tutorial/logText.ts` — `eventText(e, t)`, `ltext(key, params, t)`, `resultText(r, t)`.
  - Params reikšmė su `$t:` prefiksu = įdėtas vertimo raktas (pvz. `$t:statusEffects.frozen.name`); engine'e naudok `tref('...')`.
  - Šoniniai variantai: `SK(side)` → `you|ai` rakto sufiksas (2v2 seat'ai suvedami). Bendriems sakiniams: `battleLog.side.*` (Tu/Priešininkas), `battleLog.sideGen.*` (tavo/priešininko).
  - Konvertuota: engine.ts (163 log'ai), effectEngine.ts, curseEngine.ts, triggerSystem.ts.
- **PlayResult.reason = i18n raktas** (`battleLog.err.*`) + `reasonParams`; UI rodo per `resultText()`. FX/kino atrankos TutorialGame'e nebesiremia LT regex'ais — tikrina `e.key` (`SUMMON_BY_EFFECT_KEYS`, `battleLog.playChampion*`, `battleLog.statusEnd`, `battleLog.playUnitSprint*`).
- **Nauji namespace:** `battleLog` (log + err) ir `statusEffects` (13 statusų name/tooltip + keyword vardai). `statusVfx.ts` nebeturi LT stringų — `statusName(id)` / `statusTooltip(id)` / `statusNameRef(id)`.
- **UI:** TutorialGame (visi tekstai, toast'ai, modalai, pergalės ekranas), BattleLayout, PracticeButton (frakcijų aprašai — dvikalbis registras iki Fazės 4), script.ts (GUIDED_STEPS + MECHANIC_TIPS → `battle.guided.*` / `battle.tips.*`).
- Iš viso 19 namespace, **1372 raktai**. `npx tsc --noEmit` švarus, `node scripts/i18n-validate.mjs` 0 klaidų.
- LIKO Fazėje 5: Team2v2Game/DigitalCoop UI (SCRAPPED iš nav, nemigruota), `lib/tutorial/ai.ts` dev log'ai (galima palikti).

### Fazė 4 — DB turinys ✅ BAIGTA (commit494, migracija 20260831 PENDING)
- **`content_translations`** (owner_type, owner_id, locale, field, value) — viena generinė lentelė visam DB turiniui. RLS: read=visi, write=admin. Helperis `rvn_set_translation(...)`.
  - owner_type: `daily_quest` (key) · `daily_task` (template id) · `shop_item` (slug) · `cosmetic` (id) · `ranked_achievement` (key) · `faction` (id IR slug) · `rarity` (id) · `card_type` (id) · `card_pack` (id) · `starter_deck` (id) · `lore_faction` (id).
  - LT snapshot'ai įrašomi iš esamų lentelių (admin redagavimui); LT vis tiek lieka runtime fallback'as.
  - EN įrašyta: dienos užduotys, dienos darbai, parduotuvės prekės, kosmetika, reitingo pasiekimai, frakcijos, retumai, kortų tipai. NĖRA EN: card_packs, starter_decks (DB sukurti per admin — pildyti Fazėje 8 admin įrankiu).
  - ⚠ frakcijų/retumų/tipų EN įrašai siejami per LT pavadinimą (`join ... on x.lt = f.name`) — jei DB pavadinimas kitoks, EN eilutė tiesiog neįsirašo → fallback LT. Po migracijos verta pasitikrinti: `select owner_type, count(*) from content_translations where locale='en' group by 1;`
- **Kliento resolveris** `src/lib/i18n/content.ts`: `loadContentTranslations(locale)` (LT = no-op, sessionStorage cache), `tContent(...)`, React hook **`useContent()`** → `tc(ownerType, id, field, fallbackLT)`. Trūkstamas vertimas → LT + dev warning konsolėje. Užkraunama automatiškai per `I18nBoot`.
- **Prijungta:** QuestsModal, DailyTasksModal, ShopModal, CosmeticsModal, ranked/Achievements, DigitalCollection (frakcijų filtras), DigitalDeckBuilder, DigitalPvE, PracticeButton.
- **RPC pakeitimas:** `rvn_get_daily_tasks` dabar grąžina ir `templateId` (be jo nebūtų kaip rasti vertimo) → `DailyTask.templateId` TS tipe.
- **Level titulai:** `lib/gamification/levels.ts` `LEVEL_THRESHOLDS[].title` = i18n raktas (`progression.levelTitle.N`, naujas namespace, 49 titulai LT+EN).
- LIKO Fazėje 4 (sąmoningai atidėta): kampanijos seed'ai (`data/campaignSeeds/prazarasVarngradasCampaign.ts`, 641 eil.) + campaign/* ekranai; `data/tutorialLessons/lessonSeeds.ts` (295 eil.); SQL RPC `raise exception` LT žinutės → stabilūs kodai; rarity/card_type pavadinimai, naudojami kaip LOGIKOS raktai (TYPE_ORDER, spalvų map'ai) — tvarkyti kartu su Faze 6.

### Fazė 6 — Kortos ✅ INFRASTRUKTŪRA BAIGTA (commit495, migracija 20260832 PENDING; EN turinį reikia suvesti)
- **Migracija `20260832_card_translations.sql`:**
  - `card_translations` (card_id, locale, name, description, effect_text, flavor_text, status draft|review|approved) — PK (card_id, locale).
  - `card_assets` (card_id, locale, asset_type, url) — EN kortos PNG (LT tekstas ĮKEPTAS į vaizdą).
  - LT snapshot'ai iš `cards`; RPC `rvn_set_card_translation` / `rvn_set_card_asset`; view `card_translation_status` (pilnumo ataskaita adminui).
- **Resolveris `src/lib/cards/i18n.ts`:** `ensureCardTranslations()`, `cardText()`, `cardImage()`, `localizeCardRow()`, `localizeTutCard()`; React: `useCardI18n()` → `cx.name/effect/description/image`.
  - ⚠ **AUKSINĖ TAISYKLĖ:** variklio `parseEffect()` / `detectKeywords()` dirba su **LT** `effect_text`. Todėl kortą PIRMA suparsink iš LT teksto, tik TADA per `localizeTutCard()` perrašyk rodomus laukus (name/effectText/image). `effect`/`mappings` niekada nelokalizuojami.
  - `CardPool.byName` raktai lieka LT (DB `r.name`), nors rodomas vardas lokalizuotas.
- **Prijungta:** cardPool.ts, TutorialGame (mapDbCard), team2v2 load/pvp, DigitalCollection, DigitalDeckBuilder (lokalizuoja visą `cards` prop'ą → paieška/rikiavimas veikia rodoma kalba), DigitalMyDecks, PackOpen, DailyDealModal.
- **Turinio įrankis `tools/cards-i18n.mjs`** (`npm run cards:i18n`):
  - `export --locale en [--only-missing] [--format json]` → CSV/JSON su LT stulpeliais + tuščiais EN.
  - `import --locale en --in tools/cards-en.csv [--status draft] [--dry]` → `card_translations` (validacija: per ilgi vardai, LT raidės EN lauke).
  - `images --locale en --in tools/cards-en-images.csv` (card_id|card_number + url) → `card_assets`.
  - `status --locale en` → pilnumo ataskaita. Rašymui reikia `SUPABASE_SERVICE_ROLE_KEY`.
- **LIKO:** (a) suvesti EN kortų tekstus per įrankį; (b) EN kortų PNG (arba dinaminis tekstas ant vaizdo); (c) rarity/card_type pavadinimai, naudojami kaip LOGIKOS raktai (`mapCardType`, TYPE_ORDER, spalvų map'ai) — jei kada EN vertimai bus dedami į patį `cards` select'ą, ŠIE laukai turi likti LT; (d) PNG su įkeptu LT tekstu ne kortose (home/battle-modes, ai/types, cta2.png, heading.png).

### Fazė 7 — Audio ✅ BAIGTA (commit496, migracija 20260833 PENDING; EN balsų dar nėra)
- **Migracija `20260833_localized_audio.sql`:** `localized_audio` (owner_type card|avatar, owner_id, locale, trigger, url, transcript, weight, sort_order, enabled).
  - LT duomenys AUTOMATIŠKAI perkelti: `cards.gameplay->'voiceLines'` → trigger `summon`; `avatar_audio` → trigger = event_type.
  - RPC `rvn_get_localized_audio(owner_type, ids[], locale)` (skaitymas) ir `rvn_set_localized_audio(...)` (admin/įrankiai); view `localized_audio_status`.
  - Senos struktūros (`gameplay.voiceLines`, `avatar_audio`) NEIŠIMTOS – lieka kaip LT fallback.
- **Resolveris `src/lib/game/audioI18n.ts`:** `loadVoices(owner, ids)`, `cardVoiceUrls(cardId, ltFallback)`, `avatarMapFor(ids, ltMap)`, `voiceTranscript(...)`.
  - **Fallback politika:** pasirinkta balsų kalba → (jei įjungtas nustatymas) LT → **tyla**. Garso efektai (SFX) niekada nedingsta.
- **Nustatymai (`lib/settings.ts` + SettingsModal → „Kalba"):** `voiceLocale` ('auto' = UI kalba | 'lt' | 'en') ir `voiceFallbackLt` (bool). Sinchronizuojama į `profiles.digital_settings`.
- **Prijungta:** TutorialGame — kortų balsai (`playCardVoice(cardVoiceUrls(...))`, prefetch ant draw) ir avatarų žemėlapis (`avatarMapFor`). Balsai užkraunami abiejų kaladžių kortoms.
- **Įrankis:** `node tools/cards-i18n.mjs audio --owner card|avatar --locale en --in file.csv` (CSV: card_id|card_number|owner_id, trigger, url, transcript?, weight?). `status --locale en` rodo ir balsų kiekius.
- **LIKO:** įrašyti/sugeneruoti EN balsus ir suvesti per įrankį; admin UI balsams per locale — Fazė 8.

### Fazė 8 — Admin ✅ BAIGTA (commit497)
- **Naujas puslapis `/admin/i18n`** (`src/app/admin/i18n/page.tsx` + `components/admin/i18n/AdminI18nClient.tsx`), nuoroda admin NAV juostoje:
  - **Kortos (EN):** sąrašas su filtrais (trūksta / daliniai / sutvarkyta / visos) + paieška; inline redagavimas: EN name / effect_text / description / flavor_text, `status` (draft|review|approved), EN kortos vaizdo URL (`card_assets`), EN iškvietimo balsų URL (`localized_audio`, po vieną eilutėje). Rodoma po 200 – masiniam darbui CLI.
  - **Turinys (EN):** `content_translations` redaktorius (LT reikšmė šalia EN įvesties; tuščias laukas = vertimas ištrinamas → fallback LT).
  - **Ataskaita:** kortų EN pilnumas (%), daliniai, trūkstami, EN vaizdai, EN balsai, turinio įrašai.
- **Kortos redagavimo puslapyje** (`/admin/cards/[cardId]`) — blokas „🌍 EN vertimas" (`CardTranslationPanel`): tekstai + EN vaizdas + EN balsai vienoje vietoje, su priminimu, kad variklis parsina LT tekstą.
- **Editorial statusai:** žaidėjams rodomi TIK `approved` vertimai (resolveris filtruoja `status = 'approved'`).

### Fazė 9 — QA ✅ BAIGTA (commit498)
- **Playwright `e2e/i18n.spec.ts`** (`npm run e2e:i18n`), 14 testų:
  - kalbos selektorius (LT→EN be reload, `<html lang>`), persistencija (cookie + localStorage + po reload), grįžimas į LT;
  - `navigator.language=en-US` → EN sąsaja be pasirinkimo;
  - EN maršrutų padengimas (`/digital`, collection, decks, pve, pvp, ranked): jokių neišverstų raktų, jokių likusių LT UI tekstų (kortų/DB turinio LT fallback laikomas LEGALIU);
  - kovos log persirenderinimas: kovoje perjungiama kalba per `window.__rvnSetLocale` (E2E kabliukas `I18nBoot`) → istoriniai log įrašai persiverčia (struktūrinis log veikia);
  - EN teksto ilgis: 844×390 ir 1280×720 hub be page-scroll ir be raktų.
  - Helperiai `e2e/helpers.ts`: `presetLocale`, `switchLocale`, `visibleLithuanianText`, `rawI18nKeys`.
- **Statinis skeneris `scripts/i18n-scan-lt.mjs`** (`npm run i18n:scan`, `npm run i18n:check` = validate + scan): randa LT tekstus /digital apimties failuose. Šiuo metu **19 įtartinų eilučių 14 failų** — visos peržiūrėtos ir sąmoningai paliktos:
  - server-komponentų `metadata.title` (LT) — vertimas padarytų route'us dynamic, spręsta palikti;
  - LT kaip LOGIKOS raktai (`TYPE_ORDER`, ArenaBackground frakcijų vardai, STATUS_META/KEYWORD_META fallback registrai);
  - dvikalbiai registrai (PracticeButton FACTION_DESC), botų vardai, admin/seed įrankiai, kampanija (Fazės 4 likutis).
- **Pakeliui sutvarkyta:** tutorial2 (TutorialHub, TutorialDirector), TutorialButton, kino overlay, `craft.ts` klaidų kodai, `dailyTasks` DIFF_LABEL, `ranked` sezono laikmatis / milestone atlygiai / rarity etiketės, `levels.ts` rango grupės, mėnesio prisijungimo etiketės, native notifikacijos. **1499 raktai.**

## LIKĘ DARBAI (ne kodas)
1. EN kortų tekstai: `/admin/i18n` arba `npm run cards:i18n -- export --locale en --only-missing` → užpildyti → `import`.
2. EN kortų PNG (tekstas įkeptas į vaizdą) → `card_assets` (admin laukas arba `cards-i18n.mjs images`).
3. EN balsai → `localized_audio` (`cards-i18n.mjs audio`).
4. Kampanija + tutorial lessons seed'ai (Fazės 4 likutis) ir SQL RPC `raise exception` LT žinutės → stabilūs kodai.
5. PNG su įkeptu LT tekstu ne kortose (home/battle-modes, ai/types, cta2.png, heading.png) → EN variantai.

### Likę smulkūs LT (žinomi, sąmoningai palikti)
- DigitalCoop / DigitalPvp2v2 / Team2v2Game — SCRAPPED iš nav (commit218), nemigruota.
- `lib/ranked/bots.ts` (52) — botų vardai; galima palikti (allowlist) arba EN vardų sąrašas.
- `lib/ranked/achievements.ts` (33), `lib/gamification/levels.ts` (31) — turinio registrai (Fazė 4).
- console.warn/error dev žinutės — leidžiama palikti.
- SQL RPC `raise exception` LT žinutės → stabilūs kodai (spec Part 21) — kartu su Faze 4/5.
- Web portalas (lore, turnyrai, market, rules, life-tracker, ~620 eil.) — NE apimtyje, vėliau.

## GREITAS STARTAS KITAI SESIJAI
1. `cd "/sessions/<vm>/mnt/Ravenof kortų portalas/ravenof-portal"` (kelią žr. Shell access sekcijoje)
2. `git log -1 --oneline` — patikrinti ar 490–492 sucommitinti; `node scripts/i18n-validate.mjs`; `npx tsc --noEmit`
3. Kodo darbų nebeliko — visos 9 fazės baigtos. Liko turinio suvedimas (žr. „LIKĘ DARBAI"). Prieš kiekvieną commit: `npm run i18n:check` + `npx tsc --noEmit`; E2E: `npm run e2e:i18n` (reikia E2E_TEST_EMAIL/PASSWORD).
