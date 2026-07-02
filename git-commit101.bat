@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): Hearthstone tipo mobile ranka - paspaudus korta ranka issipleciia (visos kortos matosi), kortos zaidziamos drag&drop ant lentos, taikiniui - tempimo rodykle+taikinukas, laikant svyti galimi slotai, spells i bet kuri slot; didesnes mobile kortos"
git push
git log -1 --oneline
) > commit101.log 2>&1
