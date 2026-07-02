@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "fix(game): mobile ranka - nebe see-through kruva: kortos persidengia tik kampais (18%), netelpa -> scrollinama i sonus (pan-x); tempimas i sonus=scroll, AUKSTYN=zaidi (ranka susitraukia); ilgas paspaudimas=inspect"
git push
git log -1 --oneline
) > commit103.log 2>&1
