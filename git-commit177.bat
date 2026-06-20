@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx public/card-backs/README.md git-commit177.bat
git commit -m "feat(ui): desktop vertikalus layout (priesas virsuj / tu apacioj), HP vial didesnis (scale) sonuose, auksas virs +100 mygtuko, kalade+ZMK greta; kortu nugareliu miniaturos (file-first: plain/curse/zmk) deck/hand/ZMK/reakcijoms desk+mobile; kapinynas rodo paskutines kortos miniatura"
git push
) > commit177.log 2>&1
