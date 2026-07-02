@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): ivykiu zurnalas - X uzdarymo mygtukas (mobile); ataka tempimu - tempk savo padara ant taikinio (drag&drop rodykle + glow), klikas vis dar veikia; apsauga nuo dvigubo atakos klik po tempimo"
git push
git log -1 --oneline
) > commit109.log 2>&1
