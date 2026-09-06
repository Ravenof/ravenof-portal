# Ravenof desktop (Steam) shell

```
cd apps/desktop
npm install                      # electron + electron-builder (+ steamworks.js, jei pavyksta)
npm run build:app                # apps/digital/dist + media
npm start                        # paleidžia app://ravenof/digital
npm run dist:win                 # release/win-unpacked (Steam depot turinys)
```

Steam: `steam_appid.txt` su tikru App ID (dev metu – Steam klientas turi būti paleistas).
Achievement'ų žemėlapis – `steam.js` ACH_MAP (badge slug → Steam API name).
Overlay: `--in-process-gpu` jau įjungtas main.js.
Cloud saves: Steamworks → Auto-Cloud → `%APPDATA%/ravenof-desktop/` (IndexedDB + Local Storage).
