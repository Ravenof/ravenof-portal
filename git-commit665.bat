@echo off
cd /d "%~dp0"
git add -A
git commit -m "Desktop installer (NSIS), OAuth Google/Facebook (web + Electron deep link + Capacitor), localStorage auth session for app bundle, StatGem ATK/HP badges, hover preview card-only on desktop"
git push
pause
