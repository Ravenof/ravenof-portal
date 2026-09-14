@echo off
cd /d "%~dp0"
git add src/lib/game/curseDemonFx.ts src/lib/game/effectAnimations.ts src/components/tutorial/BattleFxLayer.tsx src/components/tutorial/TutorialGame.tsx git-commit677.bat
git commit -m "Curse demon FX: black smoke + laughing fire face on the affected target (unit/AoE/hand/deck/graveyard/avatar) when a curse activates"
git push
pause
