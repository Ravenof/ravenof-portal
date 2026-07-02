@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
(
git add src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/admin/CardForm.tsx src/components/admin/GameplayConfigEditor.tsx sql/curse_onCurseDrawn_migration.sql git-commit257.bat
git commit -m "fix(curses): atskirti prakeiksmo ijmaisymą (triggerCurse) nuo aktyvacijos istraukus (onCurseDrawn). Naujas trigeris onCurseDrawn (TriggerType + TRIGGER_TYPES). drawCards: curse korta aktyvuoja TIK onCurseDrawn mappingus (grieztai); turi mappingu bet nei vieno onCurseDrawn -> blocked log; visai be mappingu -> tekstinio efekto fallback. Admin: curse kortoms naujo mappingo default trigeris = onCurseDrawn (isCurse prop is CardForm). DB migracija sql/curse_onCurseDrawn_migration.sql perjungia esamu Prakeiksmas kortu mappingu trigeri i onCurseDrawn (idempotentiska, su perziuros SELECT). tsc svarus."
git push
) > commit257.log 2>&1
