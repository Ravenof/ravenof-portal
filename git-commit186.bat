@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/effectEngine.ts git-commit186.bat
git commit -m "fix(engine): apsauga nuo begalines efektu rekursijos (Maximum call stack) - globalus __fxCascade skaitliukas applyMapping, nes killUnit onDeath/deathrattle kvieciami su depth=0 (debuff->mirtis->deathrattle->debuff ciklas apeidavo MAX_DEPTH); kaskada nutraukiama ties 200. Taiso bot kovos crash + kodel rezultatas neissisaugodavo"
git push
) > commit186.log 2>&1
