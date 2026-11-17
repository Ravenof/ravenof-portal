@echo off
rem == Ravenof studija: parduotuves ekrano nuotraukos + kovos vaizdo irasai ==
rem Rezultatai: store-media\shots\lt, store-media\shots\en, store-media\video
rem Prisijungimas: pirma karta atsidaro Chrome langas - prisijunk pats (el. pastu arba per Google).
rem Sesija issaugoma store-media\_auth.json; norint prisijungti is naujo - istrink ta faila.
setlocal
cd /d "%~dp0"
echo Atsidarys Chrome langas. Jei rodys prisijungimo ekrana - prisijunk prie zaidimo pats.
call npm i -D @playwright/test --no-save
call npx playwright test --config playwright.studio.config.ts %*
echo.
echo Baigta. Failai: store-media\shots ir store-media\video
