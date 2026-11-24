# Ravenof desktop (Windows / Steam) shell

## Windows installer (be Steam) – žingsniai

```
cd "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal\apps\desktop"
npm install                      # electron + electron-builder (pirmą kartą ~5 min, ~300 MB)
npm run build:app                # apps/digital/dist + media (tas pats bundle'as kaip Android)
npm start                        # išbandyti: atsidaro langas su žaidimu
npm run dist:win                 # release\Ravenof-Setup-0.1.0.exe  (NSIS installeris)
```

Installeris įdiegia į `%LOCALAPPDATA%\Programs\Ravenof`, sukuria darbalaukio nuorodą. Visi asset'ai
(kortos, garsai, UI) – viduje; internetas tik paskyrai/sync/PvP.

Nauja versija: pakelti `version` šiame package.json → `npm run build:app` → `npm run dist:win`.

## Steam
- **App ID**: `steam.js` → `DEFAULT_APP_ID` (dabar 480 = Valve testinis „Spacewar"). Paleidus per Steam App ID ateina iš
  `SteamAppId` env; dev metu galima `steam_appid.txt` arba `STEAM_APPID`. Steam klientas turi veikti.
- **Prisijungimas per Steam**: `steam.js authTicket()` (getAuthTicketForWebApi('ravenof')) → `src/lib/digital/steam.ts` →
  edge funkcija `supabase/functions/steam-auth` (AuthenticateUserTicket) → `verifyOtp`. Susiejimai – lentelė `steam_accounts`.
  Supabase secrets: `STEAM_WEB_API_KEY` (Steamworks → Users & Permissions → Manage Groups → Web API key),
  `STEAM_APP_ID`, pasirinktinai `STEAM_API_HOST` (numatyta partner.steam-api.com).
- **Achievement'ai**: `steam.js` ACH_MAP (badge slug → Steam API name) – sukurti ir Steamworks puslapyje.
- **Overlay**: `--in-process-gpu` jau įjungtas.
- **Įkėlimas (SteamPipe)**: šaknyje `build-steam.bat` (surenka `release\win-unpacked` ir per SteamCMD įkelia
  `steam\app_build.vdf`). Nustatymai – `.env.steam.local` (žr. `.env.steam.local.example`). Build'as keliamas ne live –
  šaką nustatai Steamworks → SteamPipe → Builds.
- **Atnaujinimai**: EXE atnaujina Steam; žaidimo turinio OTA bundle'ai (updater.js) veikia kaip ir be Steam.
