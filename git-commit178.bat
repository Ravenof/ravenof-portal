@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add public/card-backs/back.webp public/card-backs/curse.webp public/card-backs/zmk.webp src/components/tutorial/TutorialGame.tsx git-commit178.bat
git commit -m "feat(ui): desktop - vienodi kortu dydziai (units/hand/field/decks ~104), dvi priespriesos kuriniu linijos centre, artefaktai+reakcijos uz ju, pile'ai card-sized kampuose, HP sonuose; ikeltos+suspaustos kortu nugareles (back/curse/zmk ~80KB)"
git push
) > commit178.log 2>&1
