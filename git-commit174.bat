@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial/BattleFxLayer.tsx git-commit174.bat
git commit -m "feat(hp): realistiskas stiklinis potion HP vial - clip-path forma, sluoksniuoti stiklo blikai/sesieliai, svytejimas, animuotas skystis (banguojantis pavirsius + burbuliukai), HP kaip metaline etikete ant butelio (ne sirdis); pasalintas pestinis SVG"
git push
) > commit174.log 2>&1
