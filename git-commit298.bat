@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit298.bat
git commit -m "fix(desktop): ranka -> vEduokle, rail pile'u ir lentos apkarpymo fix. (1) Ranka dabar tikra vEduokle: persidengiancios kortos (marginLeft -34%%), rotacija pagal indeksa (+arc dip), transformOrigin bottom; hover pakelia tiesiai + scale 1.14; drop shadow. (2) Rail pile'ai (Kalade/ZMK/Kapinynas) nebeapkarpyti: renderPile gavo w param, rail'uose piles w=66 vietoj big(96), rail'ai platesni (236/250), maziau padding/gap. (3) Lentos apatines reakcijos nebeapkarpytos: turinys buvo ~19px aukstesnis nei talpa -> kuriniai 92, laukas h50, gap3, padding maziau. tsc svarus."
git push
) > commit298.log 2>&1
