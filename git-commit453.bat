@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add src/lib/version.ts
git add src/components/digital/SettingsModal.tsx
git add git-commit453.bat
git commit -m "chore(version): APP_VERSION zyme Nustatymuose (Ravenof v453 desines apacioj) - deploy/keso diagnostikai telefone. KARTU: retrigger Vercel deploy - commit 452 (1846e6b, builder v5.2 sarasas+Redaguoti) buvo supushintas i GitHub, bet Vercel webhook jo nepagavo (deployments saraše nera) - sis push subuilding abu." > commit453.log 2>&1
git push >> commit453.log 2>&1
type commit453.log
echo ============= BAIGTA (v453 + deploy retrigger). =============
pause
