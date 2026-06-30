@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/avatarAudio.ts src/components/tutorial/TutorialGame.tsx git-commit309.bat
git commit -m "feat(avatars): tapinus avatara groja 'selected' balsas. 'selected' nebe once-per-battle, o rate-limited (450ms) - groja kas tapa. hpBar avataras visada tapinamas (pasalintas disabled): tapinus savo ar prieso avatara lokaliai groja jo 'selected' garsas; jei priesas yra galiojantis taikinys - dar ir pasirenkamas. Garsas lokalus (HTMLAudio tapinancio kliente) - priesui kitam kliente NEGROJA (be broadcast). tsc svarus."
git push
) > commit309.log 2>&1
