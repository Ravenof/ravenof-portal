@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/tutorial/TutorialGame.tsx src/app/admin/shop/AdminShopClient.tsx git-commit308.bat
git commit -m "fix(avatars): patikima fit logika (img+video) + seamless video. Fit dabar plotis/aukstis=zoom%% + focal-point translate (vietoj objectPosition kuris zoom=100 nepanino) - zoom/move matomai veikia ir nuotraukai, IR video; admin perziura sutampa su zaidimu. Seamless video: portretas visada matosi apacioj, video atsiranda virs jo tik kai TIKRAI pradeda groti (onPlaying -> crossfade opacity), muted per ref, preload auto, disablePictureInPicture, onError->revert - nebera play ikonos / juodo blyksnio. tsc svarus."
git push
) > commit308.log 2>&1
