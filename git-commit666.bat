@echo off
cd /d "%~dp0"
git add src/components/tutorial/StatGem.tsx git-commit666.bat
git status --short | findstr /R "^[AM]"
git commit -m "StatGem: fix absolute positioning (ATK/HP gems at card bottom)"
git push
pause
