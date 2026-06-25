@echo off
REM ============================================================
REM  Ravenof - Capacitor Android setup (Windows)
REM  Paleisk si faila is ravenof-portal kataloge.
REM  Reikalavimai: Node.js 20+, Android Studio (naujausia), JDK 21.
REM ============================================================
cd /d "%~dp0"

echo.
echo [1/3] Installing Capacitor dependencies...
call npm install
if errorlevel 1 ( echo NPM INSTALL FAILED & pause & exit /b 1 )

echo.
echo [2/3] Adding Android platform (sukuriamas android\ katalogas)...
call npx cap add android
if errorlevel 1 ( echo CAP ADD FAILED & pause & exit /b 1 )

echo.
echo [3/3] Syncing config...
call npx cap sync android

echo.
echo ============================================================
echo  Pabaigta. Atidaryk projekta Android Studio:
echo      npx cap open android
echo  Tada: Build ^> Generate Signed Bundle / APK ^> Android App Bundle
echo  Pilna instrukcija: CAPACITOR-ANDROID.md
echo ============================================================
pause
