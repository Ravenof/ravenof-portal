@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit286.bat
git commit -m "feat(fx): korta grazinama i ranka dabar animuojama (anksciau tiesiog dingdavo). Engine: returnUnitToHand log'as atskiras tipas 'returnHand' su src (kortos uid) + draw garsas, vietoj bendro 'play'. TutorialGame: naujas flyingReturns sluoksnis + FX case 'returnHand' - korta letai pakyla nuo lauko (pirmi 45%% animacijos, scale 1->1.1 kyla aukstyn), tada greit nuskrenda i ranka (easeIn pagreitis, fade + scale 0.5) + drawStream daleliu srautas (violetinis). Pozicija imama is unitRectsRef (kaip death FX). Veikia abiem pusem; po swapPerspective PvP guest'ui src.side apsiverciia korektiskai. tsc svarus."
git push
) > commit286.log 2>&1
