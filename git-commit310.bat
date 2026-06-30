@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/app/admin/shop/AdminShopClient.tsx git-commit310.bat
git commit -m "fix(avatars): kadravimas kaip cinematics (objectPosition + zoom) + video perziura admine. Fit dabar object-cover + objectPosition X/Y (pan, kaip legendary summon kadravimas) + scale(zoom) is centro (sukuria overflow abiem asim, kad pan veiktu net kvadratiniam langui). AdminAvatarFit naudoja TA PACIA fit logika kaip zaidimas (sutampa) + prideta video perziura: galima perjungti Nuotrauka / Video N ir matyti kadravima ant video. tsc svarus."
git push
) > commit310.log 2>&1
