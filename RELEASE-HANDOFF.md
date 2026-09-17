# Release sistema: kanalai, rollback, OTA updater (commit693)

Planas: Claude projekto doc `claude/release-rollback-updater-planas.md`. Čia – kas įgyvendinta ir kaip naudotis.

## Kas įgyvendinta (E1–E3)

| Dalis | Failai |
| --- | --- |
| DB: bundle'ai, kanalai, auditas, vartai, telemetrija, RPC | `supabase/migrations/20260918_app_releases.sql` |
| Publikavimas (build → hash → upload pakeistų failų → registracija į `admin`) | `tools/publish-bundle.mjs`, `release.bat`, npm `release:*` |
| Kliento updater'is (bendras) | `src/lib/updater/{types,core,capgoAdapter,electronAdapter}.ts` |
| UI: techniniai darbai / reikia naujos versijos / privalomas update / „Atnaujinimas paruoštas" | `apps/digital/src/UpdateLayer.tsx` (+ `main.tsx`, `ErrorBoundary.tsx`) |
| Desktop OTA + savisauga (main procese) | `apps/desktop/updater.js` (+ `main.js`, `preload.js`, `package.json`) |
| Android OTA | `@capgo/capacitor-updater` (manual režimas) – `capacitor.config.ts`, `package.json`, `build-apk-local.bat` |
| Admin ekranas | `src/app/admin/releases/` (+ nuoroda `src/app/admin/page.tsx`) |
| `dist/version.json` (kad EXE žinotų savo builtin versiją) | `apps/digital/vite.config.ts` |

