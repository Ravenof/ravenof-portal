@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit307.bat
git commit -m "feat(hand): 10 kortu telpa i ekrana + ranka-pilna sprogimas. Mobile ranka: dinaminis overlap (step pagal ekrano placio) - iki 10 kortu telpa, kortos siek tiek persidengia vietoj kropinimo uz krasto. Ranka pilna (10) ir traukia daugiau: handBurn FX - istraukta korta ~1s rodoma centre ('Ranka pilna!'), tada sprogsta i gabalus ir nuskrenda i kapinyna (flyingShatters + garsai). Prieso burn - tik garsas (neatskleidziam kortos). tsc svarus."
git push
) > commit307.log 2>&1
