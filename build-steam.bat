@echo off
setlocal
cd /d "%~dp0"
rem ── Ravenof → Steam (SteamPipe) ───────────────────────────────────────────────
rem Naudojimas:  build-steam.bat            (surinkti ir ikelti i Steam)
rem              build-steam.bat --no-upload (tik surinkti apps\desktop\release\win-unpacked)
rem Reikia: STEAM_APP_ID, STEAM_DEPOT_ID, STEAM_BUILD_USER faile .env.steam.local
rem         ir SteamCMD (steamcmd.exe) PATH'e arba STEAMCMD kintamajame.
rem Pirmas ikelimas: SteamCMD paprasys slaptazodzio ir Steam Guard kodo – ivesk pats.
rem Build'as ikeliamas NE live: Steamworks -> SteamPipe -> Builds pasirinksi saka pats.

if exist ".env.steam.local" for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env.steam.local") do set "%%a=%%b"
if "%STEAM_APP_ID%"=="" set STEAM_APP_ID=480
if "%STEAMCMD%"=="" set STEAMCMD=steamcmd

for /f "tokens=2 delims='" %%v in ('findstr /c:"APP_VERSION =" src\lib\version.ts') do set APPVER=%%v
echo [steam] App ID %STEAM_APP_ID%, versija %APPVER%

cd apps\desktop
call npm run build:app || goto :fail
call npx electron-builder --win dir || goto :fail
cd /d "%~dp0"

if "%1"=="--no-upload" ( echo [steam] Surinkta: apps\desktop\release\win-unpacked & goto :end )
if "%STEAM_APP_ID%"=="480" ( echo [steam] 480 = testinis App ID, i Steam nekeliama. Irasyk tikra STEAM_APP_ID i .env.steam.local & goto :end )
if "%STEAM_DEPOT_ID%"=="" ( echo [steam] Truksta STEAM_DEPOT_ID .env.steam.local faile & goto :fail )
if "%STEAM_BUILD_USER%"=="" ( echo [steam] Truksta STEAM_BUILD_USER .env.steam.local faile & goto :fail )

powershell -NoProfile -Command "(Get-Content 'apps\desktop\steam\app_build.vdf') -replace '__APPID__','%STEAM_APP_ID%' -replace '__DEPOTID__','%STEAM_DEPOT_ID%' -replace '__DESC__','Ravenof %APPVER%' | Set-Content 'apps\desktop\steam\app_build.gen.vdf'" || goto :fail
"%STEAMCMD%" +login %STEAM_BUILD_USER% +run_app_build "%~dp0apps\desktop\steam\app_build.gen.vdf" +quit || goto :fail
echo [steam] Ikelta. Steamworks -> SteamPipe -> Builds: nustatyk saka (pvz. beta arba default).
goto :end

:fail
echo [steam] KLAIDA
exit /b 1
:end
endlocal