Patikrinta cloud'e: migracija pritaikyta 2× (idempotentiška) ir visas publish → promote → rollback → revoke → vartai → override scenarijus ant tikro Postgres 16; `updater.js` – su Electron mock'u (delta, atidėtas pritaikymas, nepatvirtinto bundle'o atmetimas, sugadinto failo ir `../` kelio atmetimas, naujo installerio reset); `core.ts` – sprendimų simuliacija; visi TS failai – `tsc --strict`.
**NEpatikrinta (reikia tavo įrenginių):** realus Capgo elgesys Android'e ir realus Electron build'as. Žr. „Generalinė repeticija".

## Vienkartinis paruošimas

1. **Migracija**: Supabase SQL Editor → įklijuok `supabase/migrations/20260918_app_releases.sql` → Run.
2. **`npm install`** repo šaknyje (naujas `@capgo/capacitor-updater`); įkomitink ir `package-lock.json`.
3. **Admin slaptažodis publikavimui**: `tools/publish-bundle.mjs` jungiasi kaip admin vartotojas (service-role rakto nereikia). Sukurk `.env.publish.local` (gitignored):
   ```
   RAVENOF_ADMIN_EMAIL=...
   RAVENOF_ADMIN_PASSWORD=...
   ```
   Jei admin paskyra tik per Google – Supabase Dashboard → Authentication → vartotojui nustatyk slaptažodį. Be failo – skriptas paklaus terminale.
4. **Surink installerius** (jie turi turėti updater'į – seni APK/EXE atsinaujinti NEMOKA):
   - Android: `build-apk-local.bat` (pats įdiegia pluginą, daro `cap sync` ir `--mark-baseline android`).
   - Desktop: `cd apps/desktop && npm run build:app && npm run dist:win`, tada šaknyje `npm run release:baseline:desktop`.
   - Įkomitink `apps/digital/baselines/*.json`.
5. `/admin/releases` → Vartai: įrašyk APK / EXE atsisiuntimo nuorodas.
6. **Keystore kopijos** (2 vietose). Praradus – visiems žaidėjams teks išdiegti žaidimą.

## Kasdienis release

1. Padidink `APP_VERSION` (`src/lib/version.ts`) – kaip ir dabar per kiekvieną commit'ą. Bundle'ai nekeičiami: ta pati versija antrą kartą nepublikuojama.
2. Jei reikia – pirma migracija (tik backward-compatible!), tada kodas.
3. `release.bat --notes-lt "Kas pakeista" --notes-en "What changed"` → bundle'as atsiranda **tik `admin` kanale**.
4. Paleisk žaidimą (APK / EXE) kaip adminas → apačioje „Atnaujinimas paruoštas" → „Atnaujinti dabar" → patikrink (login, kolekcija, kova su DI, PvP, pirkimas, pack open).
5. `/admin/releases` → **Patvirtinti → tester**. Po ≥24 h be kritinių klaidų → **Patvirtinti → stable** (prašo įvesti versijos numerį).
6. Kažkas blogai → **Rollback** tame kanale (sekundės; klientai grąžinami priverstinai per kitą patikrinimą: paleidimas, grįžimas į langą, kas 15 min., išėjus iš partijos).

`release.bat --dry` parodo, kiek failų būtų įkelta. Tipinis update – `index.html` + keli `assets/*.js|css` (keli MB).

## Kaip tai veikia (trumpai)

- Kanalą parenka **serveris** pagal `profiles.role` (`admin` → admin, `tester` → tester, kiti ir neprisijungę → stable). Tuščias kanalas krenta žemyn. Override konkrečiam žaidėjui – `rvn_admin_release_override` (UI: „Mano kanalas žaidime").
- Manifestas = visų `dist` failų sąrašas su SHA-256. Klientas siunčia tik tuos, kurių neturi installeryje / ankstesniame bundle'e. `media/*` URL rodo į originalų Storage failą (nedubliuojama), `public/*` praleidžiami pagal baseline.
- Neprivalomas update'as siunčiamas fone ir įsigalioja per kitą **šaltą** paleidimą (Android: Capgo delay `kill`; desktop: `pending`). Partijos metu niekas neperkraunama.
- Privalomas (`mandatory`): po rollback / revoke / override – blokuojantis ekranas su progresu, tada perkrovimas. Partijos metu atidedama iki išėjimo iš jos.
- **Savisauga**: naujas bundle'as per 20 s turi patvirtinti „užsikroviau" (`core.ts → confirmBundle`). Jei ne (baltas ekranas, chunk'o klaida, React medis nulūžo per pirmas 20 s) – shell'as pats grąžina ankstesnį, klientas praneša `rolled_back` ir tos versijos 24 h nebesiunčia. Tai matosi `/admin/releases` („auto-rollback").
- Žemyn savaime nesileidžiama (kad šviežiai surinktas installeris nebūtų „atnaujintas" į senesnį kanalo bundle'ą) – tik kai privaloma.

## Kada reikia naujo APK / EXE

Tik keičiant native dalį: Capacitor/Electron versija, pluginai, leidimai, `main.js`/`preload.js`/`updater.js`, ikonos. Tada: surink → įkelk → `--mark-baseline <platforma>` → `/admin/releases` „Min. APK/EXE versija" (arba `release.bat --min-shell-android 1.0.N`). Seni klientai pamatys „Reikia naujos žaidimo versijos" su nuoroda.

**Baseline taisyklė:** failas nekeliamas į Storage tik jei jis tuo pačiu keliu ir hash'u yra VISUOSE `apps/digital/baselines/*.json`. Jei lauke yra senesnių installerių nei baseline – arba pakelk `min_shell`, arba publikuok su `--upload-all`.

## Generalinė repeticija (prieš dalinant testeriams)

1. Įdiek APK ir EXE (builtin N). Prisijunk kaip adminas viename, kaip paprastas `user` kitame įrenginyje.
2. N+1: `release.bat` → adminas gauna, `user` – ne. Patvirtink iki stable → `user` gauna.
3. N+2 tyčia sugadintas (`throw` `apps/digital/src/main.tsx` pradžioje) → adminas: po ~20 s pats grįžta į N+1; `/admin/releases` rodo auto-rollback. **Atšauk** šį bundle'ą.
4. N+3 su „logikos klaida" → iki tester → **Rollback** tester kanale → testeris grąžinamas, `user` nieko nepastebi.
5. Vartai: įjunk techninius darbus; pakelk min. versiją – abu klientai rodo atitinkamus ekranus.
6. Android: lėktuvo režimas paleidžiant → žaidimas startuoja normaliai (updater'is tvarkingai nulūžta į offline).

## Dar nepadaryta (iš plano)

E4 `engine_version` PvP matchmaking'e ir `apps/server` handshake · E5 `content_history` (kortų config'ų istorija/atstatymas) + kill-switch flag'ų tikrinimas ekranuose/RPC · E6 `client_errors` + Discord webhook · E7 `electron-updater` apvalkalui, staging DB, Vercel staged production · DB backup'ai (Supabase Pro daily + naktinis `supabase db dump`).
