@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20260919_shop_currency_rules.sql src/components/digital/progression/SeasonPathScreen.tsx src/lib/version.ts build-apk-local.bat package-lock.json apps/digital/baselines git-commit694.bat
git commit -m "694: valiutu taisykle - rubinai tik kosmetikai ir season pass, boosteriai/starteriai/kortos tik uz sidabra; season pass tik uz rubinus; APK build su Android Studio JBR; baseline failai"
git push
git log -1 --oneline
) > commit694.log 2>&1
