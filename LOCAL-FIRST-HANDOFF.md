# Ravenof Digital – local-first handoff (2026-09-06)

Planas: `../RAVENOF-GODOT-PLANAS.html` (v2, web-tech local-first). Šis failas – kas padaryta kode,
kaip paleisti ir kas liko tavo pusėje. **Senas web/Vercel/Capacitor-remote build'as NEPAKEISTAS** –
viskas nauja įjungiama tik env kintamaisiais arba atskirais entry point'ais.

## Kas naujo repo

| Kelias | Kas |
|---|---|
| `apps/digital/` | Vite SPA bundle'as iš tų pačių `src/` komponentų. `npm run app:build` → `apps/digital/dist`. Shim'ai `next/link|navigation|dynamic|image`, `@/lib/supabase/server`, `@/lib/i18n/server`. 4 serverio puslapiai → `src/screens/`. |
| `apps/digital/src/mediaShim.ts` | Supabase Storage URL → vietinis `/media/...` (setAttribute/src/Audio/fetch/backgroundImage patch'ai). |
| `apps/digital/src/fpsOverlay.ts` | `?fps=1` – fps/heap overlay perf matavimui (go/no-go Godot klausimui). |
| `tools/build-media.mjs` | `npm run media:build` – rvn_media_manifest → `apps/digital/media/` + manifest.json (tier<=1; `--tier 2` video). |
| `tools/export-content.mjs` | `npm run content:export` – kortos/frakcijos/ŽMK → `apps/digital/media/content/*.json` + versija. |
| `src/lib/offline/` | `kv.ts` (IndexedDB), `offlineFetch.ts` (supabase-js transportas: read cache + rašymų eilė decks/deck_cards/profiles + rpc set_active_deck/deck_avatar/save_settings), `sync.ts`, `warm.ts`. Įjungta TIK app bundle'e (`window.__RAVENOF_APP_BUNDLE__`). |
| `src/lib/supabase/client.ts` | bundle'e naudoja offlineFetch; web'e – kaip buvo. |
| `src/lib/digital/mediaDownloader.ts` | `diffMissing` praleidžia bundle'e esančius failus. |
| `capacitor.config.ts` | `RAVENOF_NATIVE=local` → `webDir apps/digital/dist`, be server.url. Be env – senas remote režimas. |
| `build-apk-local.bat` | app:build → media:build → cap sync (local) → gradle assembleDebug. |
| `src/lib/pvp/serverChannel.ts` | Supabase Realtime kanalo drop-in pakaitalas per WebSocket į apps/server. |
| `src/components/tutorial/TutorialGame.tsx` | `serverMode` (env `NEXT_PUBLIC_PVP_SERVER_URL` arba `net.server`): abu klientai – svečiai, serveris – host'as; `deck` payload + `curses`; `reject` toast'as. Be env – elgsena identiška senai. |
| `apps/server/` | Node PvP serveris (ws + jose) su tuo pačiu `engine.ts` (esbuild bundle). Redakcija (priešo ranka/kaladė paslėpta), ėjimo teisių validacija, reconnect grace 60 s. `npm run server:build` / `server:start`; `apps/server/test/e2e.mjs` dūminis testas; Dockerfile + docker-compose + Caddyfile. |
| `apps/desktop/` | Electron shell (app:// protokolas su SPA fallback) + steamworks.js (achievement'ai, overlay). `README.md` viduje. |
| `supabase/migrations/20260906_purchases.sql` | `purchases`, `iap_products`, `rvn_grant_purchase` (service role → rvn__grant_reward_payload). **PENDING run.** |
| `supabase/functions/verify-receipt/` | Edge function: Google Play patikra įgyvendinta, Apple/Steam – TODO. |
| `src/lib/digital/iap.ts` | Kliento karkasas: produktų sąrašas, kvito pateikimas, platformos detekcija. UI dar neprijungta. |
| `src/lib/game/rng.ts`, `scripts/fixtures/`, `fixtures/` | (Fazė 0) deterministinis variklis + aukso fixture'ai – regresijai ir serverio testams. |

## Tavo pusė (eilės tvarka)

1. **Vercel** retention (Settings → Security → Deployment Retention: Pre-Prod/Canceled/Errored 1 d., Production 7 d.) + ištrinti senus preview deployment'us.
2. `npm install` (nauji dev dep: vite, @vitejs/plugin-react, react-router-dom, @fontsource/*, ws, jose, @types/ws).
3. `git-commit662.bat` (Fazė 0) ir `git-commit663.bat` (viskas iš šio handoff'o) – patikrinti .log.
4. **Perf testas (Fazė A go/no-go):** `build-apk-local.bat` (reikia `.env.local`, Android SDK; pirmą kartą `npm run media:build` traukia ~100 MB) → APK į 2–3 telefonus → kova su `?fps=1` (arba `localStorage.rvn_fps=1`). Tikslas ≥45 fps vidutiniame 2022 m. telefone.
5. Supabase: paleisti `20260906_purchases.sql`; kai bus Google Play Console – `supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON=... GOOGLE_PACKAGE_NAME=app.ravenof.game`, `supabase functions deploy verify-receipt`.
6. **PvP serveris:** Hetzner CX22 + Docker; `.env` su `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` (Dashboard → Settings → API → JWT Secret); `docker compose -f apps/server/docker-compose.yml up -d --build`; Caddy TLS `play.ravenof.lt`. Tada web/app build'e `NEXT_PUBLIC_PVP_SERVER_URL=https://play.ravenof.lt` – nuo to momento PvP eina per serverį (abu klientai turi būti naujo build'o).
7. Steam: `cd apps/desktop && npm install && npm run build:app && npm start`; su App ID – `steam_appid.txt`; `npm run dist:win` → depot.
8. Cloudflare Pages (web versija app bundle'o): `apps/digital/dist` su `_redirects` (jau generuojamas) – `wrangler pages deploy apps/digital/dist`. Portalas + admin (Next) – atskiras Pages projektas su `@opennextjs/cloudflare` (kai norėsi išjungti Vercel).

## Žinomi apribojimai / TODO

- Offline: pirmas paleidimas reikalauja tinklo (auth + cache pašildymas); po to kolekcija/kaladės/PvE veikia be tinklo. Rašymai offline – tik kaladės/nustatymai/aktyvi kaladė (eilė); pakai, quest atsiėmimas, ranked – tik online (taip ir turi būti).
- Auth offline: sesija iš cookie; po access token galiojimo (1 val.) be tinklo `auth.getUser()` grąžina kešuotą atsakymą; refresh įvyks su tinklu.
- Svečio režimas (anonymous auth) – neįjungtas (reikia Supabase Auth nustatymo + RLS peržiūros).
- PvP serveris: rezultatą vis dar raportuoja klientai (`rvn_report_match`); serverio raportavimas su service role – Fazė C.2. Ėjimo laikmatis – neįgyvendintas. Rematch – kaip anksčiau (naujas match).
- Electron: cookies su app:// – patikrinti Supabase auth (jei nelaikys – pereiti į supabase-js localStorage storage'ą bundle'e; vienos eilutės keitimas `client.ts`).
- iOS: reikia Mac; `limitsNavigationsToAppBoundDomains` jau nustatyta local režime (SW cache'ui).
- `ravenof-godot/` – paliktas eksperimentas (Godot atidėtas).
