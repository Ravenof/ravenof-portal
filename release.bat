@echo off
rem == Ravenof: naujo kliento bundle'o isleidimas (OTA) ==========================
rem 1. build apps/digital/dist  2. SHA-256 ir pakeistu failu ikelimas i Storage
rem 3. registracija - bundle'as patenka TIK i admin kanala.
rem I tester / stable keliama is /admin/releases, mygtukas Patvirtinti.
rem Pries tai: padidink APP_VERSION faile src/lib/version.ts - bundle'ai nekeiciami.
rem Papildomi argumentai perduodami toliau, pvz.:
rem   release.bat --notes-lt "Pataisyta X" --notes-en "Fixed X"
rem   release.bat --dry     tik parodyti, kas butu ikelta
chcp 65001 >nul
cd /d "%~dp0"
echo CWD: %CD%
node tools\publish-bundle.mjs %*
echo.
pause
