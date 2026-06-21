@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/ui-sound.ts src/lib/game/soundManager.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleFxLayer.tsx git-commit202.bat
git commit -m "fix(sfx): impact garsas - sintezuotas thud (zemas tonas + triuksmas) vietoj error pyptelejimo (playImpact ui-sound + soundManager fallback); itraukti atakos lunge+impact failai"
git push
) > commit202.log 2>&1
