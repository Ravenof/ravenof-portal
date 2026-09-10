@echo off
cd /d "%~dp0"
git add public/arenas git-commit670.bat
git status --short | findstr /R "^[AM]"
git commit -m "Arena backgrounds: landscape pack (8 arenas)"
git push
pause
