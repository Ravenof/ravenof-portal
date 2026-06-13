@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/components/tutorial/TutorialGame.tsx public/rules/zmk/card-plus0-sm.webp public/rules/zmk/card-plus1-sm.webp public/rules/zmk/card-plus2-sm.webp public/rules/zmk/card-minus1-sm.webp public/rules/zmk/card-minus2-sm.webp public/rules/zmk/card-x2-sm.webp public/rules/zmk/card-x0-sm.webp git-commit62.bat
git commit -m "perf(game): ZMK kortu nuotraukos zaidime - mazos optimizuotos webp versijos (~30KB vietoj ~2.5MB), kad uzsikrautu ir ant mobile"
git push
) > commit62.log 2>&1
