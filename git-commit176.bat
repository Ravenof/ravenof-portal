@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit176.bat
git commit -m "feat(ui): desktop musio layout - sonines kolonos (priesininkas kaire / tu desine: HP, auksas, deck, kapinynas, ZMK), didesnes kortos (units 90->118, hand 96->128, field 48->68), ranka be expand su maziau persidengimo, hover detali korta padidinta iki 280px; mobile nepaliestas (gating per isTouch)"
git push
) > commit176.log 2>&1
