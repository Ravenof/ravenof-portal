@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/digital/native.ts src/app/digital/layout.tsx src/app/digital/album/page.tsx src/app/digital/collection/page.tsx src/app/digital/more/page.tsx src/components/digital/DigitalHub.tsx src/components/digital/DigitalCollection.tsx src/components/digital/MoreScreen.tsx src/components/digital/StoreModal.tsx git-commit240.bat
git commit -m "feat(digital): mobile app shell perdarymas (Faze 1). Header su safe-area-inset-top + RAVENOF/DIGITAL logo + gold/paku skaitliukai. Apatinis nav: Zaisti/Kolekcija/Kalades/Parduotuve/Daugiau (be Iseiti). Home hub: hero ZAISTI + 3 rezimai + 2x2 grid + mazesnes korteles (Kampanija NETRUKUS). Nauja Kolekcija /digital/collection: 2-kortu grid, Tik turimos toggle, grayscale/locked neturimoms, preview modal. Nauja Daugiau /digital/more: atskirti Atsijungti (logout) ir Iseiti (exitNativeApp + fallback, jokio portal redirect). native.ts: Capacitor exit + wallet/store event bus."
git push
) > commit240.log 2>&1
