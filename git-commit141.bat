@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist "git-commit57.bat" del /f /q "git-commit57.bat"
(
git add src/lib/digital/rarity.ts src/components/digital/PackOpen.tsx src/components/digital/DigitalAlbum.tsx src/components/tutorial/PracticeButton.tsx src/components/digital/PvPLobby.tsx git-commit141.bat
git commit -m "style(digital): PvE/PvP pop-up modalai raizyto main-menu stiliaus (oct kampai, ornamentai); kanonines retumo spalvos + glow per 5 lygius"
git push
) > commit141.log 2>&1
