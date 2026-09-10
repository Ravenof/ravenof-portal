@echo off
cd /d "%~dp0"
git add apps/desktop/main.js src/components/tutorial/TutorialGame.tsx src/components/tutorial/desktop-battle.css src/styles/cursors.css apps/digital/src/main.tsx public/ravenof-ui/cursors git-commit669.bat
git status --short | findstr /R "^[AM]"
git commit -m "Desktop drag: DOM-driven ghost, any-direction start, no mouse inertia; custom Ravenof cursors (11 states, 1x+2x)"
git push
pause
