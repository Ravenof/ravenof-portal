@echo off
chcp 65001 >nul
REM ============================================================
REM  Ravenof Android shell - ASCII kelyje (apeina non-ASCII Gradle klaida)
REM  Pastato atskira Capacitor remote-URL projekta C:\RavenofApp
REM  Zaidimas krausis is gyvos svetaines - Next.js kodo cia nereikia.
REM ============================================================
set "DEST=C:\RavenofApp"

echo.
echo [1/5] Kuriamas ASCII katalogas: %DEST%
if not exist "%DEST%" mkdir "%DEST%"

echo [2/5] Kopijuojami shell failai...
xcopy /Y /E /I "%~dp0android-shell-template\*" "%DEST%\" >nul
if errorlevel 1 ( echo COPY FAILED & pause & exit /b 1 )

cd /d "%DEST%"

echo [3/5] Installing Capacitor (npm install)...
call npm install
if errorlevel 1 ( echo NPM INSTALL FAILED & pause & exit /b 1 )

echo [4/5] Adding Android platform...
call npx cap add android
if errorlevel 1 ( echo CAP ADD FAILED & pause & exit /b 1 )
call npx cap sync android

echo [5/5] Atidaromas Android Studio...
call npx cap open android

echo.
echo ============================================================
echo  Projektas: %DEST%\android  (ASCII kelias - Gradle veiks)
echo  Sito karto Android Studio atidaryk projekta is: %DEST%\android
echo ============================================================
pause
