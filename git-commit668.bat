@echo off
cd /d "%~dp0"
git add src/lib/game/matchStats.ts git-commit668.bat
git status --short | findstr /R "^[AM]"
git commit -m "Match stats: count castSpell log entries (fixes Burtininkas daily quest progress)"
git push
pause
