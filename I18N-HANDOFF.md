# RAVENOF i18n — PERDAVIMO DOKUMENTAS (handoff)

Data: 2026-07-12. Fazės 1–5 BAIGTOS (commit490, 492, 493, 494). Šis failas — tęsimo instrukcija.
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
1. `git-commit493.bat` (fazė 5) ir `git-commit494.bat` (fazė 4) — paleisti eilės tvarka, patikrinti `commitNN.log`.
2. Supabase migracijos: `20260830_preferred_locale.sql` ir `20260831_content_translations.sql` — paleisti (run-migrations.bat arba SQL editor).
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

### Fazė 6 — Kortos
- DB: `card_translations` (card_id, locale, name, description, effect_text, flavor_text, UNIQUE(card_id,locale)) + `card_assets` (card_id, locale, asset_type, url) — kortos vaizdas turi įkeptą LT tekstą, reikia EN vaizdo lauko.
- Centralizuotas resolveris (name/effect/image pagal locale su fallback LT + dev warning) — naudoti VISUR (kolekcija, builder, ranka, lenta, log, pack open, shop, admin).
- PASTABA: cards id = uuid; rarities/factions/card_types id = integer (memory `ravenof-db-id-types`).
- PNG su įkeptu LT tekstu (ne kortos): home/battle-modes/*.png, ai/types/*.png, ai/difficulty/*.png, cta2.png, heading.png — reikia EN variantų (pvz. `-en` sufiksas + locale resolveris).

### Fazė 7 — Audio
- `localized_audio` modelis (owner_type card|avatar, owner_id, locale, trigger, url, transcript, sort_order). Dabar: `avatar_audio` lentelė, `gameplay.voiceLines` JSONB, card-audio bucket — LT only. Fallback politika: EN → (nustatymas) LT → tyla. voiceManager (lazy+LRU) integracija.

### Fazė 8 — Admin
- Kortų redagavimas tab'ais (LT / EN / Gameplay / Assets / Audio), audio upload per locale, missing-translation ataskaitos, editorial statusai (draft/review/approved). `app/admin/*` UI pats irgi LT (~750 eil.) — žemesnė prioritetė (adminas gali likti LT, spec to nedraudžia, bet content-valdymo įrankiai EN turiniui būtini).

### Fazė 9 — QA
- Playwright: language-selector, locale-persistence, english-* route coverage (spec sąrašas), combat-log rerender, layout 844×390…1920×1080. e2e/ katalogas jau yra; ContentDownloadGate turi webdriver skip (uncommitted pakeitimas working tree — peržiūrėti).
- `<html lang>`: nustatomas kliente per I18nBoot tik /digital — jei reikia visam app, perkelti į root layout klientinį boot.
- Page metadata (`app/digital/*/page.tsx` title'ai LT) — generateMetadata + cookies() padarytų routes dynamic; spręsti sąmoningai.

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
3. Tęsti nuo **Fazės 6 (kortos)** — `card_translations` + `card_assets` + centrinis resolveris (tas pats principas kaip `content.ts`: raktas → vertimas → LT fallback). Tai didžiausias likęs blokas. Alternatyva: užbaigti Fazės 4 likučius (kampanija, tutorial lessons, SQL klaidų kodai).
