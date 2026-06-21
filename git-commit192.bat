@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx git-commit192.bat
git commit -m "feat(fx): AoE efektai - pilno lauko sviesa+dumai+daleles pagal elementa (fire/lightning/ice/poison/arcane/holy), be linijuir ikonu; aoeWave perdarytas i particle sistema (additive glow, light wash, smoke clouds); variant laukas BattleFxLayer + perduodamas is TutorialGame pagal pasirinkta projectile elementa"
git push
) > commit192.log 2>&1
