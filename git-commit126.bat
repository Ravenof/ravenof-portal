@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/app/my-cards/MyCardsClient.tsx src/app/my-cards/page.tsx
git commit -m "feat(digital): ekonomika FAZE 3 - Virtualios kortos albumas. Kortu binder'is su retumo remais + kiekio zenklais (main-menu vibe: liepsnos + israizyti blokai), statistikos sonas (retumai/frakcijos/tipai), deck builder CTA. Antraste 'Mano Kortos' -> 'Virtualios kortos'"
git push
git log -1 --oneline
) > commit126.log 2>&1
