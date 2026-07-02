@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/PracticeButton.tsx src/components/digital/DigitalHub.tsx src/app/digital/page.tsx
git commit -m "feat(digital): pagrindinio meniu vibe - judancios liepsnos fone, dideli israizyti blokai (astrus kampai + ornamentai). Blokai: Mokymasis, Kova pries AI, Kampanija (netrukus), PvP Rangin, PvP Laisva, Mano kortos, Parduotuve (netrukus). PracticeButton controlled rezimas (visa plytele triggerina)"
git push
git log -1 --oneline
) > commit123.log 2>&1
