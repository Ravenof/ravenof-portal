@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/game/types.ts
git add src/lib/game/effectEngine.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add git-commit367.bat
echo === Commit ===
git commit -m "feat(effects): kortu traukimas gali taikyti tau / priesui / abiem. Pridetas EffectMapping.drawAppliesTo ('caster'|'opponent'|'both', numatyta caster). effectEngine drawCards + drawUntilHand cikluoja per pasirinktas puses (foe/caster/both). Admin GameplayConfigEditor: 'Kas traukia' pasirinkimas drawCards ir drawUntilHand blokuose. Atgal suderinama (undefined=caster kaip anksciau). tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
