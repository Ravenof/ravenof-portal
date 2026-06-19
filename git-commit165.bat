@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git rm -f --ignore-unmatch src/components/tutorial/BattleEffectOverlay.tsx
git add git-commit165.bat
git commit -m "chore(fx): pasalintas negyvas senas full-screen BattleEffectOverlay.tsx (summon efektus pilnai pakeite origin-based SummonBurst, failas niekur nebenaudojamas)"
git push
) > commit165.log 2>&1
