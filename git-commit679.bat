@echo off
cd /d "%~dp0"
git add src/lib/game/targetResolver.ts git-commit679.bat
git commit -m "Fix: auto-pick targets prefer enemy side for harm / own side for help (AI no longer hits its own units with anyUnit / chooseAlt spells like Elementu kamuoliai)"
git push
pause
