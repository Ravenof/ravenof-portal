@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/admin/GameplayConfigEditor.tsx git-commit168.bat
git commit -m "feat(admin): summon efekto perziura - mygtukas paleidzia pasirinkta efekta per tikra SummonBurst (tamsus fonas + kortos siluetas + dar karta/uzdaryti), kad galima pasirinkti pries issaugant"
git push
) > commit168.log 2>&1
