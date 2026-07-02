@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): suzaidus burta - kortos pop-up 1s (tavo/prieso); prakeiksmas - pop-up su 'IMAISOMAS' imaisant i kalade ir 'AKTYVUOJAMAS' istraukus aukai; veikia desktop+mobile (centrinis overlay)"
git push
git log -1 --oneline
) > commit111.log 2>&1
