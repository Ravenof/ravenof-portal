@echo off
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
git add src/components/tutorial/TutorialGame.tsx
git commit -m "feat(game): mobile ranka - tikra korta veduokle (arc fan) su didelemis skaitomomis kortomis (pavadinimas+efekto tekstas ant kortos), palaikius/hover korta issididdina pilnam skaitymui, zaidziama tempimu; isskleidus palietimas = skaitymas"
git push
git log -1 --oneline
) > commit102.log 2>&1
