@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
( git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/GameplayConfigEditor.tsx & git commit -m "feat(aura): platesnes testines auros - global silence, raktazodziu suteikimas (taunt/shield/stealth/sprint), negali atakuoti, kainos sumazinimas; visa per recomputeAuras; admine isplestas aura editorius. (pasikartojantys efektai pvz card draw daromi per onTurnStart trigger)" & git push ) > commit89.log 2>&1
