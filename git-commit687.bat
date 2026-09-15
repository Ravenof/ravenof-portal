@echo off
cd /d "%~dp0"
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleFxLayer.tsx git-commit687.bat
git commit -m "Battle FX: reaction card flies face-down from hand to reaction slot (arc, flip, landing ring/dust); attack charge – attacker vibrates + glows + sparks while dragging a target"
git push
pause
