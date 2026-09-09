@echo off
cd /d "%~dp0"
git add src/components/tutorial/StatGem.tsx src/components/tutorial/TutorialGame.tsx git-commit666.bat
git status --short | findstr /R "^[AM]"
git commit -m "StatGem: fix positioning, align ATK/HP gems on board, remove HP ghost bar"
git push
pause
