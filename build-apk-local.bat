@echo off
rem ── Local-first Android APK (viskas irenginyje) ─────────────────────────────
rem 1) Vite bundle (apps/digital/dist)  2) media is Storage (apps/digital/media)
rem 3) Capacitor sync su RAVENOF_NATIVE=local  4) gradle assembleDebug
rem Senas (remote) build'as NEPAKINTA: be RAVENOF_NATIVE cap sync naudoja mobile-shell.
rem Gradle/Java nepakelia kelio su lietuviskomis raidemis (kortu) -> android aplankas
rem pasiekiamas per virtualu diska V: (subst), kuriame kelias yra ASCII.
chcp 65001 >nul
cd /d "%~dp0"
set RAVENOF_NATIVE=local
subst V: /d >nul 2>&1
subst V: "%CD%"
(
  echo CWD: %CD%
  call npm run app:build
  node tools\build-media.mjs
  call npx cap sync android
  cd /d V:\android
  call gradlew.bat assembleDebug
  if errorlevel 1 echo GRADLE FAILED
  cd /d "%~dp0"
  echo APK: android\app\build\outputs\apk\debug\app-debug.apk
) > build-apk-local.log 2>&1
subst V: /d >nul 2>&1
type build-apk-local.log | findstr /i "error apk built failed successful"
