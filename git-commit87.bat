@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx & git commit -m "feat(triggers): globalus onAnySummon/onAnyPlay trigeriai + triggerSide/triggerSubtype filtrai - efektai gali suveikti nuo kitu kortu iskvietimo/suzaidimo/zuties/atakos; admine kontekstiniai varneles (kieno ivykis, koks potipis) rodomi tik pasirinkus globalu trigeri" & git push ) > commit87.log 2>&1
