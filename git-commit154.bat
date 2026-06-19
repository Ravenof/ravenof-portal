@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/effectAnimations.ts src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx git-commit154.bat
git commit -m "feat(gameplay-feel): Faze 1 - fizinis kortos drop (dunk/bounce/squash + impact garsas + board shake); centrinis effectAnimationMap + frakciju paletes; BattleFxLayer (canvas FX: projektilas/kirtis/spindulys/heal-stream/buff/debuff/aoe banga/curse mark/irimas/skydas/saltis); efektai prasideda nuo source kortos -> taikinys; Battlecry pacing (korta nuseda 800ms -> efektas); plaukiantys skaiciai -2/+2 + taikinio shake/flash; destroy = slash + irimas"
git push
) > commit154.log 2>&1
