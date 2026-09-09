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
`steam_appid.txt` su tikru App ID (dev metu – Steam klientas turi būti paleistas), `steam.js` ACH_MAP
(badge slug → Steam API name), overlay `--in-process-gpu` jau įjungtas. Steam depot = `release\win-unpacked`
(`electron-builder --win dir`).
