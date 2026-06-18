@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/soundManager.ts public/sounds/battle git-commit149.bat
git commit -m "feat(audio): ikelti musio garsu mp3 (attack/spell-cast x5, heal x3, curse, death, draw, field, freeze, impact, champion-skill, zmk-flip); soundManager variantai isplesti iki 6"
git push
) > commit149.log 2>&1
