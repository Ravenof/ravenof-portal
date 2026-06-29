@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx git-commit294.bat
git commit -m "feat(ui/fx): suskleistas log + ZMK miniaturos prie taikinio + destroyed explosion (7,9,10/11). (7) Nuolatinis suskleistas spalvotas log desineje: kortu/ZMK miniaturos eiles tvarka, zalia=tu raudona=priesas, hover(desktop)/long-press(mobile) -> detalus kortos vaizdas; klik -> inspect, ZMK -> pilnas log. (9) ZMK auto-traukimo kortos dabar mazos miniaturos PRIE TAIKINIO (vietoj dideliu centre) - svariau; pozicija = damage target rect. (10) Sunaikinta korta: 3x3 kortos gabalai issilaksto i salis -> susiburia -> nuskrenda i kapinyna (flyingShatters), vietoj vien disintegrate daleliu. tsc svarus."
git push
) > commit294.log 2>&1
