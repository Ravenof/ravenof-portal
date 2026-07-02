@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/lib/game/effectEngine.ts
git commit -m "fix(game): be-taikinio efektai (drawCards, mill, gainGold, summon, tutor ir kt.) suzaidziami iskart - nereikia rinktis taikinio net jei requiresSelection paliktas true"
git push
git log -1 --oneline
) > commit112.log 2>&1
