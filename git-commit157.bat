@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit157.bat
git commit -m "feat(gameplay-feel): Faze 4 - tikras HP delayed-reveal (hpHold override: HP rodmuo lieka senas kol smugis atskrieja, TADA krenta su punch animacija); engine fromZone laukas -> graveyard revive gauna graveRise efekta (vietoj portalo); AI puses kortos traukimo srautas (deck-ai/hand-ai)"
git push
) > commit157.log 2>&1
