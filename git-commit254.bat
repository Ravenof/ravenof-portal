@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/components/digital/Flames.tsx git-commit254.bat
git commit -m "fix(perf): pasalintas will-change nuo Flames (regresija is commit252). will-change + filter:blur + mix-blend-mode vertte GPU kiekvienam liepsnos elementui daryti atskira sluoksni + offscreen readback kas kadra -> labai stipriai stabdo vidutinio klaso telefonus (A54) ir naviguojant/kraunant. Likes tik reduced blur/elementai + paslepimas kovoje (lengvesni nei originalas)."
git push
) > commit254.log 2>&1
