@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): ejimo laikmatis 120s (vietoj 60); paskutines 20s - didelis raudonas laikrodis ekrano viduryje-virsuje; pasikeitus ejimui - per centra parodomas aktyvaus zaidejo nickas + 'eile'"
git push
git log -1 --oneline
) > commit106.log 2>&1
