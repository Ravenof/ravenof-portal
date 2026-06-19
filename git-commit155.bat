@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/effectAnimations.ts src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx git-commit155.bat
git commit -m "feat(gameplay-feel): Faze 2 - frakciju parasai (riteriai/vagys/vejas=kirtis, inkvizicija=spindulys, kiti=projektilas) + spalvos; status FX (frozen/stunned=ledas, burning=ugnis, poisoned=nuodai, silenced=drain) ant kortos su shake; nauji burn/poison canvas efektai; field aktyvacijos banga; aukso praradimo/vagystes skaicius"
git push
) > commit155.log 2>&1
