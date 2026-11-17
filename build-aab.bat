@echo off
rem == Google Play AAB (local-first, pasirasytas) ==================================
rem 1) Vite bundle + media  2) cap sync (RAVENOF_NATIVE=local)
rem 3) didieji aplankai (media, cards, sounds, rules) perkeliami i install-time asset pack'a,
rem    nes Google Play bazini moduli riboja 200 MB
rem 4) gradle bundleRelease  5) aplankai grazinami atgal (kad APK build'as liktu kaip buves)
rem Reikia: android\keystore.properties + rakto failo (zr. GOOGLE-PLAY-AAB.md).
chcp 65001 >nul
cd /d "%~dp0"
set RAVENOF_NATIVE=local
if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
if not exist android\keystore.properties (
  echo TRUKSTA android\keystore.properties - AAB butu nepasirasytas. Zr. GOOGLE-PLAY-AAB.md
  exit /b 1
)
subst V: /d >nul 2>&1
subst V: "%CD%"
set "PUB=V:\android\app\src\main\assets\public"
set "PACK=V:\android\media_pack\src\main\assets\public"
(
  echo CWD: %CD%
  echo JAVA_HOME: %JAVA_HOME%
  if not exist node_modules\@capgo\capacitor-updater call npm install --no-audit --no-fund
  node tools\build-media.mjs
  call npm run app:build
  call npx cap sync android
  node tools\publish-bundle.mjs --skip-build --mark-baseline android
  if exist "V:\android\media_pack\src" rmdir /s /q "V:\android\media_pack\src"
  mkdir "%PACK%"
  for %%D in (media cards sounds rules) do if exist "%PUB%\%%D" move "%PUB%\%%D" "%PACK%\%%D"
  cd /d V:\android
  call gradlew.bat bundleRelease
  if errorlevel 1 echo GRADLE FAILED
  cd /d "%~dp0"
  for %%D in (media cards sounds rules) do if exist "%PACK%\%%D" move "%PACK%\%%D" "%PUB%\%%D"
  echo AAB: android\app\build\outputs\bundle\release\app-release.aab
) > build-aab.log 2>&1
subst V: /d >nul 2>&1
type build-aab.log | findstr /i "error aab built failed successful"
if exist android\app\build\outputs\bundle\release\app-release.aab dir android\app\build\outputs\bundle\release\app-release.aab | findstr /i "aab"
