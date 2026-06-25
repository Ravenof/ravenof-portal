@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add public/icons/status scripts/recolor-tokens.py src/components/tutorial/TutorialGame.tsx src/lib/tutorial/engine.ts git-commit249.bat git-commit250.bat
git commit -m "feat(battle): statusu/keyword zetonu ikonos (vietoj emoji). 10 PNG -> duotone perspalvinta pagal statusa + apskritimas + 96px WebP (public/icons/status). Token komponentas rodo .webp (degantis/nuodai/sushaldytas/apsvaigintas/nutildytas/palaimintas/magiskas skydas/pasisaipymas/sprintas/selinimas). scripts/recolor-tokens.py pakartojimui. + blessed statuso engine (is commit249)."
git push
) > commit250.log 2>&1
