@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "fix(game): mobile ranka perdaryta - issskleista ranka = fixed apatinis overlay su scroll-snap karusele (pilnai matomos didelos skaitomos kortos, be persidengimo/nukirpimo), braukimas sonu=narsymas, tempimas AUKSTYN=zaidi; lengviau (be framer per korta) -> nelagina"
git push
git log -1 --oneline
) > commit104.log 2>&1
