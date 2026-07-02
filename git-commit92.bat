@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx & git commit -m "feat(triggers): onAnySummon iskvietimo saltinio filtras - 'tik is kapinyno/kalades/rankos/iprastai'; afterSummon seka origin (graveyard/deck/hand/play); admine dropdown rodomas tik prie onAnySummon. Kartu su triggerSide (savo/prieso) leidzia pvz 'kai prieso padaras prikeliamas is kapinyno'" & git push ) > commit92.log 2>&1
