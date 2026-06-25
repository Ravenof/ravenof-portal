@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit249.bat
git commit -m "feat(battle): naujas statusas Palaiminimas (blessed) - suteikia advantage unit'o sekanciai atakai, panaudojamas po jos. Engine: TutStatus+STATUS_META+rollContext.blessedSides+ctxBias(+1); parseEffect atpazista 'palaiminimas'. UI STATUS_GLOW spalva (auksine). Ikona kol kas emoji - bus pakeista i zetono PNG kai bus ikelti failai."
git push
) > commit249.log 2>&1
