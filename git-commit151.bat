@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/BattleEffectOverlay.tsx git-commit151.bat
git commit -m "feat(fx): HQ summon efektai - canvas daleliu sistema (ziezirbos/sporos/skeveldros/pelenai, capped, vienas rAF), SVG turbulence+displacement tekstura dumams/ugniai, bloom/glow, vignete, light rays (eclipse), kinematografinis color-grade"
git push
) > commit151.log 2>&1
